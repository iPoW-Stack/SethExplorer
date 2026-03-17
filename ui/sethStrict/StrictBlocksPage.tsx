import { Box, Flex, Grid, HStack, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

import { getLiveHeadDecision } from 'lib/seth/liveHeadDecision';
import { getSethLiveHeadSwitchBlocks, getSethLiveHeadSwitchSeconds } from 'lib/settings/useSethStrict';
import { Alert } from 'toolkit/chakra/alert';
import { Button } from 'toolkit/chakra/button';
import { Link } from 'toolkit/chakra/link';
import useLiveHeadQuery from 'ui/shared/liveHead/useLiveHeadQuery';
import type { QueryWithPagesResult } from 'ui/shared/pagination/useQueryWithPages';

import useStrictBlocksData from './adapters/useStrictBlocksData';
import useRowEnterAnimation from './hooks/useRowEnterAnimation';

const borderColor = 'rgba(255, 255, 255, 0.1)';
const headerColor = 'rgba(255, 255, 255, 0.65)';
const secondaryLinkColor = 'rgba(74, 222, 128, 0.82)';

interface Props {
  query?: QueryWithPagesResult<'general:blocks'>;
}

function getRealtimeLabel(
  status: 'live' | 'indexed' | 'lagging' | 'stalled',
  source: 'live-head' | 'stats-fallback' | 'block-number-fallback' | 'none',
) {
  if (status === 'live') {
    return source === 'block-number-fallback' ? 'Live (RPC proxy)' : 'Live (RPC)';
  }

  if (status === 'indexed') {
    return 'Indexed';
  }

  if (status === 'lagging') {
    return 'Lagging';
  }

  return 'Stalled';
}

const StrictBlocksPage = ({ query }: Props) => {
  const { rows, isLoading, isError, errorMessage, totalLabel, pagination, refetch } = useStrictBlocksData({ query });
  const [ isLoadingStuck, setIsLoadingStuck ] = React.useState(false);
  const rowIds = React.useMemo(() => rows.map((item) => item.id), [rows]);
  const isRowEntering = useRowEnterAnimation(rowIds, { durationMs: 1500 });

  const indexerHeadHeight = typeof query?.data?.items?.[0]?.height === 'number' ? query.data.items[0].height : null;
  const indexerHeadTimestamp = query?.data?.items?.[0]?.timestamp ?? null;

  const liveHeadQuery = useLiveHeadQuery({
    enabled: true,
    indexerHeight: indexerHeadHeight,
    indexerTimestamp: indexerHeadTimestamp,
  });

  const liveHeadDecision = React.useMemo(() => {
    return getLiveHeadDecision({
      liveHead: liveHeadQuery.data,
      indexerHeight: indexerHeadHeight,
      switchBlocks: getSethLiveHeadSwitchBlocks(),
      switchSeconds: getSethLiveHeadSwitchSeconds(),
    });
  }, [ indexerHeadHeight, liveHeadQuery.data ]);

  const realtimeLabel = getRealtimeLabel(liveHeadDecision.status, liveHeadQuery.source);
  const resolvedTotalLabel = liveHeadDecision.shouldUseLiveHead && liveHeadDecision.headHeight !== null ?
    `Latest block #${ liveHeadDecision.headHeight }` :
    totalLabel;

  const handleRetry = React.useCallback(() => {
    refetch?.();
  }, [ refetch ]);

  const handlePrevPage = React.useCallback(() => {
    if (pagination?.canGoPrev) {
      pagination.onPrev?.();
    }
  }, [ pagination ]);

  const handleNextPage = React.useCallback(() => {
    if (pagination?.canGoNext) {
      pagination.onNext?.();
    }
  }, [ pagination ]);

  React.useEffect(() => {
    if (!isLoading) {
      setIsLoadingStuck(false);
      return;
    }

    setIsLoadingStuck(false);
    const timer = window.setTimeout(() => {
      setIsLoadingStuck(true);
    }, 15_000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [ isLoading ]);

  return (
    <Box className="seth-page-shell">
      <Box mb={ 6 } pb={ 4 } borderBottomWidth="1px" borderBottomColor={ borderColor }>
        <Flex alignItems="center" justifyContent="space-between" gap={ 3 } flexWrap="wrap">
          <Text fontSize="2xl" lineHeight="1.2" fontWeight={ 700 }>Blocks</Text>
          <Flex
            data-testid="strict-blocks-live-head-status"
            px={ 3 }
            py={ 1.5 }
            borderWidth="1px"
            borderColor={ liveHeadDecision.status === 'live' ? 'rgba(16, 185, 129, 0.42)' : 'rgba(148, 163, 184, 0.38)' }
            borderRadius="md"
            bgColor={ liveHeadDecision.status === 'live' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.12)' }
          >
            <Text fontSize="xs" color={ liveHeadDecision.status === 'live' ? '#86efac' : 'gray.300' }>
              { realtimeLabel }
            </Text>
          </Flex>
        </Flex>
      </Box>

      { isLoadingStuck && !isError && (
        <Alert status="warning" mb={ 4 }>
          <Flex alignItems="center" justifyContent="space-between" width="100%" gap={ 4 }>
            <Text fontSize="sm">Loading blocks is taking longer than expected.</Text>
            <Button size="xs" variant="subtle" onClick={ handleRetry }>Retry</Button>
          </Flex>
        </Alert>
      ) }

      <Box
        className="seth-panel seth-panel-hover seth-fade-in-up"
        style={{ '--seth-index': 1 } as React.CSSProperties}
        borderWidth="1px"
        borderColor={ borderColor }
        overflow="hidden"
      >
        <Flex px={ 6 } py={ 4 } borderBottomWidth="1px" borderBottomColor={ borderColor } alignItems="center" justifyContent="space-between">
          <Text fontSize="sm" color="gray.400">
            { resolvedTotalLabel }
            { liveHeadDecision.lagBlocks !== null ? ` | lag ${ liveHeadDecision.lagBlocks } blocks` : '' }
          </Text>
          <HStack gap={ 2 } alignItems="center">
            <Flex
              as="button"
              data-testid="strict-blocks-prev-page"
              aria-label="Previous blocks page"
              aria-disabled={ !pagination?.canGoPrev }
              boxSize="34px"
              minW="34px"
              borderWidth="1px"
              borderColor={ borderColor }
              borderRadius="full"
              alignItems="center"
              justifyContent="center"
              color="gray.400"
              bgColor="rgba(4, 6, 8, 0.75)"
              opacity={ pagination?.canGoPrev ? 1 : 0.5 }
              cursor={ pagination?.canGoPrev ? 'pointer' : 'not-allowed' }
              onClick={ handlePrevPage }
            >
              <FaChevronLeft size={ 11 }/>
            </Flex>
            <Flex
              data-testid="strict-blocks-page-label"
              minW="126px"
              px={ 3 }
              py={ 1 }
              borderWidth="1px"
              borderColor="rgba(0, 255, 163, 0.3)"
              borderRadius="full"
              bgColor="rgba(0, 255, 163, 0.2)"
              color="seth.primary"
              fontSize="sm"
              fontWeight={ 400 }
              justifyContent="center"
            >
              { pagination?.pageLabel || 'Page -' }
            </Flex>
            <Flex
              as="button"
              data-testid="strict-blocks-next-page"
              aria-label="Next blocks page"
              aria-disabled={ !pagination?.canGoNext }
              boxSize="34px"
              minW="34px"
              borderWidth="1px"
              borderColor={ borderColor }
              borderRadius="full"
              alignItems="center"
              justifyContent="center"
              color="gray.400"
              bgColor="rgba(4, 6, 8, 0.75)"
              opacity={ pagination?.canGoNext ? 1 : 0.5 }
              cursor={ pagination?.canGoNext ? 'pointer' : 'not-allowed' }
              onClick={ handleNextPage }
            >
              <FaChevronRight size={ 11 }/>
            </Flex>
          </HStack>
        </Flex>

        <Grid
          px={ 6 }
          py={ 3 }
          borderBottomWidth="1px"
          borderBottomColor={ borderColor }
          bgColor="rgba(255, 255, 255, 0.04)"
          gridTemplateColumns="1fr 1fr 0.7fr 1fr 1.4fr 1fr"
          columnGap={ 4 }
          fontSize="xs"
          letterSpacing="wider"
          color={ headerColor }
        >
          <Text>BLOCK</Text>
          <Text>AGE</Text>
          <Text>TXNS</Text>
          <Text>MINER</Text>
          <Text>GAS USED</Text>
          <Text>REWARD</Text>
        </Grid>

        <VStack alignItems="stretch" gap={ 0 }>
          { rows.map((item, index) => {
            const isEntering = isRowEntering(item.id);

            return (
            <Grid
              key={ item.id }
              className={ isEntering ? 'seth-list-enter' : undefined }
              style={ isEntering ? { '--seth-index': index } as React.CSSProperties : undefined }
              px={ 6 }
              py={ 4 }
              borderBottomWidth="1px"
              borderBottomColor={ borderColor }
              gridTemplateColumns="1fr 1fr 0.7fr 1fr 1.4fr 1fr"
              columnGap={ 4 }
              alignItems="center"
              fontSize="sm"
              transitionProperty="background-color"
              transitionDuration="normal"
              bgColor={ index % 2 === 0 ? 'rgba(255, 255, 255, 0.01)' : 'transparent' }
              _hover={{ bgColor: 'rgba(148, 163, 184, 0.06)', boxShadow: 'inset 3px 0 0 #00FFA3' }}
            >
              <Box>
                <Link
                  noIcon
                  href={ item.blockHref }
                  data-testid="strict-blocks-row-block-link"
                  color="seth.primary"
                  fontWeight={ 600 }
                >
                  { item.block }
                </Link>
                { item.poolLabel && <Text mt={ 1 } color="gray.400" fontSize="xs">{ item.poolLabel }</Text> }
              </Box>
              <Text color="gray.400">{ item.age }</Text>
              <Text color="gray.100">{ item.txns }</Text>
              { item.minerHref ? (
                <Link noIcon href={ item.minerHref } color={ secondaryLinkColor }>{ item.miner }</Link>
              ) : (
                <Text color={ secondaryLinkColor }>{ item.miner }</Text>
              ) }
              <Box>
                <HStack gap={ 2 } alignItems="center">
                  <Box h="6px" borderRadius="full" bgColor="rgba(148, 163, 184, 0.35)" flex={ 1 } maxW="120px" overflow="hidden">
                    <Box h="100%" w={ `${ item.gasProgress }%` } bgColor={ item.gasColor }/>
                  </Box>
                  <Text color="gray.300" fontSize="sm">{ item.gasUsed }</Text>
                </HStack>
              </Box>
              <Text color="gray.300">{ item.reward }</Text>
            </Grid>
            );
          }) }
        </VStack>

        { rows.length === 0 && !isLoading && !isError && (
          <Flex px={ 6 } py={ 6 } justifyContent="center" borderTopWidth="1px" borderTopColor={ borderColor }>
            <Text color="text.secondary" fontSize="sm">No blocks found for the current view.</Text>
          </Flex>
        ) }

        { isError && (
          <Flex px={ 6 } py={ 4 } alignItems="center" justifyContent="space-between" borderTopWidth="1px" borderTopColor={ borderColor }>
            <Text color="red.300" fontSize="sm">{ errorMessage || 'Failed to load blocks data' }</Text>
            <Button size="xs" variant="subtle" onClick={ handleRetry }>Retry</Button>
          </Flex>
        ) }

        <Flex alignItems="center" justifyContent="center" px={ 6 } py={ 4 }>
          <Text color="text.secondary">Show</Text>
          <Flex
            mx={ 3 }
            px={ 3 }
            py={ 1 }
            borderWidth="1px"
            borderColor={ borderColor }
            borderRadius="md"
            minW="56px"
            justifyContent="center"
            color="gray.200"
            fontSize="sm"
          >
            { pagination?.pageSizeLabel || '25' }
          </Flex>
          <Text color="text.secondary">Records</Text>
        </Flex>
      </Box>
    </Box>
  );
};

export default React.memo(StrictBlocksPage);
