import { Box, Flex, Grid, HStack, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

import type { QueryWithPagesResult } from 'ui/shared/pagination/useQueryWithPages';

import { Alert } from 'toolkit/chakra/alert';
import { Button } from 'toolkit/chakra/button';
import { Link } from 'toolkit/chakra/link';

import useStrictTransactionsData from './adapters/useStrictTransactionsData';

const borderColor = 'rgba(255, 255, 255, 0.08)';
const headerColor = 'rgba(255, 255, 255, 0.65)';

interface Props {
  query?: QueryWithPagesResult<'general:txs_validated'>;
}

const StrictTransactionsPage = ({ query }: Props) => {
  const { rows, isLoading, isError, errorMessage, totalLabel, pagination, refetch } = useStrictTransactionsData({ query });
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
        <Text fontSize="2xl" lineHeight="1.2" fontWeight={ 700 }>Transactions</Text>
      </Box>

      { isLoadingStuck && !isError && (
        <Alert status="warning" mb={ 4 }>
          <Flex alignItems="center" justifyContent="space-between" width="100%" gap={ 4 }>
            <Text fontSize="sm">Loading transactions is taking longer than expected.</Text>
            <Button size="xs" variant="subtle" onClick={ () => refetch?.() }>Retry</Button>
          </Flex>
        </Alert>
      ) }

      <Box className="seth-panel seth-panel-hover" borderWidth="1px" borderColor={ borderColor } overflow="hidden">
        <Flex px={ 6 } py={ 4 } borderBottomWidth="1px" borderBottomColor={ borderColor } alignItems="center" justifyContent="space-between">
          <Text fontSize="sm" color="gray.400">
            { totalLabel }
          </Text>
          <HStack gap={ 2 }>
            <Flex
              as="button"
              data-testid="strict-txs-prev-page"
              aria-label="Previous transactions page"
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
              data-testid="strict-txs-page-label"
              minW="108px"
              px={ 4 }
              py={ 2 }
              borderWidth="1px"
              borderColor="rgba(100, 116, 139, 0.55)"
              borderRadius="lg"
              bgColor="rgba(4, 6, 8, 0.75)"
              color="gray.300"
              fontSize="sm"
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
          { rows.map((item) => (
            <Grid
              key={ item.id }
              px={ 6 }
              py={ 4 }
              borderBottomWidth="1px"
              borderBottomColor={ borderColor }
              gridTemplateColumns="1.2fr 0.9fr 0.8fr 0.9fr 0.9fr 0.9fr 0.8fr"
              columnGap={ 4 }
              alignItems="center"
              fontSize="sm"
            >
              <Link noIcon href={ item.txHref } data-testid="strict-txs-row-hash-link" color="seth.primary" fontWeight={ 500 }>{ item.hash }</Link>
              <Text
                color={ item.methodTone === 'green' ? '#dcfce7' : '#d1d5db' }
                bgColor={ item.methodTone === 'green' ? 'rgba(20, 83, 45, 0.45)' : 'rgba(31, 41, 55, 0.65)' }
                borderWidth="1px"
                borderColor={ item.methodTone === 'green' ? 'rgba(21, 128, 61, 0.5)' : 'rgba(75, 85, 99, 0.8)' }
                borderRadius="md"
                px={ 2 }
                py={ 1 }
                width="fit-content"
                fontSize="xs"
                fontWeight={ 500 }
              >
                { item.method }
              </Text>
              { item.blockHref ? <Link noIcon href={ item.blockHref } color="seth.primary">{ item.block }</Link> : <Text color="seth.primary">{ item.block }</Text> }
              <Text color="gray.400">{ item.age }</Text>
              { item.fromHref ? <Link noIcon href={ item.fromHref } color="seth.primary">{ item.from }</Link> : <Text color="seth.primary">{ item.from }</Text> }
              { item.toHref ? <Link noIcon href={ item.toHref } color="seth.primary">{ item.to }</Link> : <Text color="seth.primary">{ item.to }</Text> }
              <Text color="gray.100" fontWeight={ 500 }>{ item.value }</Text>
            </Grid>
          )) }
        </VStack>

        { rows.length === 0 && !isLoading && !isError && (
          <Flex px={ 6 } py={ 6 } justifyContent="center" borderTopWidth="1px" borderTopColor={ borderColor }>
            <Text color="text.secondary" fontSize="sm">No transactions found for the current view.</Text>
          </Flex>
        ) }

        { isError && (
          <Flex px={ 6 } py={ 4 } alignItems="center" justifyContent="space-between" borderTopWidth="1px" borderTopColor={ borderColor }>
            <Text color="red.300" fontSize="sm">{ errorMessage || 'Failed to load transactions data' }</Text>
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

export default React.memo(StrictTransactionsPage);
