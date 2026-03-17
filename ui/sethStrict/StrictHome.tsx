import { Box, Flex, Grid, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { FaBolt, FaCubes, FaEthereum, FaGlobe } from 'react-icons/fa';
import { FaFileLines, FaLayerGroup, FaRightLeft } from 'react-icons/fa6';

import { route } from 'nextjs-routes';

import { Button } from 'toolkit/chakra/button';
import { Link } from 'toolkit/chakra/link';

import useStrictHomeData from './adapters/useStrictHomeData';
import useRowEnterAnimation from './hooks/useRowEnterAnimation';

const cardBorderColor = 'rgba(255, 255, 255, 0.08)';
const rowBorderColor = 'rgba(255, 255, 255, 0.1)';
const secondaryLinkColor = 'rgba(74, 222, 128, 0.82)';

const StrictHome = () => {
  const { state, realtime, stats, blocks, txs } = useStrictHomeData();
  const handleRetry = React.useCallback(() => {
    window.location.reload();
  }, []);
  const blockRowIds = React.useMemo(() => blocks.map((item) => item.id), [blocks]);
  const txRowIds = React.useMemo(() => txs.map((item) => item.id), [txs]);
  const isBlockRowEntering = useRowEnterAnimation(blockRowIds, { durationMs: 1400 });
  const isTxRowEntering = useRowEnterAnimation(txRowIds, { durationMs: 1400 });

  const getTxIcon = (icon?: string) => {
    switch (icon) {
      case 'swap':
        return <FaRightLeft size={14} />;
      case 'layers':
        return <FaLayerGroup size={14} />;
      case 'file':
      default:
        return <FaFileLines size={13} />;
    }
  };

  const getStatIcon = (label: string, color: string) => {
    switch (label) {
      case 'SETH Price':
        return <FaEthereum size={42} color={color} />;
      case 'Market Cap':
        return <FaGlobe size={42} color={color} />;
      case 'Transactions':
        return <FaBolt size={42} color={color} />;
      default:
        return <FaCubes size={42} color={color} />;
    }
  };

  const realtimeStyle = (() => {
    switch (realtime?.status) {
      case 'live':
        return { dot: '#34d399', text: '#d1d5db' };
      case 'lagging':
        return { dot: '#fbbf24', text: '#d1d5db' };
      case 'stalled':
        return { dot: '#f87171', text: '#d1d5db' };
      default:
        return { dot: '#9ca3af', text: '#d1d5db' };
    }
  })();

  return (
    <Box className="seth-page-shell">
      {realtime && (
        <Flex
          data-testid="strict-home-live-head-status"
          mb={3}
          px={3}
          py={1.5}
          borderWidth="1px"
          borderColor="rgba(255, 255, 255, 0.08)"
          borderRadius="full"
          bgColor="rgba(255, 255, 255, 0.03)"
          alignItems="center"
          justifyContent="space-between"
          gap={2}
          maxW="fit-content"
        >
          <Flex alignItems="center" gap={2}>
            <Box
              boxSize="6px"
              borderRadius="full"
              bgColor={realtimeStyle.dot}
              boxShadow={`0 0 6px ${realtimeStyle.dot}`}
              flexShrink={0}
            />
            <Text fontSize="xs" color="gray.300" fontWeight={600}>
              {realtime.label}
            </Text>
          </Flex>
          <Text fontSize="xs" color={realtimeStyle.text}>
            Head {realtime.headHeight ? `#${realtime.headHeight}` : '-'}
            {realtime.lagBlocks !== null ? ` | lag ${realtime.lagBlocks} blocks` : ''}
            {realtime.lagSeconds !== null ? ` | ${realtime.lagSeconds}s` : ''}
          </Text>
        </Flex>
      )}

      {state.isError && (
        <Flex
          mb={4}
          px={4}
          py={3}
          borderWidth="1px"
          borderColor="rgba(239, 68, 68, 0.45)"
          borderRadius="lg"
          bgColor="rgba(127, 29, 29, 0.25)"
          alignItems="center"
          justifyContent="space-between"
          gap={4}
        >
          <Text color="red.200" fontSize="sm">{state.errorMessage || 'Failed to load home data'}</Text>
          <Button size="xs" variant="subtle" onClick={handleRetry}>Retry</Button>
        </Flex>
      )}

      <Grid
        gridTemplateColumns={{ base: '1fr', lg: 'repeat(4, minmax(0, 1fr))' }}
        gap={{ base: 3, lg: 4 }}
      >
        {stats.map((card, index) => (
          <Box
            key={card.label}
            className="seth-panel seth-panel-hover seth-fade-in-up"
            style={{ '--seth-index': index } as React.CSSProperties}
            p={{ base: 4, lg: 5 }}
            borderWidth="1px"
            borderColor={cardBorderColor}
            minH="132px"
            position="relative"
            overflow="hidden"
          >
            <Box position="absolute" top={3} right={3} opacity={0.16}>
              {getStatIcon(card.label, card.iconColor)}
            </Box>
            <Text fontSize="sm" color="text.secondary" mb={1}>
              {card.label}
            </Text>
            <Text fontSize={{ base: '2xl', lg: '3xl' }} lineHeight="1.1" fontWeight={700} mb={1}>
              {card.value}
            </Text>
            <Text fontSize="xs" color={card.label === 'SETH Price' ? 'seth.primary' : 'text.secondary'} letterSpacing="widest">
              {card.subtext}
            </Text>
          </Box>
        ))}
      </Grid>

      <Grid gridTemplateColumns={{ base: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }} gap={6} mt={6}>
        <Box
          className="seth-panel seth-panel-hover seth-fade-in-up"
          style={{ '--seth-index': 4 } as React.CSSProperties}
          borderWidth="1px"
          borderColor={cardBorderColor}
          overflow="hidden"
        >
          <Flex px={5} py={4} borderBottomWidth="1px" borderBottomColor={rowBorderColor} alignItems="center" justifyContent="space-between">
            <Text fontSize="lg" lineHeight="1.2" fontWeight={700}>Latest Blocks</Text>
            <Link
              href={route({ pathname: '/blocks' })}
              noIcon
              data-testid="strict-home-view-all-blocks"
              px={3}
              py={1.5}
              borderWidth="1px"
              borderColor={rowBorderColor}
              borderRadius="full"
              fontSize="xs"
              color="gray.300"
              bgColor="rgba(15, 23, 42, 0.45)"
            >
              View All
            </Link>
          </Flex>
          <VStack alignItems="stretch" gap={0}>
            {blocks.map((item, index) => {
              const isEntering = isBlockRowEntering(item.id);

              return (
              <Flex
                key={item.id}
                className={isEntering ? 'seth-list-enter' : undefined}
                style={isEntering ? { '--seth-index': index } as React.CSSProperties : undefined}
                px={4}
                py={3.5}
                borderBottomWidth="1px"
                borderBottomColor={rowBorderColor}
                gap={3}
                alignItems="center"
              >
                <Flex
                  boxSize="48px"
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor={rowBorderColor}
                  alignItems="center"
                  justifyContent="center"
                  fontWeight={700}
                  color="gray.300"
                  flexShrink={0}
                >
                  BK
                </Flex>
                <Box flex={1} minW={0}>
                  <Flex alignItems="center" justifyContent="space-between" mb={1}>
                    <Box>
                      <Link noIcon href={item.blockHref} color="seth.primary" fontWeight={600}>{item.block}</Link>
                      {item.poolLabel && <Text mt={0.5} fontSize="xs" color="gray.400">{item.poolLabel}</Text>}
                    </Box>
                    <Text color="text.secondary" fontSize="xs">{item.age}</Text>
                  </Flex>
                  <Flex alignItems="center" justifyContent="space-between">
                    <Text fontSize="sm" color="text.secondary">
                      Miner{' '}
                      {item.minerHref ? (
                        <Link href={item.minerHref} noIcon color={secondaryLinkColor}>
                          {item.miner}
                        </Link>
                      ) : (
                        <Box as="span" color={secondaryLinkColor}>{item.miner}</Box>
                      )}
                    </Text>
                    <Text
                      fontSize="xs"
                      color="gray.300"
                      px={2}
                      py={0.5}
                      borderWidth="1px"
                      borderColor={rowBorderColor}
                      borderRadius="md"
                    >
                      {item.txns}
                    </Text>
                  </Flex>
                </Box>
              </Flex>
              );
            })}
            {blocks.length === 0 && (
              <Flex px={4} py={4}>
                <Text fontSize="sm" color="text.secondary">{state.isLoading ? 'Loading latest blocks...' : 'No block data available'}</Text>
              </Flex>
            )}
          </VStack>
        </Box>

        <Box
          className="seth-panel seth-panel-hover seth-fade-in-up"
          style={{ '--seth-index': 5 } as React.CSSProperties}
          borderWidth="1px"
          borderColor={cardBorderColor}
          overflow="hidden"
        >
          <Flex px={5} py={4} borderBottomWidth="1px" borderBottomColor={rowBorderColor} alignItems="center" justifyContent="space-between">
            <Text fontSize="lg" lineHeight="1.2" fontWeight={700}>Latest Transactions</Text>
            <Link
              href={route({ pathname: '/txs' })}
              noIcon
              data-testid="strict-home-view-all-txs"
              px={3}
              py={1.5}
              borderWidth="1px"
              borderColor={rowBorderColor}
              borderRadius="full"
              fontSize="xs"
              color="gray.300"
              bgColor="rgba(15, 23, 42, 0.45)"
            >
              View All
            </Link>
          </Flex>
          <VStack alignItems="stretch" gap={0}>
            {txs.map((item, index) => {
              const isEntering = isTxRowEntering(item.id);

              return (
              <Flex
                key={item.id}
                className={isEntering ? 'seth-list-enter' : undefined}
                style={isEntering ? { '--seth-index': index } as React.CSSProperties : undefined}
                px={4}
                py={3.5}
                borderBottomWidth="1px"
                borderBottomColor={rowBorderColor}
                gap={3}
                alignItems="center"
              >
                <Flex
                  boxSize="48px"
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor={rowBorderColor}
                  alignItems="center"
                  justifyContent="center"
                  color="gray.400"
                  flexShrink={0}
                >
                  {getTxIcon(item.icon)}
                </Flex>
                <Box flex={1} minW={0}>
                  <Flex alignItems="center" justifyContent="space-between" mb={1}>
                    <Link noIcon href={item.txHref} color="seth.primary" fontWeight={600} fontFamily="mono">{item.hash}</Link>
                    <Text color="text.secondary" fontSize="xs">{item.age}</Text>
                  </Flex>
                  <Flex alignItems="center" justifyContent="space-between">
                    <Text fontSize="sm" color="text.secondary">
                      From{' '}
                      {item.fromHref ? (
                        <Link noIcon href={item.fromHref} color={secondaryLinkColor}>
                          {item.from}
                        </Link>
                      ) : (
                        <Box as="span" color={secondaryLinkColor}>{item.from}</Box>
                      )}
                      {' -> '}
                      {item.toHref ? (
                        <Link noIcon href={item.toHref} color={secondaryLinkColor}>
                          {item.to}
                        </Link>
                      ) : (
                        <Box as="span" color={secondaryLinkColor}>{item.to}</Box>
                      )}
                    </Text>
                    <Text
                      fontSize="xs"
                      color="gray.300"
                      px={2}
                      py={0.5}
                      borderWidth="1px"
                      borderColor={rowBorderColor}
                      borderRadius="md"
                    >
                      {item.value}
                    </Text>
                  </Flex>
                </Box>
              </Flex>
              );
            })}
            {txs.length === 0 && (
              <Flex px={4} py={4}>
                <Text fontSize="sm" color="text.secondary">{state.isLoading ? 'Loading latest transactions...' : 'No transaction data available'}</Text>
              </Flex>
            )}
          </VStack>
        </Box>
      </Grid>
    </Box>
  );
};

export default React.memo(StrictHome);
