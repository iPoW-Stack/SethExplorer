type SethShardMeta = {
  name: string;
  network: number;
};

const SHARDS: SethShardMeta[] = [
  { name: 'root', network: 1 },
  { name: 'shard3', network: 3 },
];

export const SETH_POOL_COUNT_PER_SHARD = 32;

export type SethPoolIndexMeta = {
  globalPoolIndex: number;
  shardIndex: number;
  shardName: string;
  shardNetwork: number;
  localPoolIndex: number;
  isKnownShard: boolean;
};

export function parseSethPoolIndex(poolIndex: number | null | undefined): SethPoolIndexMeta | null {
  if (poolIndex == null || Number.isNaN(poolIndex) || poolIndex < 0) {
    return null;
  }

  const shardIndex = Math.floor(poolIndex / SETH_POOL_COUNT_PER_SHARD);
  const localPoolIndex = poolIndex % SETH_POOL_COUNT_PER_SHARD;
  const shard = SHARDS[shardIndex];

  return {
    globalPoolIndex: poolIndex,
    shardIndex,
    shardName: shard?.name ?? `shard${ shardIndex }`,
    shardNetwork: shard?.network ?? shardIndex,
    localPoolIndex,
    isKnownShard: Boolean(shard),
  };
}

export function formatSethPoolIndexCompact(poolIndex: number | null | undefined): string {
  const meta = parseSethPoolIndex(poolIndex);

  if (!meta) {
    return '-';
  }

  if (!meta.isKnownShard) {
    return `pool ${ meta.globalPoolIndex }`;
  }

  return `${ meta.shardName }:${ meta.localPoolIndex }`;
}

export function formatSethPoolIndex(poolIndex: number | null | undefined): string {
  const meta = parseSethPoolIndex(poolIndex);

  if (!meta) {
    return '-';
  }

  if (!meta.isKnownShard) {
    return `pool ${ meta.globalPoolIndex }`;
  }

  return `${ meta.shardName } / pool ${ meta.localPoolIndex }`;
}

export function getSethPoolIndexHint(poolIndex: number | null | undefined): string {
  const meta = parseSethPoolIndex(poolIndex);

  if (!meta) {
    return 'Transaction pool index on sharded chains.';
  }

  if (!meta.isKnownShard) {
    return `Transaction pool index on sharded chains. Global pool index: ${ meta.globalPoolIndex }.`;
  }

  return `Transaction pool index on sharded chains. ${ meta.shardName } (network=${ meta.shardNetwork }) local pool ${ meta.localPoolIndex } / 32, global index ${ meta.globalPoolIndex }.`;
}
