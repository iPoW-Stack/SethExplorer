defmodule BlockScoutWeb.API.V2.SethController do
  use BlockScoutWeb, :controller

  import Ecto.Query, only: [from: 2]

  alias EthereumJSONRPC.Seth.Client
  alias Explorer.Chain

  @required_seth_shards [
    %{name: "root", network: 1, shard_index: 0},
    %{name: "shard3", network: 3, shard_index: 1}
  ]
  @pool_offsets_cache_key {__MODULE__, :pool_offsets}
  @default_pool_offsets_refresh_interval_ms 60_000

  def live_head(conn, _params) do
    generated_at = DateTime.utc_now()
    indexer_head = fetch_indexer_head()
    {shards, rpc_head, rpc_source_state} = fetch_rpc_shards()

    use_rpc_head? = is_integer(rpc_head.height)

    prefer_rpc? =
      use_rpc_head? and
        (not is_integer(indexer_head.height) or rpc_head.height >= indexer_head.height)

    global_head =
      cond do
        prefer_rpc? ->
          rpc_head

        is_integer(indexer_head.height) ->
          Map.put(indexer_head, :source, "indexer")

        true ->
          rpc_head
      end

    source_state =
      cond do
        prefer_rpc? ->
          rpc_source_state

        use_rpc_head? and is_integer(indexer_head.height) ->
          "degraded"

        is_integer(indexer_head.height) ->
          "degraded"

        true ->
          "down"
      end

    json(conn, %{
      "generated_at" => DateTime.to_iso8601(generated_at),
      "source_state" => source_state,
      "global_head" => head_payload(global_head),
      "indexer_head" => head_payload(indexer_head),
      "lag" => lag_payload(global_head, indexer_head),
      "shards" => shards
    })
  end

  defp fetch_indexer_head do
    repo = Chain.select_repo(api?: true)

    latest_height =
      from(b in Explorer.Chain.Block, where: b.consensus == true, select: max(b.number))
      |> repo.one()

    latest_timestamp =
      case latest_height do
        height when is_integer(height) ->
          from(b in Explorer.Chain.Block,
            where: b.consensus == true and b.number == ^height,
            select: max(b.timestamp)
          )
          |> repo.one()

        _ ->
          nil
      end

    %{
      height: latest_height,
      timestamp: latest_timestamp,
      source: "indexer"
    }
  end

  defp fetch_rpc_shards do
    pool_count = seth_pool_count()

    shards =
      seth_shards()
      |> Enum.map(fn shard -> fetch_rpc_shard(shard, pool_count) end)

    latest_height =
      shards
      |> Enum.map(& &1["latest_height"])
      |> Enum.reject(&is_nil/1)
      |> Enum.max(fn -> nil end)

    latest_timestamp =
      shards
      |> Enum.map(&parse_iso8601(&1["latest_block_timestamp"]))
      |> Enum.reject(&is_nil/1)
      |> Enum.max_by(&DateTime.to_unix(&1, :millisecond), fn -> nil end)

    rpc_source_state =
      cond do
        Enum.any?(shards, &(&1["source_state"] == "ok")) ->
          if Enum.any?(shards, &(&1["source_state"] == "degraded")), do: "degraded", else: "ok"

        Enum.any?(shards, &(&1["source_state"] == "degraded")) ->
          "degraded"

        true ->
          "down"
      end

    {
      shards,
      %{height: latest_height, timestamp: latest_timestamp, source: "rpc"},
      rpc_source_state
    }
  end

  defp fetch_rpc_shard(shard, pool_count) do
    request_opts =
      case live_head_rpc_url() do
        nil -> []
        url -> [base_url: url]
      end

    case Client.get_latest_pool_info(shard.network, request_opts) do
      {:ok, payload} when is_map(payload) ->
        pools = payload |> Map.get("pools", []) |> Enum.take(pool_count)

        heights =
          pools
          |> Enum.with_index()
          |> Enum.map(fn {pool, local_pool_index} ->
            case parse_pool_height(pool) do
              local_height when is_integer(local_height) and local_height >= 0 ->
                local_height + pool_offset_for(shard.shard_index, local_pool_index)

              _ ->
                nil
            end
          end)
          |> Enum.reject(&is_nil/1)

        indexed_heights = Enum.filter(heights, &(&1 > 0))
        latest_height = Enum.max(indexed_heights, fn -> nil end)

        latest_timestamp =
          pools
          |> Enum.map(&parse_pool_timestamp/1)
          |> Enum.reject(&is_nil/1)
          |> Enum.max_by(&DateTime.to_unix(&1, :millisecond), fn -> nil end)

        indexed_pools = length(indexed_heights)
        status_ok = status_ok?(payload)

        {source_state, error_code} =
          cond do
            not status_ok -> {"timeout", "STATUS_NOT_OK"}
            indexed_pools <= 0 -> {"unavailable", "NO_POOL_DATA"}
            indexed_pools < pool_count -> {"degraded", "PARTIAL_POOLS"}
            true -> {"ok", nil}
          end

        %{
          "name" => shard.name,
          "network" => shard.network,
          "shard_index" => shard.shard_index,
          "pool_count" => pool_count,
          "indexed_pools" => indexed_pools,
          "latest_height" => latest_height,
          "latest_block_timestamp" => iso8601(latest_timestamp),
          "source_state" => source_state,
          "error_code" => error_code,
          "last_synced_at" => iso8601(latest_timestamp)
        }

      {:error, reason} ->
        %{
          "name" => shard.name,
          "network" => shard.network,
          "shard_index" => shard.shard_index,
          "pool_count" => pool_count,
          "indexed_pools" => 0,
          "latest_height" => nil,
          "latest_block_timestamp" => nil,
          "source_state" => "timeout",
          "error_code" => normalize_reason(reason),
          "last_synced_at" => nil
        }
    end
  end

  defp seth_pool_count do
    case Application.get_env(:ethereum_jsonrpc, :seth_pool_count) do
      value when is_integer(value) and value > 0 -> value
      _ -> 32
    end
  end

  defp live_head_rpc_url do
    case System.get_env("SETH_LIVE_HEAD_RPC_URL") do
      nil -> nil
      "" -> nil
      value -> String.trim(value)
    end
  end

  defp seth_shards do
    configured =
      if Code.ensure_loaded?(Client) do
        Client.seth_shards()
      else
        []
      end

    normalize_shards(configured)
  end

  defp normalize_shards(shards) when is_list(shards) do
    by_name =
      Enum.reduce(shards, %{}, fn shard, acc ->
        name = shard_field(shard, :name)

        if is_binary(name) and name != "" do
          Map.put(acc, name, %{
            name: name,
            network: shard_field(shard, :network),
            shard_index: shard_field(shard, :shard_index)
          })
        else
          acc
        end
      end)

    Enum.map(@required_seth_shards, fn required ->
      current = Map.get(by_name, required.name, %{})

      %{
        name: required.name,
        network: current[:network] || required.network,
        shard_index: current[:shard_index] || required.shard_index
      }
    end)
  end

  defp normalize_shards(_), do: @required_seth_shards

  defp shard_field(shard, key) when is_map(shard) do
    Map.get(shard, key) || Map.get(shard, Atom.to_string(key))
  end

  defp shard_field(_, _), do: nil

  defp parse_pool_height(pool) when is_map(pool) do
    value =
      pool["height"] || pool["syncedHeight"] || pool["latestHeight"] ||
        pool[:height] || pool[:syncedHeight] || pool[:latestHeight]

    case Integer.parse(to_string(value || "")) do
      {height, _} -> height
      _ -> nil
    end
  end

  defp parse_pool_height(_), do: nil

  defp pool_offset_for(shard_index, local_pool_index) do
    global_pool_index = Client.compose_pool_index(shard_index, local_pool_index)
    Map.get(pool_offsets(), global_pool_index, 0)
  end

  defp pool_offsets do
    now_ms = System.monotonic_time(:millisecond)

    case :persistent_term.get(@pool_offsets_cache_key, nil) do
      {saved_at_ms, offsets} when is_integer(saved_at_ms) and is_map(offsets) ->
        if now_ms - saved_at_ms <= pool_offsets_refresh_interval_ms() do
          offsets
        else
          refresh_pool_offsets(now_ms)
        end

      _ ->
        refresh_pool_offsets(now_ms)
    end
  end

  defp refresh_pool_offsets(now_ms) do
    offsets = load_pool_offsets_from_env()
    :persistent_term.put(@pool_offsets_cache_key, {now_ms, offsets})
    offsets
  end

  defp load_pool_offsets_from_env do
    raw = System.get_env("SETH_POOL_OFFSETS")

    cond do
      is_nil(raw) or String.trim(raw) == "" ->
        %{}

      true ->
        case Jason.decode(raw) do
          {:ok, decoded} when is_map(decoded) ->
            normalize_pool_offsets(decoded)

          _ ->
            raw
            |> String.split(",", trim: true)
            |> Enum.reduce(%{}, fn item, acc ->
              case String.split(item, ":", parts: 2) do
                [pool_idx_raw, offset_raw] ->
                  with {pool_idx, ""} <- Integer.parse(String.trim(pool_idx_raw)),
                       {offset, ""} <- Integer.parse(String.trim(offset_raw)) do
                    Map.put(acc, pool_idx, offset)
                  else
                    _ -> acc
                  end

                _ ->
                  acc
              end
            end)
        end
    end
  end

  defp normalize_pool_offsets(map) do
    Enum.reduce(map, %{}, fn {pool_idx, offset}, acc ->
      with {pool_idx_int, ""} <- Integer.parse(to_string(pool_idx)),
           offset_int when is_integer(offset_int) <- normalize_offset_value(offset) do
        Map.put(acc, pool_idx_int, offset_int)
      else
        _ -> acc
      end
    end)
  end

  defp normalize_offset_value(value) when is_integer(value), do: value

  defp normalize_offset_value(value) do
    case Integer.parse(to_string(value)) do
      {offset, ""} -> offset
      _ -> nil
    end
  end

  defp pool_offsets_refresh_interval_ms do
    case System.get_env("SETH_POOL_OFFSETS_REFRESH_MS") do
      nil -> @default_pool_offsets_refresh_interval_ms

      raw ->
        case Integer.parse(raw) do
          {value, ""} when value > 0 -> value
          _ -> @default_pool_offsets_refresh_interval_ms
        end
    end
  end

  defp parse_pool_timestamp(pool) when is_map(pool) do
    value =
      pool["timestamp"] || pool["latestBlockTimestamp"] ||
        pool[:timestamp] || pool[:latestBlockTimestamp]

    parse_timestamp_value(value)
  end

  defp parse_pool_timestamp(_), do: nil

  defp parse_timestamp_value(nil), do: nil
  defp parse_timestamp_value(%DateTime{} = timestamp), do: timestamp
  defp parse_timestamp_value(%NaiveDateTime{} = timestamp), do: DateTime.from_naive!(timestamp, "Etc/UTC")

  defp parse_timestamp_value(value) when is_integer(value) do
    value
    |> normalize_epoch_millis()
    |> DateTime.from_unix(:millisecond)
    |> case do
      {:ok, timestamp} -> timestamp
      _ -> nil
    end
  end

  defp parse_timestamp_value(value) when is_binary(value) do
    case Integer.parse(value) do
      {timestamp, _} -> parse_timestamp_value(timestamp)
      _ -> parse_iso8601(value)
    end
  end

  defp parse_timestamp_value(_), do: nil

  defp normalize_epoch_millis(timestamp) when timestamp > 9_999_999_999, do: timestamp
  defp normalize_epoch_millis(timestamp), do: timestamp * 1000

  defp parse_iso8601(nil), do: nil

  defp parse_iso8601(value) when is_binary(value) do
    case DateTime.from_iso8601(value) do
      {:ok, timestamp, _offset} -> timestamp
      _ -> nil
    end
  end

  defp parse_iso8601(_), do: nil

  defp status_ok?(payload) when is_map(payload) do
    case Map.get(payload, "status") do
      nil -> true
      0 -> true
      "0" -> true
      _ -> false
    end
  end

  defp status_ok?(_), do: false

  defp lag_payload(global_head, indexer_head) do
    blocks_lag =
      if is_integer(global_head.height) and is_integer(indexer_head.height) do
        max(global_head.height - indexer_head.height, 0)
      else
        nil
      end

    seconds_lag =
      case {global_head.timestamp, indexer_head.timestamp} do
        {%DateTime{} = global_ts, %DateTime{} = indexer_ts} ->
          max(DateTime.diff(global_ts, indexer_ts, :second), 0)

        {%NaiveDateTime{} = global_ts, %NaiveDateTime{} = indexer_ts} ->
          max(NaiveDateTime.diff(global_ts, indexer_ts, :second), 0)

        {%DateTime{} = global_ts, %NaiveDateTime{} = indexer_ts} ->
          max(DateTime.diff(global_ts, DateTime.from_naive!(indexer_ts, "Etc/UTC"), :second), 0)

        {%NaiveDateTime{} = global_ts, %DateTime{} = indexer_ts} ->
          max(DateTime.diff(DateTime.from_naive!(global_ts, "Etc/UTC"), indexer_ts, :second), 0)

        _ ->
          nil
      end

    %{"blocks" => blocks_lag, "seconds" => seconds_lag}
  end

  defp head_payload(head) do
    %{
      "height" => head.height,
      "timestamp" => iso8601(head.timestamp),
      "source" => head.source
    }
  end

  defp iso8601(nil), do: nil
  defp iso8601(%DateTime{} = timestamp), do: DateTime.to_iso8601(timestamp)
  defp iso8601(%NaiveDateTime{} = timestamp), do: timestamp |> DateTime.from_naive!("Etc/UTC") |> DateTime.to_iso8601()
  defp iso8601(value) when is_binary(value), do: value
  defp iso8601(_), do: nil

  defp normalize_reason(reason) do
    reason
    |> inspect()
    |> String.replace(~r/\s+/, "_")
    |> String.upcase()
  end
end
