import { Box, Flex, Grid, HStack, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { FaEthereum } from 'react-icons/fa';

import type { TxQuery } from 'ui/tx/useTxQuery';

import { Button } from 'toolkit/chakra/button';
import { Link } from 'toolkit/chakra/link';
import CopyToClipboard from 'ui/shared/CopyToClipboard';
import IconSvg from 'ui/shared/IconSvg';

import useStrictTransactionDetailData from './adapters/useStrictTransactionDetailData';

const borderColor = 'rgba(255, 255, 255, 0.08)';

function getRowIcon(label: string) {
  switch (label) {
    case 'Transaction Hash':
      return 'info';
    case 'Status':
      return 'status/success';
    case 'Block':
      return 'block';
    case 'Timestamp':
      return 'clock';
    case 'From':
      return 'arrows/east';
    case 'To':
      return 'arrows/east';
    case 'Value':
      return 'tokens';
    case 'Transaction Fee':
      return 'coins/bitcoin';
    default:
      return 'info';
  }
}

function rowLinkTestId(label: string) {
  return `strict-tx-detail-${ label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }-link`;
}

function renderValue(row: { label: string; value: string; suffix?: string; isChip?: boolean; href?: string; copyValue?: string }) {
  if (row.label === 'Block') {
    return (
      <>
        { row.href ? (
          <Link noIcon href={ row.href } data-testid={ rowLinkTestId(row.label) } color="seth.primary" fontWeight={ 700 }>
            { row.value }
          </Link>
        ) : <Text color="seth.primary" fontWeight={ 700 }>{ row.value }</Text> }
        { row.suffix && (
          <Text
            px={ 2 }
            py={ 1 }
            borderRadius="md"
            borderWidth="1px"
            borderColor="rgba(75, 85, 99, 0.8)"
            bgColor="rgba(55, 65, 81, 0.45)"
            color="gray.400"
            fontSize="xs"
          >
            { row.suffix }
          </Text>
        ) }
      </>
    );
  }

  if (row.isChip) {
    return (
      <HStack
        px={ 3 }
        py={ 1.5 }
        borderRadius="md"
        borderWidth="1px"
        borderColor="rgba(75, 85, 99, 0.8)"
        bgColor="rgba(31, 41, 55, 0.65)"
        color="gray.100"
        w="fit-content"
        gap={ 2 }
      >
        <FaEthereum size={ 14 } color="#9ca3af"/>
        <Text>{ row.value }</Text>
      </HStack>
    );
  }

  const isAddress = row.label === 'From' || row.label === 'To';

  const textNode = row.href ?
    <Link noIcon href={ row.href } data-testid={ rowLinkTestId(row.label) } color={ isAddress ? 'seth.primary' : 'gray.100' }>{ row.value }</Link> :
    <Text color={ isAddress ? 'seth.primary' : 'gray.100' }>{ row.value }</Text>;

  return (
    <Flex alignItems="center" gap={ 2 }>
      { textNode }
      { row.copyValue && <CopyToClipboard text={ row.copyValue } boxSize={ 4 }/> }
    </Flex>
  );
}

interface Props {
  txQuery?: TxQuery;
  hash?: string;
}

const StrictTransactionDetailPage = ({ txQuery, hash }: Props) => {
  const { state, title, overviewRows, refetch } = useStrictTransactionDetailData({ txQuery, hash });

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
          <Text color="red.200" fontSize="sm">{ state.errorMessage || 'Failed to load transaction details' }</Text>
          <Button size="xs" variant="subtle" onClick={ () => refetch?.() }>Retry</Button>
        </Flex>
      ) }

      <Box borderBottomWidth="1px" borderBottomColor="seth.border" pb={ 4 } mb={ 5 }>
        <Text data-testid="strict-tx-detail-title" fontSize="2xl" lineHeight="1.2" fontWeight={ 700 }>{ title }</Text>
      </Box>

      <Box className="seth-panel seth-panel-hover" borderWidth="1px" borderColor={ borderColor } overflow="hidden">
        <Box px={ 6 } py={ 4 } borderBottomWidth="1px" borderBottomColor={ borderColor }>
          <Text fontSize="lg" lineHeight="1.2" fontWeight={ 700 }>Overview</Text>
        </Box>
        <VStack alignItems="stretch" gap={ 0 } px={ 6 } py={ 4 }>
          { overviewRows.map((row, index) => (
            <Grid
              key={ row.label }
              gridTemplateColumns={{ base: '1fr', lg: '240px 1fr' }}
              py={ 2.5 }
              borderTopWidth={ index === 4 || index === 6 ? '1px' : 0 }
              borderTopColor={ borderColor }
            >
              <Flex alignItems="center" gap={ 2 } color="gray.400">
                <IconSvg name={ getRowIcon(row.label) } boxSize={ 4 } opacity={ 0.55 } transform={ row.label === 'To' ? 'rotate(180deg)' : undefined }/>
                <Text>{ row.label }</Text>
              </Flex>
              <Box>
                { row.isStatus ? (
                  <HStack
                    w="fit-content"
                    px={ 3 }
                    py={ 1.5 }
                    borderRadius="full"
                    bgColor="rgba(34, 197, 94, 0.2)"
                    borderWidth="1px"
                    borderColor="rgba(34, 197, 94, 0.35)"
                    color="#dcfce7"
                    fontWeight={ 500 }
                  >
                    <Box boxSize={ 2 } borderRadius="full" bgColor="#86efac"/>
                    <Text>{ row.value }</Text>
                  </HStack>
                ) : (
                  <Flex alignItems="center" gap={ 2 } flexWrap="wrap">
                    { renderValue(row) }
                  </Flex>
                ) }
              </Box>
            </Grid>
          )) }
        </VStack>
      </Box>
    </Box>
  );
};

export default React.memo(StrictTransactionDetailPage);
