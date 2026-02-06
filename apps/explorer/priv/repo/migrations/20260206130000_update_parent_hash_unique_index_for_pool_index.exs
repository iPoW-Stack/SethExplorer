defmodule Explorer.Repo.Migrations.UpdateParentHashUniqueIndexForPoolIndex do
  use Ecto.Migration

  @disable_ddl_transaction true

  def change do
    # Previous index enforced one consensus child per parent_hash for all chains:
    #   create(
    #     index(:blocks, [:parent_hash],
    #       unique: true,
    #       where: ~s(consensus),
    #       name: :one_consensus_child_per_parent
    #     )
    #   )
    #
    # For sharded Seth chains, multiple consensus genesis blocks share the same
    # parent_hash (0x00..00) across different pool_index values, so we must
    # relax this constraint to only apply when pool_index IS NULL (non-sharded).

    drop_if_exists(index(:blocks, [:parent_hash], name: :one_consensus_child_per_parent))

    create(
      index(:blocks, [:parent_hash],
        unique: true,
        where: "consensus AND pool_index IS NULL",
        name: :one_consensus_child_per_parent
      )
    )
  end
end

