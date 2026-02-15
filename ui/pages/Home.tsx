import { Box, Flex } from '@chakra-ui/react';
import React from 'react';

import config from 'configs/app';
import useIsMobile from 'lib/hooks/useIsMobile';
import useSethStrict from 'lib/settings/useSethStrict';
import HeroBanner from 'ui/home/HeroBanner';
import Highlights from 'ui/home/Highlights';
import ChainIndicators from 'ui/home/indicators/ChainIndicators';
import LatestArbitrumL2Batches from 'ui/home/latestBatches/LatestArbitrumL2Batches';
import LatestZkEvmL2Batches from 'ui/home/latestBatches/LatestZkEvmL2Batches';
import LatestBlocks from 'ui/home/LatestBlocks';
import Stats from 'ui/home/Stats';
import Transactions from 'ui/home/Transactions';
import StrictHome from 'ui/sethStrict/StrictHome';
import AdBanner from 'ui/shared/ad/AdBanner';

const rollupFeature = config.features.rollup;
const isSethCompact = config.UI.colorTheme.default?.id === 'seth';

const Home = () => {
  const isMobile = useIsMobile();
  const isSethStrict = useSethStrict();

  const leftWidget = (() => {
    if (rollupFeature.isEnabled && !rollupFeature.homepage.showLatestBlocks) {
      switch (rollupFeature.type) {
        case 'zkEvm':
          return <LatestZkEvmL2Batches/>;
        case 'arbitrum':
          return <LatestArbitrumL2Batches/>;
      }
    }

    return <LatestBlocks/>;
  })();

  const content = (() => {
    if (isSethStrict) {
      return <StrictHome/>;
    }

    if (isSethCompact) {
      return (
        <>
          <Stats/>
          <Flex mt={ 6 } direction={{ base: 'column', lg: 'row' }} columnGap={ 6 } rowGap={ 6 }>
            <Box className="seth-panel seth-panel-hover" p={ 0 } overflow="hidden" flex={ 1 }>
              { leftWidget }
            </Box>
            <Box className="seth-panel seth-panel-hover" p={ 0 } overflow="hidden" flex={ 1 }>
              <Transactions/>
            </Box>
          </Flex>
          <Box mt={ 6 } className="seth-panel seth-panel-soft" p={{ base: 3, lg: 4 }}>
            <ChainIndicators/>
          </Box>
        </>
      );
    }

    return (
      <>
        <Box className="seth-panel seth-panel-hover" p={{ base: 3, lg: 4 }} mt={ 3 }>
          <Flex flexDir={{ base: 'column', lg: 'row' }} columnGap={ 2 } rowGap={ 1 } _empty={{ mt: 0 }}>
            <Stats/>
          </Flex>
        </Box>
        { isMobile && <AdBanner mt={ 6 } mx="auto" justifyContent="center" format="mobile"/> }
        <Flex mt={ 4 } direction={{ base: 'column', lg: 'row' }} columnGap={ 4 } rowGap={ 4 }>
          <Box className="seth-panel seth-panel-hover" p={{ base: 3, lg: 4 }} h="fit-content">
            { leftWidget }
          </Box>
          <Box flexGrow={ 1 } className="seth-panel seth-panel-hover" p={{ base: 3, lg: 4 }}>
            <Transactions/>
          </Box>
        </Flex>
        <Box mt={ 4 } className="seth-panel seth-panel-soft" p={{ base: 3, lg: 4 }}>
          <ChainIndicators/>
        </Box>
        { !isMobile && config.UI.homepage.highlights && <Highlights mt={ 3 }/> }
      </>
    );
  })();

  return (
    <Box as="main" className="seth-page-shell">
      { !isSethStrict && !isSethCompact && <HeroBanner/> }
      { content }
    </Box>
  );
};

export default Home;
