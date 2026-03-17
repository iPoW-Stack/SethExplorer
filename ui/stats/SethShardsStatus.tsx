import { Box, Flex, Grid, Text, VStack } from '@chakra-ui/react';
import React from 'react';

import useApiQuery from 'lib/api/useApiQuery';
import IndexerStatusBadge from 'ui/shared/status/IndexerStatusBadge';

const REFRESH_MS = 20_000;

const SethShardsStatus = () => {
  const { data, isPlaceholderData } = useApiQuery('general:stats', {
    queryOptions: {
      refetchInterval: REFRESH_MS,
      refetchIntervalInBackground: true,
      refetchOnMount: false,
    },
  });

  const shards = Array.isArray(data?.seth_shards) ? data.seth_shards : [];
  if (shards.length === 0 && !isPlaceholderData) {
    return null;
  }

  return (
    <Box className="seth-panel seth-panel-soft" p={{ base: 3, lg: 4 }} mb={{ base: 6, sm: 8 }} data-testid="stats-shards-status">
      <Text fontSize="sm" color="text.secondary" mb={ 3 }>Seth shard status</Text>
      <Grid gridTemplateColumns={{ base: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }} gap={ 3 }>
        { shards.map((shard) => {
          const shardLabel = shard.name || `network-${ shard.network }`;
          return (
            <VStack
              key={ `${ shardLabel }-${ shard.network }` }
              alignItems="flex-start"
              gap={ 2 }
              borderWidth="1px"
              borderColor="rgba(255, 255, 255, 0.08)"
              bgColor="rgba(10, 16, 20, 0.68)"
              borderRadius="md"
              px={ 3 }
              py={ 3 }
            >
              <Flex width="100%" alignItems="center" justifyContent="space-between" gap={ 3 }>
                <Text fontSize="sm" fontWeight={ 600 }>{ shardLabel }</Text>
                <IndexerStatusBadge sourceState={ shard.source_state }/>
              </Flex>
              <Text fontSize="xs" color="gray.300">
                Latest block: { typeof shard.latest_height === 'number' ? `#${ shard.latest_height }` : '-' }
              </Text>
              <Text fontSize="xs" color="gray.300">
                Indexed pools: { shard.indexed_pools } / { shard.pool_count }
              </Text>
              <Text fontSize="xs" color="gray.300">
                Last synced: { shard.last_synced_at || shard.latest_block_timestamp || '-' }
              </Text>

              { (shard.error_code || shard.source_state) && (
                <Box as="details" width="100%">
                  <Box as="summary" cursor="pointer" color="gray.400" fontSize="xs">
                    Details
                  </Box>
                  <Box mt={ 2 }>
                    <Text fontSize="xs" color="gray.400">source_state: { shard.source_state || 'unknown' }</Text>
                    { shard.error_code && <Text fontSize="xs" color="#fecaca">error_code: { shard.error_code }</Text> }
                  </Box>
                </Box>
              ) }
            </VStack>
          );
        }) }
      </Grid>
    </Box>
  );
};

export default React.memo(SethShardsStatus);
