import { Box, Flex, Grid, HStack, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

import { getLiveHeadDecision } from 'lib/seth/liveHeadDecision';
import { getSethLiveHeadSwitchBlocks, getSethLiveHeadSwitchSeconds } from 'lib/settings/useSethStrict';
import { Alert } from 'toolkit/chakra/alert';
import { Button } from 'toolkit/chakra/button';
import { Link } from 'toolkit/chakra/link';
import CopyToClipboard from 'ui/shared/CopyToClipboard';
import IconSvg, { type IconName } from 'ui/shared/IconSvg';
import useLiveHeadQuery from 'ui/shared/liveHead/useLiveHeadQuery';
import type { QueryWithPagesResult } from 'ui/shared/pagination/useQueryWithPages';

import useStrictTransactionsData from './adapters/useStrictTransactionsData';
import useRowEnterAnimation from './hooks/useRowEnterAnimation';

const borderColor = 'rgba(255, 255, 255, 0.1)';
const headerColor = 'rgba(255, 255, 255, 0.65)';
const secondaryLinkColor = 'rgba(74, 222, 128, 0.82)';

function getMethodToneStyle(tone: 'green' | 'blue' | 'purple' | 'gold' | 'gray') {
  switch (tone) {
    case 'green':
      return {
        text: '#dcfce7',
        bg: 'rgba(20, 83, 45, 0.45)',
        border: 'rgba(21, 128, 61, 0.5)',
      };
    case 'blue':
      return {
        text: '#bfdbfe',
        bg: 'rgba(30, 58, 138, 0.45)',
        border: 'rgba(59, 130, 246, 0.5)',
      };
    case 'purple':
      return {
        text: '#ddd6fe',
        bg: 'rgba(76, 29, 149, 0.45)',
        border: 'rgba(139, 92, 246, 0.5)',
      };
    case 'gold':
      return {
        text: '#fde68a',
        bg: 'rgba(120, 53, 15, 0.45)',
        border: 'rgba(245, 158, 11, 0.55)',
      };
    default:
      return {
        text: '#d1d5db',
        bg: 'rgba(31, 41, 55, 0.65)',
        border: 'rgba(75, 85, 99, 0.8)',
      };
  }
}

function getStatusBadge(status: 'ok' | 'error' | 'pending') {
  switch (status) {
    case 'ok':
      return {
        name: 'status/success' as IconName,
        color: '#34d399',
        label: 'Success',
        bg: 'rgba(0, 255, 148, 0.12)',
        border: 'rgba(0, 255, 148, 0.35)',
      };
    case 'error':
      return {
        name: 'status/error' as IconName,
        color: '#f87171',
        label: 'Failed',
        bg: 'rgba(255, 77, 77, 0.12)',
        border: 'rgba(255, 77, 77, 0.35)',
      };
    default:
      return {
        name: 'status/pending' as IconName,
        color: '#fbbf24',
        label: 'Pending',
        bg: 'rgba(245, 158, 11, 0.14)',
        border: 'rgba(245, 158, 11, 0.35)',
      };
  }
}

interface Props {
  query?: QueryWithPagesResult<'general:txs_validated'>;
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

const StrictTransactionsPage = ({ query }: Props) => {
  const { rows, isLoading, isError, errorMessage, totalLabel, pagination, refetch } = useStrictTransactionsData({ query });
  const [ isLoadingStuck, setIsLoadingStuck ] = React.useState(false);
  const rowIds = React.useMemo(() => rows.map((item) => item.id), [rows]);
  const isRowEntering = useRowEnterAnimation(rowIds, { durationMs: 1500 });

  const indexerHeadHeight = typeof query?.data?.items?.[0]?.block_number === 'number' ? query.data.items[0].block_number : null;
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
          <Text fontSize="2xl" lineHeight="1.2" fontWeight={ 700 }>Transactions</Text>
          <Flex
            data-testid="strict-txs-live-head-status"
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
            <Text fontSize="sm">Loading transactions is taking longer than expected.</Text>
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
          <HStack gap={ 2 }>
            <Flex
              as="button"
              data-testid="strict-txs-prev-page"
              aria-label="Previous transactions page"
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
              data-testid="strict-txs-page-label"
              minW="124px"
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
              data-testid="strict-txs-next-page"
              aria-label="Next transactions page"
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
          gridTemplateColumns="1.2fr 0.9fr 0.8fr 0.9fr 0.9fr 0.9fr 0.8fr"
          columnGap={ 4 }
          fontSize="xs"
          letterSpacing="wider"
          color={ headerColor }
        >
          <Text>TXN HASH</Text>
          <Text>METHOD</Text>
          <Text>BLOCK</Text>
          <Text>AGE</Text>
          <Text>FROM</Text>
          <Text>TO</Text>
          <Text>VALUE</Text>
        </Grid>

        <VStack alignItems="stretch" gap={ 0 }>
          { rows.map((item, index) => {
            const methodTone = getMethodToneStyle(item.methodTone);
            const statusBadge = getStatusBadge(item.status);
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
              gridTemplateColumns="1.2fr 0.9fr 0.8fr 0.9fr 0.9fr 0.9fr 0.8fr"
              columnGap={ 4 }
              alignItems="center"
              fontSize="sm"
              transitionProperty="background-color"
              transitionDuration="normal"
              bgColor={ index % 2 === 0 ? 'rgba(255, 255, 255, 0.01)' : 'transparent' }
              _hover={{ bgColor: 'rgba(148, 163, 184, 0.06)', boxShadow: 'inset 3px 0 0 #00FFA3' }}
            >
              <HStack gap={ 2 } minW={ 0 }>
                <HStack
                  px={ 2 }
                  py={ 1 }
                  borderRadius="full"
                  borderWidth="1px"
                  borderColor={ statusBadge.border }
                  bgColor={ statusBadge.bg }
                  gap={ 1.5 }
                  flexShrink={ 0 }
                >
                  <IconSvg
                    name={ statusBadge.name }
                    boxSize={ 3 }
                    color={ statusBadge.color }
                    animation={ item.status === 'pending' ? 'sethBadgePulse 1.8s ease-in-out infinite' : undefined }
                  />
                  <Text fontSize="xs" fontWeight={ 600 } color={ statusBadge.color }>{ statusBadge.label }</Text>
                </HStack>
                <Link
                  noIcon
                  href={ item.txHref }
                  data-testid="strict-txs-row-hash-link"
                  color="seth.primary"
                  fontWeight={ 500 }
                  fontFamily="mono"
                >
                  { item.hash }
                </Link>
                { item.hashFull && <CopyToClipboard text={ item.hashFull } boxSize={ 4 }/> }
              </HStack>
              <Text
                color={ methodTone.text }
                bgColor={ methodTone.bg }
                borderWidth="1px"
                borderColor={ methodTone.border }
                borderRadius="md"
                px={ 2 }
                py={ 1 }
                width="fit-content"
                fontSize="xs"
                fontWeight={ 500 }
              >
                { item.method }
              </Text>
              { item.blockHref ? (
                <Link noIcon href={ item.blockHref } color="seth.primary">{ item.block }</Link>
              ) : (
                <Text color="seth.primary">{ item.block }</Text>
              ) }
              <Text color="gray.400">{ item.age }</Text>
              { item.fromHref ? (
                <Link noIcon href={ item.fromHref } color={ secondaryLinkColor } fontFamily="mono">
                  { item.from }
                </Link>
              ) : (
                <Text color={ secondaryLinkColor } fontFamily="mono">{ item.from }</Text>
              ) }
              { item.toHref ? (
                <Link noIcon href={ item.toHref } color={ secondaryLinkColor } fontFamily="mono">
                  { item.to }
                </Link>
              ) : (
                <Text color={ secondaryLinkColor } fontFamily="mono">{ item.to }</Text>
              ) }
              <Text color="gray.100" fontWeight={ 500 }>{ item.value }</Text>
            </Grid>
            );
          }) }
        </VStack>

        { rows.length === 0 && !isLoading && !isError && (
          <Flex px={ 6 } py={ 6 } justifyContent="center" borderTopWidth="1px" borderTopColor={ borderColor }>
            <Text color="text.secondary" fontSize="sm">No transactions found for the current view.</Text>
          </Flex>
        ) }

        { isError && (
          <Flex px={ 6 } py={ 4 } alignItems="center" justifyContent="space-between" borderTopWidth="1px" borderTopColor={ borderColor }>
            <Text color="red.300" fontSize="sm">{ errorMessage || 'Failed to load transactions data' }</Text>
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

export default React.memo(StrictTransactionsPage);
