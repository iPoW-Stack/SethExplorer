import { Flex, Separator, Box, HStack } from '@chakra-ui/react';
import React from 'react';

import config from 'configs/app';
import { useAppContext } from 'lib/contexts/app';
import * as cookies from 'lib/cookies';
import useIsMobile from 'lib/hooks/useIsMobile';
import useSethStrict from 'lib/settings/useSethStrict';
import useProvider from 'lib/web3/useProvider';
import { CONTENT_MAX_WIDTH } from 'ui/shared/layout/utils';
import IconSvg from 'ui/shared/IconSvg';
import NetworkAddToWallet from 'ui/shared/NetworkAddToWallet';

import DeFiDropdown from './DeFiDropdown';
import NetworkMenu from './NetworkMenu';
import Settings from './settings/Settings';
import TopBarStats from './TopBarStats';

const TopBar = () => {
  const isSethStrict = useSethStrict();
  const hideAddToWalletButtonCookie = cookies.get(cookies.NAMES.HIDE_ADD_TO_WALLET_BUTTON, useAppContext().cookies);
  const [ isAddChainButtonVisible, setIsAddChainButtonVisible ] = React.useState(hideAddToWalletButtonCookie !== 'topbar');

  const web3 = useProvider();
  const isMobile = useIsMobile();

  const hasAddChainButton = Boolean(
    isAddChainButtonVisible &&
    web3.data?.provider &&
    web3.data?.wallet &&
    config.chain.rpcUrls.length &&
    config.features.web3Wallet.isEnabled &&
    !config.features.opSuperchain.isEnabled &&
    !isMobile,
  );
  const hasDeFiDropdown = Boolean(config.features.deFiDropdown.isEnabled);

  const handleAddSuccess = React.useCallback(() => {
    cookies.set(cookies.NAMES.HIDE_ADD_TO_WALLET_BUTTON, 'topbar', { expires: 3 * 365 });
    setIsAddChainButtonVisible(false);
  }, [ ]);

  if (isSethStrict) {
    return (
      <Box
        bgColor="#040608"
        position="sticky"
        top={ 0 }
        left={ 0 }
        width="100%"
        maxWidth="100vw"
        borderBottomWidth="1px"
        borderBottomColor="seth.border"
        zIndex="docked"
      >
        <Flex
          py={ 1.5 }
          px={{ base: 3, lg: 6 }}
          m="0 auto"
          justifyContent="flex-end"
          alignItems="center"
          maxW={ `${ CONTENT_MAX_WIDTH }px` }
        >
          <HStack gap={ 2 }>
            <IconSvg name="networks/icon-placeholder" boxSize={ 5 } color="gray.500"/>
            <Box
              as="span"
              fontSize="sm"
              fontWeight={ 700 }
              color="#ef4444"
              letterSpacing="0.2px"
            >
              SETH
            </Box>
          </HStack>
        </Flex>
      </Box>
    );
  }

  return (
    // not ideal if scrollbar is visible, but better than having a horizontal scroll
    <Box
      bgColor={{ _light: 'theme.topbar.bg._light', _dark: 'theme.topbar.bg._dark' }}
      position="sticky"
      top={ 0 }
      left={ 0 }
      width="100%"
      maxWidth="100vw"
      backdropFilter={{ base: 'none', _dark: 'blur(12px)' }}
      borderBottomWidth="1px"
      borderBottomColor={{ _light: 'border.divider', _dark: 'seth.border' }}
      boxShadow={{ _light: 'none', _dark: '0 6px 20px rgba(0, 0, 0, 0.22)' }}
      zIndex="docked"
    >
      <Flex
        py={ 1.5 }
        px={{ base: 3, lg: 6 }}
        m="0 auto"
        justifyContent="space-between"
        alignItems="center"
        maxW={ `${ CONTENT_MAX_WIDTH }px` }
      >
        <HStack gap={ 0 } fontSize="xs">
          { Boolean(config.UI.featuredNetworks.items) && <NetworkMenu/> }
          { !config.features.opSuperchain.isEnabled ? <TopBarStats/> : <div/> }
        </HStack>
        <HStack
          alignItems="center"
          separator={ <Separator mx={{ base: 2, lg: 3 }} height={ 4 }/> }
        >
          { (hasAddChainButton || hasDeFiDropdown) && (
            <HStack>
              { hasAddChainButton && <NetworkAddToWallet source="Top bar" onAddSuccess={ handleAddSuccess }/> }
              { hasDeFiDropdown && <DeFiDropdown/> }
            </HStack>
          ) }
          <Settings/>
        </HStack>
      </Flex>
    </Box>
  );
};

export default React.memo(TopBar);
