import { Box, Flex, Grid, HStack, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { FaEthereum } from 'react-icons/fa';
import { FaCoins, FaUser, FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

import type { AddressQuery } from 'ui/address/utils/useAddressQuery';

import { Button } from 'toolkit/chakra/button';
import { Link } from 'toolkit/chakra/link';
import CopyToClipboard from 'ui/shared/CopyToClipboard';
import IconSvg from 'ui/shared/IconSvg';

import useStrictAddressData from './adapters/useStrictAddressData';

const borderColor = 'rgba(255, 255, 255, 0.08)';
const secondaryLinkColor = 'rgba(74, 222, 128, 0.82)';

interface Props {
  hash: string;
  addressQuery?: AddressQuery;
}

const StrictAddressPage = ({ hash, addressQuery }: Props) => {
  const {
    state,
    titleHash,
    rawHash,
    balanceLabel,
    balanceUsdLabel,
    holdingsLabel,
    holdingsHintLabel,
    txRows,
    pagination,
    refetch,
  } = useStrictAddressData({ hash, addressQuery });

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
          <Text color="red.200" fontSize="sm">{ state.errorMessage || 'Failed to load address data' }</Text>
          <Button size="xs" variant="subtle" onClick={ () => refetch?.() }>Retry</Button>
        </Flex>
      ) }

      <Box borderBottomWidth="1px" borderBottomColor="seth.border" pb={ 4 } mb={ 5 }>
        <Flex alignItems="center" gap={ 4 }>
          <Flex
            boxSize="48px"
            borderRadius="xl"
            bg="linear-gradient(135deg, #00ffa3 0%, #059669 100%)"
            alignItems="center"
            justifyContent="center"
            color="#041018"
          >
            <FaUser size={ 18 }/>
          </Flex>
          <Flex alignItems="center" gap={ 2 } flexWrap="wrap">
            <Text data-testid="strict-address-title" fontSize="2xl" lineHeight="1.2" fontWeight={ 700 }>
              Address <Box as="span" color="gray.400" fontFamily="mono" fontSize="lg">{ titleHash }</Box>
            </Text>
            { rawHash && <CopyToClipboard text={ rawHash } boxSize={ 5 } ml={ 0 }/> }
          </Flex>
        </Flex>
      </Box>

      <Grid gridTemplateColumns={{ base: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }} gap={ 6 } mb={ 6 }>
        <Box className="seth-panel seth-panel-hover" p={ 6 } borderWidth="1px" borderColor={ borderColor } position="relative" overflow="hidden">
          <Text color="gray.300" mb={ 2 }>ETH Balance</Text>
          <Text fontSize="3xl" lineHeight="1.1" fontWeight={ 700 } mb={ 2 }>{ balanceLabel }</Text>
          <Text color="gray.300">{ balanceUsdLabel }</Text>
          <Box position="absolute" right={ 5 } top={ 5 } opacity={ 0.12 } color="white">
            <FaEthereum size={ 56 }/>
          </Box>
        </Box>

        <Box className="seth-panel seth-panel-hover" p={ 6 } borderWidth="1px" borderColor={ borderColor } position="relative" overflow="hidden">
          <Text color="gray.300" mb={ 2 }>Token Holdings</Text>
          <Text fontSize="3xl" lineHeight="1.1" fontWeight={ 700 } mb={ 3 }>{ holdingsLabel }</Text>
          <Flex
            px={ 3 }
            py={ 1.5 }
            borderWidth="1px"
            borderColor={ borderColor }
            borderRadius="lg"
            width="fit-content"
            alignItems="center"
            gap={ 2 }
            bgColor="rgba(4, 6, 8, 0.55)"
          >
            <Flex boxSize={ 4 } borderRadius="full" bgColor="seth.primary" color="black" alignItems="center" justifyContent="center" fontSize="8px" fontWeight={ 700 }>
              T
            </Flex>
            <Text color="gray.100">{ holdingsHintLabel }</Text>
            <IconSvg name="arrows/east-mini" boxSize={ 3 } transform="rotate(90deg)" color="gray.500"/>
          </Flex>
          <Box position="absolute" right={ 5 } top={ 5 } opacity={ 0.12 } color="#eab308">
            <FaCoins size={ 56 }/>
          </Box>
        </Box>
      </Grid>

      <HStack gap={ 0 } px={ 0 } mb={ 6 } borderBottomWidth="1px" borderBottomColor={ borderColor }>
        <Text px={ 4 } py={ 2 } color="seth.primary" fontWeight={ 500 } fontSize="sm" borderBottomWidth="2px" borderBottomColor="seth.primary">Transactions</Text>
        <Text px={ 4 } py={ 2 } color="gray.400" fontWeight={ 500 } fontSize="sm">Internal Txs</Text>
        <Text px={ 4 } py={ 2 } color="gray.400" fontWeight={ 500 } fontSize="sm">Token Transfers</Text>
        <Text px={ 4 } py={ 2 } color="gray.400" fontWeight={ 500 } fontSize="sm">Analytics</Text>
      </HStack>

      <Box className="seth-panel seth-panel-hover" borderWidth="1px" borderColor={ borderColor } overflow="hidden">
        <Grid
          px={ 5 }
          py={ 3 }
          borderBottomWidth="1px"
          borderBottomColor={ borderColor }
          bgColor="rgba(255, 255, 255, 0.05)"
          gridTemplateColumns="1fr 0.78fr 0.62fr 0.74fr 0.8fr 0.8fr 0.68fr 0.62fr"
          columnGap={ 3 }
          fontSize="xs"
          letterSpacing="wider"
          color="rgba(255, 255, 255, 0.65)"
        >
          <Text>TXN HASH</Text>
          <Text>METHOD</Text>
          <Text>BLOCK</Text>
          <Text>AGE</Text>
          <Text>FROM</Text>
          <Text>TO</Text>
          <Text>VALUE</Text>
          <Text>TXN FEE</Text>
        </Grid>

        <VStack alignItems="stretch" gap={ 0 }>
          { txRows.map((row) => (
            <Grid
              key={ row.id }
              px={ 5 }
              py={ 4 }
              borderBottomWidth="1px"
              borderBottomColor={ borderColor }
              gridTemplateColumns="1fr 0.78fr 0.62fr 0.74fr 0.8fr 0.8fr 0.68fr 0.62fr"
              columnGap={ 3 }
              alignItems="center"
              fontSize="sm"
            >
              <Link noIcon href={ row.txHref } data-testid="strict-address-row-hash-link" color="seth.primary" fontWeight={ 500 } fontFamily="mono">{ row.hash }</Link>
              <Text
                color="gray.200"
                bgColor="rgba(31, 41, 55, 0.65)"
                borderWidth="1px"
                borderColor="rgba(75, 85, 99, 0.8)"
                borderRadius="md"
                px={ 2 }
                py={ 1 }
                width="fit-content"
                fontSize="xs"
                fontWeight={ 500 }
              >
                { row.method }
              </Text>
              { row.blockHref ? <Link noIcon href={ row.blockHref } color={ secondaryLinkColor }>{ row.block }</Link> : <Text color={ secondaryLinkColor }>{ row.block }</Text> }
              <Text color="gray.400">{ row.age }</Text>
              <HStack gap={ 2 }>
                { row.fromYou ? (
                  <Text
                    px={ 2 }
                    py={ 0.5 }
                    borderRadius="md"
                    bgColor="rgba(0, 255, 163, 0.2)"
                    borderWidth="1px"
                    borderColor="rgba(0, 255, 163, 0.3)"
                    color="seth.primary"
                    fontFamily="mono"
                  >
                    { row.from }
                  </Text>
                ) : (
                  row.fromHref ? <Link noIcon href={ row.fromHref } color={ secondaryLinkColor } fontFamily="mono">{ row.from }</Link> : <Text color={ secondaryLinkColor } fontFamily="mono">{ row.from }</Text>
                ) }
                { row.fromYou && <Text color="gray.500" fontSize="xs">(You)</Text> }
              </HStack>
              <HStack gap={ 2 }>
                { row.toYou ? (
                  <Text
                    px={ 2 }
                    py={ 0.5 }
                    borderRadius="md"
                    bgColor="rgba(0, 255, 163, 0.2)"
                    borderWidth="1px"
                    borderColor="rgba(0, 255, 163, 0.3)"
                    color="seth.primary"
                    fontFamily="mono"
                  >
                    { row.to }
                  </Text>
                ) : (
                  row.toHref ? <Link noIcon href={ row.toHref } color={ secondaryLinkColor } fontFamily="mono">{ row.to }</Link> : <Text color={ secondaryLinkColor } fontFamily="mono">{ row.to }</Text>
                ) }
                { row.toYou && <Text color="gray.500" fontSize="xs">(You)</Text> }
              </HStack>
              <Text color="gray.100" fontWeight={ 500 }>{ row.value }</Text>
              <Text color="gray.400" fontSize="xs">{ row.fee }</Text>
            </Grid>
          )) }
        </VStack>
      </Box>

      { pagination && (
        <Flex mt={ 4 } alignItems="center" justifyContent="flex-end" gap={ 3 }>
          <Flex
            as="button"
            data-testid="strict-address-prev-page"
            aria-label="Previous address transactions page"
            aria-disabled={ !pagination.canGoPrev }
            boxSize="34px"
            borderWidth="1px"
            borderColor={ borderColor }
            borderRadius="lg"
            alignItems="center"
            justifyContent="center"
            color="gray.400"
            bgColor="rgba(4, 6, 8, 0.75)"
            opacity={ pagination.canGoPrev ? 1 : 0.5 }
            cursor={ pagination.canGoPrev ? 'pointer' : 'not-allowed' }
            onClick={ pagination.canGoPrev ? pagination.onPrev : undefined }
          >
            <FaChevronLeft size={ 11 }/>
          </Flex>
          <Text data-testid="strict-address-page-label" color="gray.300" fontSize="sm">{ pagination.pageLabel }</Text>
          <Flex
            as="button"
            data-testid="strict-address-next-page"
            aria-label="Next address transactions page"
            aria-disabled={ !pagination.canGoNext }
            boxSize="34px"
            borderWidth="1px"
            borderColor={ borderColor }
            borderRadius="lg"
            alignItems="center"
            justifyContent="center"
            color="gray.400"
            bgColor="rgba(4, 6, 8, 0.75)"
            opacity={ pagination.canGoNext ? 1 : 0.5 }
            cursor={ pagination.canGoNext ? 'pointer' : 'not-allowed' }
            onClick={ pagination.canGoNext ? pagination.onNext : undefined }
          >
            <FaChevronRight size={ 11 }/>
          </Flex>
        </Flex>
      ) }
    </Box>
  );
};

export default React.memo(StrictAddressPage);
