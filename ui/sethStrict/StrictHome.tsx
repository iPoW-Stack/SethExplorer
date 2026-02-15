import { Box, Flex, Grid, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { FaFileLines, FaLayerGroup, FaRightLeft } from 'react-icons/fa6';

import { route } from 'nextjs-routes';

import { Button } from 'toolkit/chakra/button';
import { Link } from 'toolkit/chakra/link';
import IconSvg from 'ui/shared/IconSvg';

import useStrictHomeData from './adapters/useStrictHomeData';

const cardBorderColor = 'rgba(255, 255, 255, 0.06)';
const rowBorderColor = 'rgba(255, 255, 255, 0.08)';

const StrictHome = () => {
  const { state, stats, blocks, txs } = useStrictHomeData();

  const getTxIcon = (icon?: string) => {
    switch (icon) {
      case 'swap':
        return <FaRightLeft size={ 14 }/>;
      case 'layers':
        return <FaLayerGroup size={ 14 }/>;
      case 'file':
      default:
        return <FaFileLines size={ 13 }/>;
    }
  };

  return (
    <Box className="seth-page-shell">
      { state.isError && (
        <Flex
          mb={ 4 }
          px={ 4 }
          py={ 3 }
          borderWidth="1px"
          borderColor="rgba(239, 68, 68, 0.45)"
          borderRadius="lg"
          bgColor="rgba(127, 29, 29, 0.25)"
          alignItems="center"
          justifyContent="space-between"
          gap={ 4 }
        >
          <Text color="red.200" fontSize="sm">{ state.errorMessage || 'Failed to load home data' }</Text>
          <Button size="xs" variant="subtle" onClick={ () => window.location.reload() }>Retry</Button>
        </Flex>
      ) }

      <Grid
        gridTemplateColumns={{ base: '1fr', lg: 'repeat(4, minmax(0, 1fr))' }}
        gap={{ base: 3, lg: 4 }}
      >
        { stats.map((card) => (
          <Box
            key={ card.label }
            className="seth-panel seth-panel-hover"
            p={{ base: 4, lg: 5 }}
            borderWidth="1px"
            borderColor={ cardBorderColor }
            minH="122px"
            position="relative"
            overflow="hidden"
          >
            <IconSvg
              name={ card.icon }
              boxSize="48px"
              position="absolute"
              top={ 3 }
              right={ 3 }
              color={ card.iconColor }
              opacity={ 0.2 }
            />
            <Text fontSize="sm" color="text.secondary" mb={ 1 }>
              { card.label }
            </Text>
            <Text fontSize="2xl" lineHeight="1.1" fontWeight={ 700 } mb={ 1 }>
              { card.value }
            </Text>
            <Text fontSize="xs" color={ card.label === 'SETH Price' ? 'seth.primary' : 'text.secondary' } letterSpacing="widest">
              { card.subtext }
            </Text>
          </Box>
        )) }
      </Grid>

      <Grid gridTemplateColumns={{ base: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }} gap={ 6 } mt={ 6 }>
        <Box className="seth-panel seth-panel-hover" borderWidth="1px" borderColor={ cardBorderColor } overflow="hidden">
          <Flex px={ 5 } py={ 4 } borderBottomWidth="1px" borderBottomColor={ rowBorderColor } alignItems="center" justifyContent="space-between">
            <Text fontSize="lg" lineHeight="1.2" fontWeight={ 700 }>Latest Blocks</Text>
            <Link
              href={ route({ pathname: '/blocks' }) }
              noIcon
              data-testid="strict-home-view-all-blocks"
              px={ 3 }
              py={ 1.5 }
              borderWidth="1px"
              borderColor={ rowBorderColor }
              borderRadius="md"
              fontSize="xs"
              color="text.secondary"
            >
              View All
            </Link>
          </Flex>
          <VStack alignItems="stretch" gap={ 0 }>
            { blocks.map((item) => (
              <Flex key={ item.id } px={ 4 } py={ 3.5 } borderBottomWidth="1px" borderBottomColor={ rowBorderColor } gap={ 3 } alignItems="center">
                <Flex
                  boxSize="48px"
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={ rowBorderColor }
                  alignItems="center"
                  justifyContent="center"
                  fontWeight={ 700 }
                  color="gray.300"
                  flexShrink={ 0 }
                >
                  BK
                </Flex>
                <Box flex={ 1 } minW={ 0 }>
                  <Flex alignItems="center" justifyContent="space-between" mb={ 1 }>
                    <Link noIcon href={ item.blockHref } color="seth.primary" fontWeight={ 700 }>{ item.block }</Link>
                    <Text color="text.secondary" fontSize="xs">{ item.age }</Text>
                  </Flex>
                  <Flex alignItems="center" justifyContent="space-between">
                    <Text fontSize="sm" color="text.secondary">
                      Miner{ ' ' }
                      { item.minerHref ? <Link href={ item.minerHref } noIcon color="seth.primary">{ item.miner }</Link> : <Box as="span" color="seth.primary">{ item.miner }</Box> }
                    </Text>
                    <Text
                      fontSize="xs"
                      color="gray.300"
                      px={ 2 }
                      py={ 0.5 }
                      borderWidth="1px"
                      borderColor={ rowBorderColor }
                      borderRadius="md"
                    >
                      { item.txns }
                    </Text>
                  </Flex>
                </Box>
              </Flex>
            )) }
          </VStack>
        </Box>

        <Box className="seth-panel seth-panel-hover" borderWidth="1px" borderColor={ cardBorderColor } overflow="hidden">
          <Flex px={ 5 } py={ 4 } borderBottomWidth="1px" borderBottomColor={ rowBorderColor } alignItems="center" justifyContent="space-between">
            <Text fontSize="lg" lineHeight="1.2" fontWeight={ 700 }>Latest Transactions</Text>
            <Link
              href={ route({ pathname: '/txs' }) }
              noIcon
              data-testid="strict-home-view-all-txs"
              px={ 3 }
              py={ 1.5 }
              borderWidth="1px"
              borderColor={ rowBorderColor }
              borderRadius="md"
              fontSize="xs"
              color="text.secondary"
            >
              View All
            </Link>
          </Flex>
          <VStack alignItems="stretch" gap={ 0 }>
            { txs.map((item) => (
              <Flex key={ item.id } px={ 4 } py={ 3.5 } borderBottomWidth="1px" borderBottomColor={ rowBorderColor } gap={ 3 } alignItems="center">
                <Flex
                  boxSize="48px"
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={ rowBorderColor }
                  alignItems="center"
                  justifyContent="center"
                  color="gray.400"
                  flexShrink={ 0 }
                >
                  { getTxIcon(item.icon) }
                </Flex>
                <Box flex={ 1 } minW={ 0 }>
                  <Flex alignItems="center" justifyContent="space-between" mb={ 1 }>
                    <Link noIcon href={ item.txHref } color="seth.primary" fontWeight={ 700 }>{ item.hash }</Link>
                    <Text color="text.secondary" fontSize="xs">{ item.age }</Text>
                  </Flex>
                  <Flex alignItems="center" justifyContent="space-between">
                    <Text fontSize="sm" color="text.secondary">
                      From{ ' ' }
                      { item.fromHref ? <Link noIcon href={ item.fromHref } color="seth.primary">{ item.from }</Link> : <Box as="span" color="seth.primary">{ item.from }</Box> }
                      { ' -> ' }
                      { item.toHref ? <Link noIcon href={ item.toHref } color="seth.primary">{ item.to }</Link> : <Box as="span" color="seth.primary">{ item.to }</Box> }
                    </Text>
                    <Text
                      fontSize="xs"
                      color="gray.300"
                      px={ 2 }
                      py={ 0.5 }
                      borderWidth="1px"
                      borderColor={ rowBorderColor }
                      borderRadius="md"
                    >
                      { item.value }
                    </Text>
                  </Flex>
                </Box>
              </Flex>
            )) }
          </VStack>
        </Box>
      </Grid>
    </Box>
  );
};

export default React.memo(StrictHome);
