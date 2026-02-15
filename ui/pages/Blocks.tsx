import { Box } from '@chakra-ui/react';
import { upperFirst } from 'es-toolkit';
import { useRouter } from 'next/router';
import React from 'react';

import type { TabItemRegular } from 'toolkit/components/AdaptiveTabs/types';

import config from 'configs/app';
import useIsMobile from 'lib/hooks/useIsMobile';
import getQueryParamString from 'lib/router/getQueryParamString';
import useSethStrict from 'lib/settings/useSethStrict';
import { BLOCK } from 'stubs/block';
import { generateListStub } from 'stubs/utils';
import RoutedTabs from 'toolkit/components/RoutedTabs/RoutedTabs';
import BlocksContent from 'ui/blocks/BlocksContent';
import BlocksTabSlot from 'ui/blocks/BlocksTabSlot';
import Flashblocks from 'ui/blocks/Flashblocks';
import StrictBlocksPage from 'ui/sethStrict/StrictBlocksPage';
import PageTitle from 'ui/shared/Page/PageTitle';
import useQueryWithPages from 'ui/shared/pagination/useQueryWithPages';

const flashblocksFeature = config.features.flashblocks;
const isSethCompact = config.UI.colorTheme.default?.id === 'seth';

const TAB_LIST_PROPS = {
  marginBottom: 0,
  pt: 3,
  pb: 3,
  px: 3,
  borderRadius: 'xl',
  borderWidth: '1px',
  borderColor: { _light: 'transparent', _dark: 'rgba(255, 255, 255, 0.08)' },
  bgColor: { _light: 'bg.primary', _dark: 'rgba(10, 16, 20, 0.78)' },
  backdropFilter: { _dark: 'blur(10px)' },
  marginTop: 0,
};

const BlocksPageContent = () => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const isSethStrict = useSethStrict();
  const tab = getQueryParamString(router.query.tab);

  const blocksQuery = useQueryWithPages({
    resourceName: 'general:blocks',
    filters: { type: 'block' },
    options: {
      enabled: isSethStrict || tab === 'blocks' || !tab,
      placeholderData: generateListStub<'general:blocks'>(BLOCK, 50, { next_page_params: {
        block_number: 8988686,
        items_count: 50,
      } }),
    },
  });
  const reorgsQuery = useQueryWithPages({
    resourceName: 'general:blocks',
    filters: { type: 'reorg' },
    options: {
      enabled: !isSethStrict && tab === 'reorgs',
      placeholderData: generateListStub<'general:blocks'>(BLOCK, 50, { next_page_params: {
        block_number: 8988686,
        items_count: 50,
      } }),
    },
  });
  const unclesQuery = useQueryWithPages({
    resourceName: 'general:blocks',
    filters: { type: 'uncle' },
    options: {
      enabled: !isSethStrict && tab === 'uncles',
      placeholderData: generateListStub<'general:blocks'>(BLOCK, 50, { next_page_params: {
        block_number: 8988686,
        items_count: 50,
      } }),
    },
  });

  const flashblocksTabId = flashblocksFeature.isEnabled ? flashblocksFeature.name + 's' : undefined;
  const isFlashblocksTab = tab === flashblocksTabId && flashblocksTabId !== undefined;

  const pagination = (() => {
    if (tab === 'reorgs') {
      return reorgsQuery.pagination;
    }
    if (tab === 'uncles') {
      return unclesQuery.pagination;
    }
    if (isFlashblocksTab) {
      return null;
    }
    return blocksQuery.pagination;
  })();

  const tabs: Array<TabItemRegular> = [
    { id: 'blocks', title: 'All', component: <BlocksContent type="block" query={ blocksQuery }/> },
    flashblocksFeature.isEnabled && flashblocksTabId && { id: flashblocksTabId, title: upperFirst(flashblocksFeature.name) + 's', component: <Flashblocks/> },
    { id: 'reorgs', title: 'Forked', component: <BlocksContent type="reorg" query={ reorgsQuery }/> },
    { id: 'uncles', title: 'Uncles', component: <BlocksContent type="uncle" query={ unclesQuery }/> },
  ].filter(Boolean);

  const listProps = (() => {
    if (isSethCompact) {
      return { display: 'none' };
    }
    if (isMobile) {
      return undefined;
    }
    return TAB_LIST_PROPS;
  })();

  return (
    <Box className="seth-page-shell">
      { !isSethStrict && <PageTitle title="Blocks"/> }
      { isSethStrict ? (
        <StrictBlocksPage query={ blocksQuery }/>
      ) : (
        <RoutedTabs
          tabs={ tabs }
          listProps={ listProps }
          rightSlot={ <BlocksTabSlot pagination={ pagination }/> }
          stickyEnabled={ !isSethCompact && !isMobile && !isFlashblocksTab }
        />
      ) }
    </Box>
  );
};

export default BlocksPageContent;
