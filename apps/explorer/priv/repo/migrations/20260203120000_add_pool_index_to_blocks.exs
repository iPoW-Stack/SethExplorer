defmodule Explorer.Repo.Migrations.AddPoolIndexToBlocks do
  @moduledoc """
  Adds pool_index to blocks for sharded Seth chain.
  Block identity becomes (number, pool_index) when pool_index is set; otherwise (number) remains unique per consensus block.
  """
  use Ecto.Migration

  def change do
    alter table(:blocks) do
      add(:pool_index, :integer, null: true)
    end

    # Drop the old unique index: one block per number when consensus.
    drop_if_exists(
      index(:blocks, [:number], unique: true, where: "consensus", name: :one_consensus_block_at_height)
    )

    # Non-sharded chains: one consensus block per number when pool_index is null.
    create index(:blocks, [:number],
             unique: true,
             where: "consensus AND pool_index IS NULL",
             name: :one_consensus_block_at_height_when_no_pool
           )

    # Sharded (Seth): one consensus block per (number, pool_index) when pool_index is set.
    create index(:blocks, [:number, :pool_index],
             unique: true,
             where: "consensus AND pool_index IS NOT NULL",
             name: :one_consensus_block_per_height_pool
           )
  end
end
