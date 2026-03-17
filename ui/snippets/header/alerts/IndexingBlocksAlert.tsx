import { Box, Flex, Text } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import React from 'react';

import type { SocketMessage } from 'lib/socket/types';
import type { IndexingStatus } from 'types/api/indexingStatus';

import config from 'configs/app';
import useApiQuery, { getResourceKey } from 'lib/api/useApiQuery';
import { useAppContext } from 'lib/contexts/app';
import * as cookies from 'lib/cookies';
import useSocketChannel from 'lib/socket/useSocketChannel';
import useSocketMessage from 'lib/socket/useSocketMessage';
import { Alert } from 'toolkit/chakra/alert';
import { Button } from 'toolkit/chakra/button';
import { Progress } from 'toolkit/chakra/progress';
import { Skeleton } from 'toolkit/chakra/skeleton';
import { nbsp, ndash } from 'toolkit/utils/htmlEntities';

const COLLAPSE_STORAGE_KEY = 'seth.indexing_alert.collapsed';

const IndexingBlocksAlert = () => {
  const router = useRouter();
  const normalizedAsPath = router.asPath.split('?')[0];
  const isHomePage = router.pathname === '/' || normalizedAsPath === '/';
  const appProps = useAppContext();
  const cookiesString = appProps.cookies;
  const [hasAlertCookie] = React.useState(cookies.get(cookies.NAMES.INDEXING_ALERT, cookiesString) === 'true');
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  React.useEffect(() => {
    if (isHomePage) {
      setIsCollapsed(false);
      return;
    }

    try {
      setIsCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1');
    } catch { }
  }, [isHomePage]);

  const { data, isError, isPending } = useApiQuery('general:homepage_indexing_status', {
    queryOptions: {
      enabled: !config.UI.indexingAlert.blocks.isHidden,
    },
  });

  React.useEffect(() => {
    if (!isPending && !isError) {
      cookies.set(cookies.NAMES.INDEXING_ALERT, data.finished_indexing_blocks ? 'false' : 'true');
    }
  }, [data, isError, isPending]);

  const queryClient = useQueryClient();

  const handleBlocksIndexStatus: SocketMessage.BlocksIndexStatus['handler'] = React.useCallback((payload) => {
    queryClient.setQueryData(getResourceKey('general:homepage_indexing_status'), (prevData: IndexingStatus | undefined) => {

      const newData = prevData ? { ...prevData } : {} as IndexingStatus;
      newData.finished_indexing_blocks = payload.finished;
      newData.indexed_blocks_ratio = payload.ratio;

      return newData;
    });
  }, [queryClient]);

  const blockIndexingChannel = useSocketChannel({
    topic: 'blocks:indexing',
    isDisabled: !data || data.finished_indexing_blocks || config.UI.indexingAlert.blocks.isHidden,
  });

  useSocketMessage({
    channel: blockIndexingChannel,
    event: 'index_status',
    handler: handleBlocksIndexStatus,
  });

  if (config.UI.indexingAlert.blocks.isHidden) {
    return null;
  }

  if (isError) {
    return null;
  }

  if (isPending) {
    return hasAlertCookie ? <Skeleton loading h={{ base: '96px', lg: '48px' }} w="100%" /> : null;
  }

  if (data.finished_indexing_blocks !== false) {
    return null;
  }

  const ratio = Number(data.indexed_blocks_ratio || 0);
  const progress = Math.max(0, Math.min(100, Math.round(ratio * 100)));

  const handleCollapse = () => {
    setIsCollapsed(true);
    try {
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, '1');
    } catch { }
  };

  const handleExpand = () => {
    setIsCollapsed(false);
    try {
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, '0');
    } catch { }
  };

  if (!isHomePage && isCollapsed) {
    return (
      <Alert status="info" py={2.5} borderRadius="md">
        <Flex width="100%" alignItems="center" justifyContent="space-between" gap={3}>
          <Text fontSize="sm">{progress}% Blocks Indexed</Text>
          <Button size="xs" variant="subtle" onClick={handleExpand}>Show details</Button>
        </Flex>
      </Alert>
    );
  }

  if (isHomePage) {
    return (
      <Alert status="info" py={2} borderRadius="md">
        <Flex width="100%" alignItems="center" gap={3}>
          <Text fontSize="sm" flexShrink={0}>
            {progress}% Indexed{nbsp}{ndash}{nbsp}syncing
          </Text>
          <Progress
            value={progress}
            color="#00FF94"
            height="3px"
            borderRadius="full"
            flex={1}
            trackProps={{ bg: 'rgba(255, 255, 255, 0.1)', borderRadius: 'full' }}
          />
        </Flex>
      </Alert>
    );
  }

  return (
    <Alert status="info" py={3} borderRadius="md" showIcon>
      <Box width="100%">
        <Flex alignItems="center" justifyContent="space-between" gap={4} mb={2}>
          <Text fontSize="sm">
            {`${progress}% Blocks Indexed${nbsp}${ndash} `}
            We're indexing this chain right now. Some counts may still be catching up.
          </Text>
          <Button size="xs" variant="subtle" onClick={handleCollapse}>Collapse</Button>
        </Flex>
        <Progress
          value={progress}
          color="#00FF94"
          height="6px"
          borderRadius="full"
          trackProps={{ bg: 'rgba(255, 255, 255, 0.14)', borderRadius: 'full' }}
        />
      </Box>
    </Alert>
  );
};

export default React.memo(IndexingBlocksAlert);
