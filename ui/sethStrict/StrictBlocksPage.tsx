import { Box, Flex, Grid, HStack, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

import type { QueryWithPagesResult } from 'ui/shared/pagination/useQueryWithPages';

import { Alert } from 'toolkit/chakra/alert';
import { Button } from 'toolkit/chakra/button';
import { Link } from 'toolkit/chakra/link';

import useStrictBlocksData from './adapters/useStrictBlocksData';

const borderColor = 'rgba(255, 255, 255, 0.08)';
const headerColor = 'rgba(255, 255, 255, 0.65)';
const secondaryLinkColor = 'rgba(74, 222, 128, 0.82)';

interface Props {
  query?: QueryWithPagesResult<'general:blocks'>;
}

const StrictBlocksPage = ({ query }: Props) => {
  const { rows, isLoading, isError, errorMessage, totalLabel, pagination, refetch } = useStrictBlocksData({ query });
  const [ isLoadingStuck, setIsLoadingStuck ] = React.useState(false);

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
        <Text fontSize="2xl" lineHeight="1.2" fontWeight={ 700 }>Blocks</Text>
      </Box>

      { isLoadingStuck && !isError && (
        <Alert status="warning" mb={ 4 }>
          <Flex alignItems="center" justifyContent="space-between" width="100%" gap={ 4 }>
            <Text fontSize="sm">Loading blocks is taking longer than expected.</Text>
            <Button size="xs" variant="subtle" onClick={ () => refetch?.() }>Retry</Button>
          </Flex>
        </Alert>
      ) }

      <Box className="seth-panel seth-panel-hover" borderWidth="1px" borderColor={ borderColor } overflow="hidden">
        <Flex px={ 6 } py={ 4 } borderBottomWidth="1px" borderBottomColor={ borderColor } alignItems="center" justifyContent="space-between">
          <Text fontSize="sm" color="gray.400">
            { totalLabel }
          </Text>
          <HStack gap={ 2 } alignItems="center">
            <Flex
              as="button"
              data-testid="strict-blocks-prev-page"
              aria-label="Previous blocks page"
              aria-disabled={ !pagination?.canGoPrev }
              boxSize="34px"
              borderWidth="1px"
              borderColor={ borderColor }
              borderRadius="lg"
              alignItems="center"
              justifyContent="center"
              color="gray.400"
              bgColor="rgba(4, 6, 8, 0.75)"
              opacity={ pagination?.canGoPrev ? 1 : 0.5 }
              cursor={ pagination?.canGoPrev ? 'pointer' : 'not-allowed' }
              onClick={ pagination?.canGoPrev ? pagination?.onPrev : undefined }
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
              borderRadius="4px"
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
              borderWidth="1px"
              borderColor={ borderColor }
              borderRadius="lg"
              alignItems="center"
              justifyContent="center"
              color="gray.400"
              bgColor="rgba(4, 6, 8, 0.75)"
              opacity={ pagination?.canGoNext ? 1 : 0.5 }
              cursor={ pagination?.canGoNext ? 'pointer' : 'not-allowed' }
              onClick={ pagination?.canGoNext ? pagination?.onNext : undefined }
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
          bgColor="rgba(255, 255, 255, 0.05)"
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
          { rows.map((item) => (
            <Grid
              key={ item.id }
              px={ 6 }
              py={ 4 }
              borderBottomWidth="1px"
              borderBottomColor={ borderColor }
              gridTemplateColumns="1fr 1fr 0.7fr 1fr 1.4fr 1fr"
              columnGap={ 4 }
              alignItems="center"
              fontSize="sm"
            >
              <Box>
                <Link noIcon href={ item.blockHref } data-testid="strict-blocks-row-block-link" color="seth.primary" fontWeight={ 600 }>{ item.block }</Link>
                { item.poolLabel && <Text mt={ 1 } color="gray.400" fontSize="xs">{ item.poolLabel }</Text> }
              </Box>
              <Text color="gray.400">{ item.age }</Text>
              <Text color="gray.100">{ item.txns }</Text>
              { item.minerHref ? <Link noIcon href={ item.minerHref } color={ secondaryLinkColor }>{ item.miner }</Link> : <Text color={ secondaryLinkColor }>{ item.miner }</Text> }
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
          )) }
        </VStack>

        { rows.length === 0 && !isLoading && !isError && (
          <Flex px={ 6 } py={ 6 } justifyContent="center" borderTopWidth="1px" borderTopColor={ borderColor }>
            <Text color="text.secondary" fontSize="sm">No blocks found for the current view.</Text>
          </Flex>
        ) }

        { isError && (
          <Flex px={ 6 } py={ 4 } alignItems="center" justifyContent="space-between" borderTopWidth="1px" borderTopColor={ borderColor }>
            <Text color="red.300" fontSize="sm">{ errorMessage || 'Failed to load blocks data' }</Text>
            <Button size="xs" variant="subtle" onClick={ () => refetch?.() }>Retry</Button>
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
