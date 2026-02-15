import { Box, Text, chakra } from '@chakra-ui/react';
import React from 'react';

import type { EmptyStateProps } from 'toolkit/chakra/empty-state';
import { EmptyState } from 'toolkit/chakra/empty-state';

import DataFetchAlert from './DataFetchAlert';

type Props = {
  isError: boolean;
  itemsNum?: number;
  emptyText?: React.ReactNode;
  actionBar?: React.ReactNode;
  showActionBarIfEmpty?: boolean;
  showActionBarIfError?: boolean;
  children: React.ReactNode;
  className?: string;
  hasActiveFilters?: boolean;
  emptyStateProps?: EmptyStateProps;
};

const DataListDisplay = (props: Props) => {
  const panelClassName = [ 'seth-panel', 'seth-panel-hover', props.className ].filter(Boolean).join(' ');

  if (props.isError) {
    if (props.showActionBarIfError) {
      return (
        <Box className={ panelClassName }>
          { props.actionBar }
          <DataFetchAlert/>
        </Box>
      );
    }

    return <DataFetchAlert className={ panelClassName }/>;
  }

  if (props.hasActiveFilters && !props.itemsNum) {
    return (
      <Box className={ panelClassName }>
        { props.actionBar }
        <EmptyState { ...props.emptyStateProps }/>
      </Box>
    );
  }

  if (!props.itemsNum) {
    return (
      <Box className={ panelClassName }>
        { props.showActionBarIfEmpty && props.actionBar }
        { props.emptyText && <Text>{ props.emptyText }</Text> }
      </Box>
    );
  }

  return (
    <Box className={ panelClassName }>
      { props.actionBar }
      { props.children }
    </Box>
  );
};

export default chakra(DataListDisplay);
