defmodule EthereumJSONRPC.Seth.HTTP.HTTPoison do
  @moduledoc """
  Seth RPC HTTP client using HTTPoison.
  """
  @behaviour EthereumJSONRPC.Seth.HTTP

  @impl EthereumJSONRPC.Seth.HTTP
  def get(url, headers, timeout) when is_binary(url) do
    opts = [recv_timeout: timeout, timeout: timeout]

    case HTTPoison.get(url, headers, opts) do
      {:ok, %HTTPoison.Response{status_code: code, body: resp_body}} ->
        {:ok, %{body: resp_body, status_code: code}}

      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, reason}
    end
  end

  @impl EthereumJSONRPC.Seth.HTTP
  def post(url, body, headers, timeout) when is_binary(url) do
    opts = [recv_timeout: timeout, timeout: timeout]

    case HTTPoison.post(url, body, headers, opts) do
      {:ok, %HTTPoison.Response{status_code: code, body: resp_body}} ->
        {:ok, %{body: resp_body, status_code: code}}

      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, reason}
    end
  end
end
