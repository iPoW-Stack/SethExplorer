import { Flex, Box, Text } from '@chakra-ui/react';
import { upperFirst } from 'es-toolkit';
import React from 'react';

import type { PaginationParams } from 'ui/shared/pagination/types';

import { route } from 'nextjs-routes';

import config from 'configs/app';
import useApiQuery from 'lib/api/useApiQuery';
import getNetworkUtilizationParams from 'lib/networks/getNetworkUtilizationParams';
import { HOMEPAGE_STATS } from 'stubs/stats';
import { Link } from 'toolkit/chakra/link';
import { Skeleton } from 'toolkit/chakra/skeleton';
import { Tooltip } from 'toolkit/chakra/tooltip';
import { nbsp } from 'toolkit/utils/htmlEntities';
import IconSvg from 'ui/shared/IconSvg';
import Pagination from 'ui/shared/pagination/Pagination';

interface Props {
  pagination: PaginationParams | null;
}

const BlocksTabSlot = ({ pagination }: Props) => {
  const statsQuery = useApiQuery('general:stats', {
    queryOptions: {
      placeholderData: HOMEPAGE_STATS,
    },
  });

  const isSethCompact = config.UI.colorTheme.default?.id === 'seth';
  const networkUtilization = getNetworkUtilizationParams(statsQuery.data?.network_utilization_percentage ?? 0);

  if (isSethCompact) {
    return (
      <Flex alignItems="center" justifyContent="space-between" w="100%" display={{ base: 'none', lg: 'flex' }}>
        <Text fontSize="sm" color="text.secondary">
          Total of <Skeleton loading={ statsQuery.isPlaceholderData } display="inline-block"><span>{ Number(statsQuery.data?.total_blocks || 0).toLocaleString() }</span></Skeleton> blocks
        </Text>
        { pagination && <Pagination my={ 0 } { ...pagination }/> }
      </Flex>
    );
  }

  return (
    <Flex alignItems="center" columnGap={ 6 } display={{ base: 'none', lg: 'flex' }}>
      { statsQuery.data?.network_utilization_percentage !== undefined && (
        <Box>
          <Text as="span" fontSize="sm">
            Network utilization (last 50 blocks):{ nbsp }
          </Text>
          <Tooltip content={ `${ upperFirst(networkUtilization.load) } load` }>
            <Skeleton display="inline-block" fontSize="sm" color={ networkUtilization.color } fontWeight={ 600 } loading={ statsQuery.isPlaceholderData }>
              <span>{ statsQuery.data.network_utilization_percentage.toFixed(2) }%</span>
            </Skeleton>
          </Tooltip>
        </Box>
      ) }
      <Link href={ route({ pathname: '/block/countdown' }) }>
        <IconSvg name="hourglass" boxSize={ 5 } mr={ 2 }/>
        <span>Block countdown</span>
      </Link>
      { pagination && <Pagination my={ 1 } { ...pagination }/> }
    </Flex>
  );
};

export default BlocksTabSlot;
