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

function getStatusPresentation(value: string) {
  switch (value.toLowerCase()) {
    case 'success':
      return {
        icon: 'status/success' as const,
        bg: 'rgba(0, 255, 148, 0.12)',
        border: 'rgba(0, 255, 148, 0.35)',
        color: '#86efac',
        testId: 'strict-tx-status-success',
      };
    case 'failed':
      return {
        icon: 'status/error' as const,
        bg: 'rgba(255, 77, 77, 0.12)',
        border: 'rgba(255, 77, 77, 0.35)',
        color: '#fca5a5',
        testId: 'strict-tx-status-failed',
      };
    default:
      return {
        icon: 'status/pending' as const,
        bg: 'rgba(245, 158, 11, 0.14)',
        border: 'rgba(245, 158, 11, 0.35)',
        color: '#fcd34d',
        testId: 'strict-tx-status-pending',
      };
  }
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
  const { state, title, overviewRows, gasRows, refetch } = useStrictTransactionDetailData({ txQuery, hash });
  const coreRows = overviewRows.filter((row) => [ 'Transaction Hash', 'Status', 'Block', 'Timestamp' ].includes(row.label));
  const transferRows = overviewRows.filter((row) => [ 'From', 'To', 'Value', 'Transaction Fee' ].includes(row.label));

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

      <Box
        className="seth-panel seth-panel-hover seth-fade-in-up"
        style={{ '--seth-index': 0 } as React.CSSProperties}
        borderWidth="1px"
        borderColor={ borderColor }
        overflow="hidden"
      >
        <Box px={ 6 } py={ 4 } borderBottomWidth="1px" borderBottomColor={ borderColor }>
          <Text fontSize="lg" lineHeight="1.2" fontWeight={ 700 }>Overview</Text>
        </Box>
        <VStack alignItems="stretch" gap={ 0 } px={ 6 } py={ 4 }>
          <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wider" mb={ 1 }>
            Core Info
          </Text>
          { coreRows.map((row) => (
            <Grid
              key={ row.label }
              gridTemplateColumns={{ base: '1fr', lg: '240px 1fr' }}
              py={ 2.5 }
            >
              <Flex alignItems="center" gap={ 2 } color="gray.400">
                <IconSvg name={ getRowIcon(row.label) } boxSize={ 4 } opacity={ 0.55 } transform={ row.label === 'To' ? 'rotate(180deg)' : undefined }/>
                <Text>{ row.label }</Text>
              </Flex>
              <Box>
                { row.isStatus ? (
                  (() => {
                    const status = getStatusPresentation(row.value);
                    return (
                      <HStack
                        data-testid={ status.testId }
                        w="fit-content"
                        px={ 3 }
                        py={ 1.5 }
                        borderRadius="full"
                        bgColor={ status.bg }
                        borderWidth="1px"
                        borderColor={ status.border }
                        color={ status.color }
                        fontWeight={ 600 }
                        gap={ 1.5 }
                      >
                        <IconSvg
                          name={ status.icon }
                          boxSize={ 3.5 }
                          color={ status.color }
                          animation={ status.icon === 'status/pending' ? 'sethBadgePulse 1.8s ease-in-out infinite' : undefined }
                        />
                        <Text>{ row.value }</Text>
                      </HStack>
                    );
                  })()
                ) : (
                  <Flex alignItems="center" gap={ 2 } flexWrap="wrap">
                    { renderValue(row) }
                  </Flex>
                ) }
              </Box>
            </Grid>
          )) }

          { transferRows.length > 0 && (
            <>
              <Box borderTopWidth="1px" borderTopColor="seth.border" my={ 3 }/>
              <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wider" mb={ 1 }>
                Transfer Info
              </Text>
              { transferRows.map((row) => (
                <Grid
                  key={ row.label }
                  gridTemplateColumns={{ base: '1fr', lg: '240px 1fr' }}
                  py={ 2.5 }
                >
                  <Flex alignItems="center" gap={ 2 } color="gray.400">
                    <IconSvg name={ getRowIcon(row.label) } boxSize={ 4 } opacity={ 0.55 } transform={ row.label === 'To' ? 'rotate(180deg)' : undefined }/>
                    <Text>{ row.label }</Text>
                  </Flex>
                  <Box>
                    <Flex alignItems="center" gap={ 2 } flexWrap="wrap">
                      { renderValue(row) }
                    </Flex>
                  </Box>
                </Grid>
              )) }
            </>
          ) }

          { gasRows.length > 0 && (
            <>
              <Box borderTopWidth="1px" borderTopColor="seth.border" my={ 3 }/>
              <Box as="details" data-testid="strict-tx-gas-details">
                <Box
                  as="summary"
                  cursor="pointer"
                  color="gray.300"
                  fontSize="sm"
                  fontWeight={ 500 }
                  _marker={{ color: 'seth.primary' }}
                >
                  Gas Details
                </Box>
                <VStack alignItems="stretch" gap={ 0 } mt={ 2 }>
                  { gasRows.map((row) => (
                    <Grid
                      key={ row.label }
                      gridTemplateColumns={{ base: '1fr', lg: '240px 1fr' }}
                      py={ 2 }
                    >
                      <Text color="gray.400">{ row.label }</Text>
                      <Text color="gray.100">{ row.value }</Text>
                    </Grid>
                  )) }
                </VStack>
              </Box>
            </>
          ) }
        </VStack>
      </Box>
    </Box>
  );
};

export default React.memo(StrictTransactionDetailPage);
