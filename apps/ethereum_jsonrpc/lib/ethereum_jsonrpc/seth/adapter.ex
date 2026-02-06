defmodule EthereumJSONRPC.Seth.Adapter do
  @moduledoc """
  Converts Seth RPC responses to the same elixir format expected by
  `EthereumJSONRPC.Block` / `Blocks` / `Transactions` / `Logs`, so the
  indexer can reuse `elixir_to_params` and existing import logic.

  Seth response may be:
  - JSON (map with string or atom keys from /get_block_with_gid or /query_init block_list)
  - Or base64-encoded protobuf (decode then map same as below)

  Field mapping: see docs/SETH_RPC_ADAPTER.md.
  """

  @sha3_uncles_empty "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347"
  @full_hash_zero "0x0000000000000000000000000000000000000000000000000000000000000000"

  @doc """
  Converts a Seth block (map from JSON or decoded protobuf) to Block elixir format
  consumed by `EthereumJSONRPC.Block.elixir_to_params/1`.

  Seth Block (proto) fields: version, height, consistency_random, timeblock_height,
  tx_list, timestamp, key_value_array, contract_txs, address_array, elect_statistic,
  elect_block, prev_elect_block, local_to, timer_block, normal_to, cross_shard_to_array,
  pool_statistic_height, all_gas, joins, pool_st_info, unique_hashs.

  Returns a map with string keys matching standard Ethereum JSON-RPC block (camelCase).
  Missing fields are filled with defaults so that Block.elixir_to_params does not crash.
  """
  @spec block_to_elixir(map(), keyword()) :: map()
  def block_to_elixir(seth_block, opts \\ []) when is_map(seth_block) do
    # Normalize keys (atoms or strings from JSON); get_blocks returns blockInfo with txList (camelCase)
    m = normalize_keys(seth_block)
    height = parse_int(get_in(m, ["height"]) || get_in(m, [:height]) || 0)
    ts = parse_int(get_in(m, ["timestamp"]) || get_in(m, [:timestamp]) || 0)
    timestamp_dt = timestamp_to_datetime(ts)
    tx_list = get_in(m, ["txList"]) || get_in(m, ["tx_list"]) || get_in(m, [:tx_list]) || []
    all_gas = parse_int(get_in(m, ["all_gas"]) || get_in(m, [:all_gas]) || 0)

    hash = opts[:block_hash] || block_hash_placeholder(height)

    # Default parent hash is zero (genesis-style). For sharded Seth we may have
    # multiple genesis blocks (one per pool) all with parent 0x0; Explorer DB
    # enforces unique consensus child per parent_hash, so we must make genesis
    # parents unique per pool_index to avoid conflicts.
    parent_hash0 = opts[:parent_hash] || @full_hash_zero

    parent_hash =
      case {height, Keyword.get(opts, :pool_index)} do
        {0, pi} when is_integer(pi) and pi >= 0 ->
          # Derive a deterministic 32-byte parent hash from pool_index.
          "0x" <> Base.encode16(<<pi::256>>, case: :lower)

        _ ->
          parent_hash0
      end

    # Build transactions elixir list (BlockTx -> Transaction elixir); attach logs from events for Seth (no separate receipt RPC).
    transactions =
      tx_list
      |> Enum.with_index()
      |> Enum.map(fn {tx, idx} ->
        tx_elixir = block_tx_to_transaction_elixir(tx, height, hash, idx)
        events = get_in(normalize_keys(tx), ["events"]) || []
        block_ctx = %{
          "block_hash" => hash,
          "block_number" => height,
          "transaction_hash" => tx_elixir["hash"],
          "transaction_index" => idx,
          "address" => tx_elixir["to"] || "0x0000000000000000000000000000000000000000"
        }
        logs = events_to_logs(events, block_ctx)
        Map.put(tx_elixir, "logs", logs)
      end)

    base = %{
      "number" => height,
      "hash" => hash,
      "parentHash" => parent_hash,
      "timestamp" => timestamp_dt,
      "gasLimit" => all_gas || 0,
      "gasUsed" => all_gas,
      "miner" => opts[:miner] || "0x0000000000000000000000000000000000000000",
      "difficulty" => 0,
      "totalDifficulty" => 0,
      "size" => opts[:size] || 0,
      "transactions" => transactions,
      "transactionsRoot" => "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
      "stateRoot" => "0x0000000000000000000000000000000000000000000000000000000000000000",
      "receiptsRoot" => "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
      "logsBloom" => empty_logs_bloom(),
      "extraData" => "0x",
      "nonce" => 0,
      "sha3Uncles" => @sha3_uncles_empty,
      "uncles" => []
    }
    base = maybe_put_base_fee_per_gas(base, opts)
    case Keyword.get(opts, :pool_index) do
      nil -> base
      pi when is_integer(pi) -> Map.put(base, "pool_index", pi)
    end
  end

  @doc """
  Converts a Seth BlockTx (single transaction in block) to Transaction elixir format
  expected by `EthereumJSONRPC.Transactions.elixir_to_params/1`.

  block_ctx: %{block_hash: _, block_number: _}
  """
  @spec block_tx_to_transaction_elixir(map(), non_neg_integer(), String.t() | nil, non_neg_integer()) :: map()
  def block_tx_to_transaction_elixir(seth_tx, block_number, block_hash, tx_index) when is_map(seth_tx) do
    m = normalize_keys(seth_tx)
    from_bin = addr_bin(get_in(m, ["from"]) || get_in(m, [:from]))
    to_bin = addr_bin(get_in(m, ["to"]) || get_in(m, [:to]))
    amount = parse_int(get_in(m, ["amount"]) || get_in(m, [:amount]) || 0)
    gas_limit = parse_int(get_in(m, ["gasLimit"]) || get_in(m, ["gas_limit"]) || get_in(m, [:gas_limit]) || 0)
    gas_used = parse_int(get_in(m, ["gasUsed"]) || get_in(m, ["gas_used"]) || get_in(m, [:gas_used]) || 0)
    gas_price = parse_int(get_in(m, ["gasPrice"]) || get_in(m, ["gas_price"]) || get_in(m, [:gas_price]) || 0)
    raw_input = get_in(m, ["contractInput"]) || get_in(m, ["contract_input"]) || get_in(m, [:contract_input]) || <<>>
    input_bin = if is_binary(raw_input), do: maybe_decode64(raw_input), else: <<>>
    nonce = parse_int(get_in(m, ["nonce"]) || get_in(m, [:nonce]) || 0)
    unique_hash = get_in(m, ["uniqueHash"]) || get_in(m, ["unique_hash"]) || get_in(m, [:unique_hash])
    seth_status = parse_int(get_in(m, ["status"]) || get_in(m, [:status]) || 0)

    # Seth txList often has empty uniqueHash; Explorer.Chain expects 32-byte (64 hex) transaction hash.
    hash_str =
      if unique_hash && byte_size(unique_hash) > 0 do
        raw = maybe_decode64(unique_hash)
        "0x" <> (if byte_size(raw) >= 32, do: Base.encode16(binary_part(raw, 0, 32), case: :lower), else: Base.encode16(raw <> :binary.copy(<<0>>, 32 - byte_size(raw)), case: :lower))
      else
        # Deterministic 32-byte placeholder: block_number (64b) + tx_index (32b), padded to 32 bytes
        hex = Base.encode16(<<block_number::64, tx_index::32>>, case: :lower)
        "0x" <> String.pad_leading(hex, 64, "0")
      end

    %{
      "hash" => hash_str,
      "blockHash" => block_hash,
      "blockNumber" => block_number,
      "from" => bin_to_hex_address(from_bin),
      "to" => if(to_bin && byte_size(to_bin) > 0, do: bin_to_hex_address(to_bin), else: nil),
      "value" => amount,
      "gas" => gas_limit,
      "gasUsed" => gas_used,
      "gasPrice" => gas_price,
      "input" => "0x" <> Base.encode16(input_bin, case: :lower),
      "nonce" => nonce,
      "transactionIndex" => tx_index,
      "status" => if(seth_status == 0, do: "0x1", else: "0x0"),
      # transactions table has NOT NULL on r, s, v; Seth has no ECDSA signature, use 0.
      "v" => 0,
      "r" => 0,
      "s" => 0
    }
  end

  @doc """
  Converts Seth TxLog events to list of Log elixir maps for use with
  `EthereumJSONRPC.Logs` / indexer logs import.

  events: list of %{data: binary, topics: [binary]}
  block_ctx: %{block_hash: _, block_number: _, transaction_hash: _, transaction_index: _}
  """
  @spec events_to_logs(list(map()), map()) :: [map()]
  def events_to_logs(events, block_ctx) when is_list(events) and is_map(block_ctx) do
    tx_hash = block_ctx[:transaction_hash] || block_ctx["transaction_hash"]
    block_hash = block_ctx[:block_hash] || block_ctx["block_hash"]
    block_number = block_ctx[:block_number] || block_ctx["block_number"]
    tx_index = block_ctx[:transaction_index] || block_ctx["transaction_index"] || 0
    address = block_ctx[:address] || block_ctx["address"] || "0x0000000000000000000000000000000000000000"

    events
    |> Enum.with_index()
    |> Enum.map(fn {ev, log_index} ->
      m = normalize_keys(ev)
      raw_data = get_in(m, ["data"]) || get_in(m, [:data]) || <<>>
      data_bin = if is_binary(raw_data), do: maybe_decode64(raw_data), else: <<>>
      topics = get_in(m, ["topics"]) || get_in(m, [:topics]) || []
      # Seth events use base64 for data and topics; decode then hex for EthereumJSONRPC.Log format.
      topics_hex = Enum.map(topics, fn t -> "0x" <> Base.encode16(if(is_binary(t), do: maybe_decode64(t), else: <<>>), case: :lower) end)

      %{
        "address" => address,
        "topics" => topics_hex,
        "data" => "0x" <> Base.encode16(data_bin, case: :lower),
        "blockNumber" => block_number,
        "blockHash" => block_hash,
        "transactionHash" => tx_hash,
        "transactionIndex" => tx_index,
        "logIndex" => log_index
      }
    end)
  end

  @doc """
  Parses raw response from /get_block_with_gid or /query_init (block_list item).
  If body is JSON string, decodes and returns block_to_elixir(map).
  If body is base64-encoded protobuf, decode and then block_to_elixir (requires protobuf lib).
  Returns {:ok, block_elixir} or {:error, reason}.
  """
  @spec parse_block_response(String.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def parse_block_response(raw_body, opts \\ []) when is_binary(raw_body) do
    case Jason.decode(raw_body) do
      {:ok, %{} = decoded} ->
        # /get_blocks returns {"blocks": [%{"blockInfo" => info, "parentHash" => ph, "qc" => _}], "status": 0}
        case get_in(decoded, ["blocks", Access.at(0)]) do
          %{"blockInfo" => info, "parentHash" => parent_b64, "qc" => qc} when is_map(info) ->
            parent_hex = base64_hash_to_hex(parent_b64)
            block_hash_hex = (qc && qc["viewBlockHash"]) |> case do nil -> nil; b64 -> base64_hash_to_hex(b64) end
            opts = [parent_hash: parent_hex] |> then(fn o -> if block_hash_hex, do: Keyword.put(o, :block_hash, block_hash_hex), else: o end)
            {:ok, block_to_elixir(normalize_keys(info), opts)}

          %{"blockInfo" => info, "parentHash" => parent_b64} when is_map(info) ->
            parent_hex = base64_hash_to_hex(parent_b64)
            {:ok, block_to_elixir(normalize_keys(info), Keyword.put(opts, :parent_hash, parent_hex))}

          _ ->
            block = get_in(decoded, ["block"]) || get_in(decoded, ["block_list", Access.at(0)]) || decoded
            {:ok, block_to_elixir(block, opts)}
        end

      {:ok, _} ->
        {:error, :unexpected_json}

      {:error, _} ->
        {:error, :not_json}
    end
  end

  def normalize_keys(map) when is_map(map) do
    Enum.into(map, %{}, fn
      {k, v} when is_binary(k) -> {k, normalize_value(v)}
      {k, v} when is_atom(k) -> {to_string(k), normalize_value(v)}
    end)
  end

  defp normalize_value(%{} = v), do: normalize_keys(v)
  defp normalize_value([_ | _] = v), do: Enum.map(v, &normalize_value/1)
  defp normalize_value(v), do: v

  defp parse_int(i) when is_integer(i), do: i
  defp parse_int(s) when is_binary(s) do
    case Integer.parse(s) do
      {n, _} -> n
      _ -> 0
    end
  end
  defp parse_int(_), do: 0

  # Explorer.Chain.Hash.Full requires exactly 32 bytes (64 hex chars). Normalize to 32 bytes.
  def base64_hash_to_hex(b64) when is_binary(b64) do
    case Base.decode64(b64, padding: true) do
      {:ok, bin} when byte_size(bin) >= 32 ->
        "0x" <> Base.encode16(binary_part(bin, 0, 32), case: :lower)
      {:ok, bin} ->
        padded = bin <> :binary.copy(<<0>>, 32 - byte_size(bin))
        "0x" <> Base.encode16(padded, case: :lower)
      _ ->
        @full_hash_zero
    end
  end
  def base64_hash_to_hex(_), do: @full_hash_zero

  defp timestamp_to_datetime(ts) when is_integer(ts) do
    # Seth may use milliseconds
    sec = if ts > 1_000_000_000_000, do: div(ts, 1000), else: ts
    case DateTime.from_unix(sec, :second) do
      {:ok, dt} -> dt
      _ -> DateTime.utc_now()
    end
  end

  defp timestamp_to_datetime(s) when is_binary(s) do
    case Integer.parse(s) do
      {n, _} -> timestamp_to_datetime(n)
      _ -> DateTime.utc_now()
    end
  end
  defp timestamp_to_datetime(_), do: DateTime.utc_now()

  # Decode base64 to raw bytes when valid; otherwise return as-is (or <<>> for nil).
  defp addr_bin(nil), do: <<>>
  defp addr_bin(bin) when is_binary(bin) do
    case Base.decode64(bin, padding: true) do
      {:ok, decoded} -> decoded
      _ -> bin
    end
  end
  defp addr_bin(_), do: <<>>

  defp maybe_decode64(bin) when is_binary(bin) do
    case Base.decode64(bin, padding: true) do
      {:ok, decoded} -> decoded
      _ -> bin
    end
  end
  defp maybe_decode64(_), do: <<>>

  defp bin_to_hex_address(<<>>), do: "0x0000000000000000000000000000000000000000"
  defp bin_to_hex_address(bin) when is_binary(bin), do: "0x" <> Base.encode16(bin, case: :lower)
  defp bin_to_hex_address(_), do: "0x0000000000000000000000000000000000000000"

  defp bin_to_hex(bin) when is_binary(bin), do: "0x" <> Base.encode16(bin, case: :lower)
  defp bin_to_hex(_), do: "0x"

  # Explorer.Chain.Hash.Full requires 32 bytes (64 hex chars). Pad height to 32 bytes.
  defp block_hash_placeholder(height) do
    hex = Base.encode16(<<height::64>>, case: :lower)
    "0x" <> String.pad_leading(hex, 64, "0")
  end

  defp empty_logs_bloom do
    "0x" <> String.duplicate("0", 512)
  end

  defp maybe_put_base_fee_per_gas(block, opts) do
    case opts[:base_fee_per_gas] do
      nil -> block
      v -> Map.put(block, "baseFeePerGas", v)
    end
  end
end
