defmodule EthereumJSONRPC.Seth.HTTP do
  @moduledoc """
  Simple HTTP POST for Seth RPC.
  Default implementation: `EthereumJSONRPC.Seth.HTTP.HTTPoison`.
  """
  @callback get(url :: String.t(), headers :: [{String.t(), String.t()}], timeout :: non_neg_integer()) ::
              {:ok, %{body: String.t(), status_code: pos_integer()}} | {:error, term()}

  @callback post(
              url :: String.t(),
              body :: String.t(),
              headers :: [{String.t(), String.t()}],
              timeout :: non_neg_integer()
            ) ::
              {:ok, %{body: String.t(), status_code: pos_integer()}} | {:error, term()}
end
