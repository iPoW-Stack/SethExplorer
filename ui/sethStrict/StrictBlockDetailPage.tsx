import { Box, Flex, Grid, Text, VStack } from '@chakra-ui/react';
import React from 'react';

import type { BlockQuery } from 'ui/block/useBlockQuery';

import { Button } from 'toolkit/chakra/button';
import { Link } from 'toolkit/chakra/link';
import CopyToClipboard from 'ui/shared/CopyToClipboard';
import IconSvg from 'ui/shared/IconSvg';

import useStrictBlockDetailData from './adapters/useStrictBlockDetailData';

const borderColor = 'rgba(255, 255, 255, 0.08)';

function toRowTestId(label: string) {
  return `strict-block-detail-${ label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }-link`;
}

function getOverviewIcon(label: string) {
  switch (label) {
    case 'Block Height':
      return 'info';
    case 'Timestamp':
      return 'clock';
    case 'Transactions':
      return 'list_view';
    case 'Fee Recipient':
      return 'profile';
    case 'Block Reward':
      return 'tokens';
    case 'Total Difficulty':
      return 'docs';
    case 'Size':
      return 'scope';
    default:
      return 'info';
  }
}

function getGasIcon(label: string) {
  switch (label) {
    case 'Gas Used':
      return 'gas';
    case 'Gas Limit':
      return 'gas_xl';
    case 'Base Fee Per Gas':
      return 'flame';
    case 'Burnt Fees':
      return 'flame';
    default:
      return 'gas';
  }
}

interface Props {
  blockQuery?: BlockQuery;
  heightOrHash?: string;
}

const StrictBlockDetailPage = ({ blockQuery, heightOrHash }: Props) => {
  const { state, title, blockHeight, minedBy, minedByHref, minedAgo, overviewRows, gasRows, refetch } = useStrictBlockDetailData({ blockQuery, heightOrHash });

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
          <Text color="red.200" fontSize="sm">{ state.errorMessage || 'Failed to load block details' }</Text>
          <Button size="xs" variant="subtle" onClick={ () => refetch?.() }>Retry</Button>
        </Flex>
      ) }

      <Box borderBottomWidth="1px" borderBottomColor="seth.border" pb={ 4 } mb={ 5 }>
        <Flex alignItems="center" gap={ 4 }>
          <Flex
            boxSize="48px"
            borderRadius="xl"
            bg="linear-gradient(135deg, #f59e0b 0%, #f97316 100%)"
            alignItems="center"
            justifyContent="center"
          >
            <IconSvg name="block" boxSize={ 6 } color="#111827"/>
          </Flex>
          <Box>
            <Text data-testid="strict-block-detail-title" fontSize="2xl" lineHeight="1.2" fontWeight={ 700 }>
              { title } <Box as="span" color="gray.400">#{ blockHeight }</Box>
            </Text>
            <Text fontSize="sm" color="text.secondary">
              Mined by{ ' ' }
              { minedByHref ? <Link href={ minedByHref } data-testid="strict-block-detail-miner-link" noIcon color="seth.primary">{ minedBy }</Link> : <Box as="span" color="seth.primary">{ minedBy }</Box> }
              { ' - ' }
              { minedAgo }
            </Text>
          </Box>
        </Flex>
      </Box>

      <Box className="seth-panel seth-panel-hover" borderWidth="1px" borderColor={ borderColor } overflow="hidden" mb={ 4 }>
        <Box px={ 6 } py={ 4 } borderBottomWidth="1px" borderBottomColor={ borderColor }>
          <Text fontSize="lg" lineHeight="1.2" fontWeight={ 700 }>Overview</Text>
        </Box>
        <VStack alignItems="stretch" gap={ 0 } px={ 6 } py={ 4 }>
          { overviewRows.map((row, index) => (
            <Grid
              key={ row.label }
              gridTemplateColumns={{ base: '1fr', lg: '240px 1fr' }}
              py={ 2.5 }
              borderTopWidth={ index === 3 ? '1px' : 0 }
              borderTopColor={ borderColor }
            >
              <Flex alignItems="center" gap={ 2 } color="gray.400">
                <IconSvg name={ getOverviewIcon(row.label) } boxSize={ 4 } opacity={ 0.55 }/>
                <Text>{ row.label }</Text>
              </Flex>
              <Flex alignItems="center" gap={ 2 } minW={ 0 }>
                { row.href ? (
                  <Link
                    noIcon
                    href={ row.href }
                    data-testid={ toRowTestId(row.label) }
                    color={ row.accent ? 'seth.primary' : 'gray.100' }
                  >
                    { row.value }
                  </Link>
                ) : (
                  <Text color={ row.accent ? 'seth.primary' : 'gray.100' }>{ row.value }</Text>
                ) }
                { row.copyValue && <CopyToClipboard text={ row.copyValue } boxSize={ 4 }/> }
              </Flex>
            </Grid>
          )) }
        </VStack>
      </Box>

      <Box className="seth-panel seth-panel-soft" borderWidth="1px" borderColor={ borderColor } overflow="hidden">
        <Box px={ 6 } py={ 4 } borderBottomWidth="1px" borderBottomColor={ borderColor }>
          <Text fontSize="lg" lineHeight="1.2" fontWeight={ 700 }>Gas Info</Text>
        </Box>
        <VStack alignItems="stretch" gap={ 0 } px={ 6 } py={ 4 }>
          { gasRows.map((row) => (
            <Grid key={ row.label } gridTemplateColumns={{ base: '1fr', lg: '240px 1fr' }} py={ 2.5 }>
              <Flex alignItems="center" gap={ 2 } color="gray.400">
                <IconSvg name={ getGasIcon(row.label) } boxSize={ 4 } opacity={ 0.55 }/>
                <Text>{ row.label }</Text>
              </Flex>
              <Flex alignItems="center" gap={ 3 }>
                <Text color="gray.100">{ row.value }</Text>
                { row.accent && <Text color="seth.primary" fontSize="sm">{ row.accent }</Text> }
              </Flex>
            </Grid>
          )) }
        </VStack>
      </Box>

    </Box>
  );
};

export default React.memo(StrictBlockDetailPage);
