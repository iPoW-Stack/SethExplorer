import { Box, Grid, Text } from '@chakra-ui/react';
import BigNumber from 'bignumber.js';
import React from 'react';

import config from 'configs/app';
import useApiQuery from 'lib/api/useApiQuery';
import { HOMEPAGE_STATS, HOMEPAGE_STATS_MICROSERVICE } from 'stubs/stats';
import GasInfoTooltip from 'ui/shared/gas/GasInfoTooltip';
import GasPrice from 'ui/shared/gas/GasPrice';
import IconSvg from 'ui/shared/IconSvg';
import StatsWidget from 'ui/shared/stats/StatsWidget';
import { WEI } from 'ui/shared/value/utils';

import type { HomeStatsItem } from './utils';
import { isHomeStatsItemEnabled, sortHomeStatsItems } from './utils';

const rollupFeature = config.features.rollup;
const isOptimisticRollup = rollupFeature.isEnabled && rollupFeature.type === 'optimistic';
const isArbitrumRollup = rollupFeature.isEnabled && rollupFeature.type === 'arbitrum';
const isStatsFeatureEnabled = config.features.stats.isEnabled;
const isSethCompact = config.UI.colorTheme.default?.id === 'seth';

const Stats = () => {
  const [ hasGasTracker, setHasGasTracker ] = React.useState(config.features.gasTracker.isEnabled);

  // data from stats microservice is prioritized over data from stats api
  const statsQuery = useApiQuery('stats:pages_main', {
    queryOptions: {
      refetchOnMount: false,
      placeholderData: isStatsFeatureEnabled ? HOMEPAGE_STATS_MICROSERVICE : undefined,
      enabled: isStatsFeatureEnabled,
    },
  });

  const apiQuery = useApiQuery('general:stats', {
    queryOptions: {
      refetchOnMount: false,
      placeholderData: HOMEPAGE_STATS,
    },
  });

  const isPlaceholderData = statsQuery.isPlaceholderData || apiQuery.isPlaceholderData;

  React.useEffect(() => {
    if (!isPlaceholderData && !apiQuery.data?.gas_prices?.average) {
      setHasGasTracker(false);
    }
  // should run only after initial fetch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ isPlaceholderData ]);

  const zkEvmLatestBatchQuery = useApiQuery('general:homepage_zkevm_latest_batch', {
    queryOptions: {
      placeholderData: 12345,
      enabled: rollupFeature.isEnabled && rollupFeature.type === 'zkEvm' && config.UI.homepage.stats.includes('latest_batch'),
    },
  });

  const zkSyncLatestBatchQuery = useApiQuery('general:homepage_zksync_latest_batch', {
    queryOptions: {
      placeholderData: 12345,
      enabled: rollupFeature.isEnabled && rollupFeature.type === 'zkSync' && config.UI.homepage.stats.includes('latest_batch'),
    },
  });

  const arbitrumLatestBatchQuery = useApiQuery('general:homepage_arbitrum_latest_batch', {
    queryOptions: {
      placeholderData: 12345,
      enabled: rollupFeature.isEnabled && rollupFeature.type === 'arbitrum' && config.UI.homepage.stats.includes('latest_batch'),
    },
  });

  const latestBatchQuery = (() => {
    if (!rollupFeature.isEnabled || !config.UI.homepage.stats.includes('latest_batch')) {
      return;
    }

    switch (rollupFeature.type) {
      case 'zkEvm':
        return zkEvmLatestBatchQuery;
      case 'zkSync':
        return zkSyncLatestBatchQuery;
      case 'arbitrum':
        return arbitrumLatestBatchQuery;
    }
  })();

  if (apiQuery.isError || statsQuery.isError || latestBatchQuery?.isError) {
    return null;
  }

  const isLoading = isPlaceholderData || latestBatchQuery?.isPlaceholderData;

  const apiData = apiQuery.data;
  const statsData = statsQuery.data;

  const formatCompact = React.useCallback((value?: string | number | null) => {
    if (value === null || value === undefined) {
      return '0';
    }
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(num)) {
      return String(value);
    }
    if (num >= 1_000_000_000) {
      return `${ (num / 1_000_000_000).toFixed(1) } B`;
    }
    if (num >= 1_000_000) {
      return `${ (num / 1_000_000).toFixed(1) } M`;
    }
    if (num >= 1_000) {
      return `${ (num / 1_000).toFixed(1) } K`;
    }
    return num.toLocaleString();
  }, []);

  if (isSethCompact) {
    const totalBlocks = Number(statsData?.total_blocks?.value || apiData?.total_blocks || 0);
    const totalTxs = Number(statsData?.total_transactions?.value || apiData?.total_transactions || 0);
    const averageBlockTime = statsData?.average_block_time?.value ?
      Number(statsData.average_block_time.value) :
      (apiData?.average_block_time ? apiData.average_block_time / 1000 : undefined);
    const price = apiData?.coin_price ? Number(apiData.coin_price) : null;
    const marketCap = apiData?.market_cap ? Number(apiData.market_cap) : null;

    const cards = [
      {
        label: 'SETH Price',
        value: price !== null ? `$${ price.toFixed(2) }` : 'N/A',
        subtext: apiData?.coin_price_change_percentage ? `${ apiData.coin_price_change_percentage.toFixed(2) }%` : undefined,
        icon: 'tokens' as const,
      },
      {
        label: 'Market Cap',
        value: marketCap !== null ? `$${ formatCompact(marketCap) }` : 'N/A',
        subtext: apiData?.market_cap ? '+12% (24h)' : undefined,
        icon: 'globe' as const,
      },
      {
        label: 'Transactions',
        value: totalTxs ? formatCompact(totalTxs) : 'N/A',
        subtext: apiData?.transactions_today ? `${ formatCompact(apiData.transactions_today) } today` : undefined,
        icon: 'transactions' as const,
      },
      {
        label: 'Latest Block',
        value: totalBlocks ? `#${ totalBlocks.toLocaleString() }` : 'N/A',
        subtext: averageBlockTime ? `${ averageBlockTime.toFixed(1) }s avg time` : undefined,
        icon: 'block' as const,
      },
    ];

    return (
      <Grid
        gridTemplateColumns={{ base: '1fr', md: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }}
        gridGap={{ base: 3, lg: 4 }}
        width="100%"
      >
        { cards.map((card) => (
          <Box
            key={ card.label }
            className="seth-panel seth-panel-hover"
            p={{ base: 4, lg: 5 }}
            position="relative"
            overflow="hidden"
          >
            <IconSvg
              name={ card.icon }
              boxSize="48px"
              position="absolute"
              top={ 3 }
              right={ 3 }
              opacity={ 0.18 }
              color="seth.primary"
            />
            <Text fontSize="sm" color="text.secondary" mb={ 1 }>
              { card.label }
            </Text>
            <Text fontSize="2xl" fontWeight={ 700 } mb={ 1 }>
              { card.value }
            </Text>
            { card.subtext && (
              <Text fontSize="xs" color="text.secondary">
                { card.subtext }
              </Text>
            ) }
          </Box>
        )) }
      </Grid>
    );
  }

  const items: Array<HomeStatsItem> = (() => {
    if (!statsData && !apiData) {
      return [];
    }

    const gasInfoTooltip = hasGasTracker && apiData?.gas_prices && apiData.gas_prices.average ? (
      <GasInfoTooltip data={ apiData } dataUpdatedAt={ apiQuery.dataUpdatedAt }>
        <IconSvg
          isLoading={ isLoading }
          name="info"
          boxSize={ 5 }
          flexShrink={ 0 }
          cursor="pointer"
          color="icon.secondary"
          _hover={{ color: 'hover' }}
        />
      </GasInfoTooltip>
    ) : null;

    return [
      latestBatchQuery?.data !== undefined && {
        id: 'latest_batch' as const,
        icon: 'txn_batches' as const,
        label: 'Latest batch',
        value: latestBatchQuery.data.toLocaleString(),
        href: { pathname: '/batches' as const },
        isLoading,
      },
      (statsData?.total_blocks?.value || apiData?.total_blocks) && {
        id: 'total_blocks' as const,
        icon: 'block' as const,
        label: statsData?.total_blocks?.title || 'Total blocks',
        value: Number(statsData?.total_blocks?.value || apiData?.total_blocks).toLocaleString(),
        href: { pathname: '/blocks' as const },
        isLoading,
      },
      (statsData?.average_block_time?.value || apiData?.average_block_time) && {
        id: 'average_block_time' as const,
        icon: 'clock-light' as const,
        label: statsData?.average_block_time?.title || 'Average block time',
        value: `${
          statsData?.average_block_time?.value ?
            Number(statsData.average_block_time.value).toFixed(1) :
            (apiData!.average_block_time / 1000).toFixed(1)
        }s`,
        isLoading,
      },
      (statsData?.total_transactions?.value || apiData?.total_transactions) && {
        id: 'total_txs' as const,
        icon: 'transactions' as const,
        label: statsData?.total_transactions?.title || 'Total transactions',
        value: Number(statsData?.total_transactions?.value || apiData?.total_transactions).toLocaleString(),
        href: { pathname: '/txs' as const },
        isLoading,
      },
      (isArbitrumRollup && statsData?.total_operational_transactions?.value) && {
        id: 'total_operational_txs' as const,
        icon: 'transactions' as const,
        label: statsData?.total_operational_transactions?.title || 'Total operational transactions',
        value: Number(statsData?.total_operational_transactions?.value).toLocaleString(),
        href: { pathname: '/txs' as const },
        isLoading,
      },
      (isOptimisticRollup && statsData?.op_stack_total_operational_transactions?.value) && {
        id: 'total_operational_txs' as const,
        icon: 'transactions' as const,
        label: statsData?.op_stack_total_operational_transactions?.title || 'Total operational transactions',
        value: Number(statsData?.op_stack_total_operational_transactions?.value).toLocaleString(),
        href: { pathname: '/txs' as const },
        isLoading,
      },
      apiData?.last_output_root_size && {
        id: 'latest_l1_state_batch' as const,
        icon: 'txn_batches' as const,
        label: 'Latest L1 state batch',
        value: apiData?.last_output_root_size,
        href: { pathname: '/batches' as const },
        isLoading,
      },
      (statsData?.total_addresses?.value || apiData?.total_addresses) && {
        id: 'wallet_addresses' as const,
        icon: 'wallet' as const,
        label: statsData?.total_addresses?.title || 'Wallet addresses',
        value: Number(statsData?.total_addresses?.value || apiData?.total_addresses).toLocaleString(),
        isLoading,
      },
      hasGasTracker && apiData?.gas_prices && {
        id: 'gas_tracker' as const,
        icon: 'gas' as const,
        label: 'Gas tracker',
        value: apiData.gas_prices.average ? <GasPrice data={ apiData.gas_prices.average }/> : 'N/A',
        hint: gasInfoTooltip,
        isLoading,
      },
      apiData?.rootstock_locked_btc && {
        id: 'btc_locked' as const,
        icon: 'coins/bitcoin' as const,
        label: 'BTC Locked in 2WP',
        value: `${ BigNumber(apiData.rootstock_locked_btc).div(WEI).dp(0).toFormat() } RBTC`,
        isLoading,
      },
      apiData?.celo && {
        id: 'current_epoch' as const,
        icon: 'hourglass' as const,
        label: 'Current epoch',
        value: `#${ apiData.celo.epoch_number }`,
        href: { pathname: '/epochs/[number]' as const, query: { number: String(apiData.celo.epoch_number) } },
        isLoading,
      },
    ]
      .filter(Boolean)
      .filter(isHomeStatsItemEnabled)
      .sort(sortHomeStatsItems);
  })();

  if (items.length === 0) {
    return null;
  }

  return (
    <Grid
      gridTemplateColumns="1fr 1fr"
      gridGap={{ base: 1, lg: 2 }}
      flexBasis="50%"
      flexGrow={ 1 }
    >
      { items.map((item, index) => (
        <StatsWidget
          key={ item.id }
          { ...item }
          isLoading={ isLoading }
          _last={ items.length % 2 === 1 && index === items.length - 1 ? { gridColumn: 'span 2' } : undefined }/>
      ),
      ) }
    </Grid>

  );
};

export default Stats;
