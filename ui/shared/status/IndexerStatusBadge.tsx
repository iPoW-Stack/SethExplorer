import { Box, HStack, Text } from '@chakra-ui/react';
import React from 'react';

type IndexerStatusLabel = 'Healthy' | 'Degraded' | 'Unavailable';

interface Props {
  sourceState?: string | null;
}

interface StatusPresentation {
  label: IndexerStatusLabel;
  color: string;
  borderColor: string;
  bgColor: string;
}

export function mapIndexerStatus(sourceState?: string | null): StatusPresentation {
  const normalized = sourceState?.toLowerCase();

  if (normalized === 'ok') {
    return {
      label: 'Healthy',
      color: '#86efac',
      borderColor: 'rgba(22, 163, 74, 0.45)',
      bgColor: 'rgba(22, 163, 74, 0.14)',
    };
  }

  if (normalized === 'degraded' || normalized === 'timeout' || normalized === 'lagging') {
    return {
      label: 'Degraded',
      color: '#fcd34d',
      borderColor: 'rgba(217, 119, 6, 0.45)',
      bgColor: 'rgba(217, 119, 6, 0.14)',
    };
  }

  return {
    label: 'Unavailable',
    color: '#fca5a5',
    borderColor: 'rgba(220, 38, 38, 0.45)',
    bgColor: 'rgba(220, 38, 38, 0.14)',
  };
}

const IndexerStatusBadge = ({ sourceState }: Props) => {
  const presentation = mapIndexerStatus(sourceState);

  return (
    <HStack
      gap={ 2 }
      px={ 2.5 }
      py={ 1 }
      borderWidth="1px"
      borderColor={ presentation.borderColor }
      bgColor={ presentation.bgColor }
      borderRadius="full"
      width="fit-content"
    >
      <Box
        boxSize="8px"
        borderRadius="full"
        bgColor={ presentation.color }
        boxShadow={ `0 0 0 1px ${ presentation.borderColor }` }
      />
      <Text fontSize="xs" color={ presentation.color }>{ presentation.label }</Text>
    </HStack>
  );
};

export default React.memo(IndexerStatusBadge);
