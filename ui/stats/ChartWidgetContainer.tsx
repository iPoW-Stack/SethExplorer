import { chakra } from '@chakra-ui/react';
import React, { useEffect } from 'react';

import { Resolution } from '@blockscout/stats-types';
import type { StatsIntervalIds } from 'types/client/stats';

import { route, type Route } from 'nextjs-routes';

import config from 'configs/app';
import { ChartWidget } from 'toolkit/components/charts/ChartWidget';
import { useChartsConfig } from 'ui/shared/chart/config';
import useChartQuery from 'ui/shared/chart/useChartQuery';

type Props = {
  id: string;
  title: string;
  description: string;
  interval: StatsIntervalIds;
  onLoadingError: () => void;
  isPlaceholderData: boolean;
  className?: string;
  href?: Route;
};

const ChartWidgetContainer = ({
  id,
  title,
  description,
  interval,
  onLoadingError,
  isPlaceholderData,
  className,
  href,
}: Props) => {
  const {
    items,
    data,
    isError,
    isPlaceholderData: isChartPlaceholderData,
  } = useChartQuery(id, Resolution.DAY, interval, !isPlaceholderData);
  const chartsConfig = useChartsConfig();

  useEffect(() => {
    if (isError) {
      onLoadingError();
    }
  }, [ isError, onLoadingError ]);

  const charts = React.useMemo(() => {
    if (!data?.info || !items) {
      return [];
    }

    return [
      {
        id: data.info.id,
        name: 'Value',
        items,
        charts: chartsConfig,
        units: data.info.units,
      },
    ];
  }, [ chartsConfig, data?.info, items ]);

  return (
    <ChartWidget
      isError={ isError }
      charts={ charts }
      title={ title }
      description={ description }
      isLoading={ isChartPlaceholderData }
      minH="230px"
      className={ className }
      href={ href ? route(href) : undefined }
      chartUrl={ href ? `${ config.app.baseUrl }${ route(href) }` : undefined }
      bg={{ _dark: 'linear-gradient(180deg, rgba(12, 20, 24, 0.86) 0%, rgba(7, 11, 14, 0.96) 100%)' }}
      borderColor={{ _dark: 'rgba(126, 144, 159, 0.35)' }}
      boxShadow={{ _dark: '0 8px 24px rgba(0, 0, 0, 0.3)' }}
      transitionProperty="transform,border-color,box-shadow"
      transitionDuration="normal"
      _hover={{
        transform: 'translateY(-2px)',
        borderColor: { _dark: 'rgba(0, 255, 163, 0.42)' },
        boxShadow: { _dark: '0 0 0 1px rgba(0, 255, 163, 0.08), 0 14px 28px rgba(0, 0, 0, 0.44)' },
      }}
    />
  );
};

export default chakra(ChartWidgetContainer);
