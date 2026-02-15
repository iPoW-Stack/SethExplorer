import { Box, Flex } from '@chakra-ui/react';
import React from 'react';

import config from 'configs/app';
import useSethStrict from 'lib/settings/useSethStrict';
import { useIsSticky } from 'toolkit/hooks/useIsSticky';
import RewardsButton from 'ui/rewards/RewardsButton';
import NetworkIcon from 'ui/snippets/networkLogo/NetworkIcon';
import UserProfileMobile from 'ui/snippets/user/profile/UserProfileMobile';
import UserWalletMobile from 'ui/snippets/user/wallet/UserWalletMobile';

import RollupStageBadge from '../navigation/RollupStageBadge';
import TestnetBadge from '../navigation/TestnetBadge';
import SearchBarMobile from '../searchBar/SearchBarMobile';
import Burger from './Burger';

type Props = {
  hideSearchButton?: boolean;
  onGoToSearchResults?: (searchTerm: string) => void;
};

const HeaderMobile = ({ hideSearchButton, onGoToSearchResults }: Props) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isSticky = useIsSticky(ref, 5);
  const isSethStrict = useSethStrict();

  return (
    <Box
      ref={ ref }
      bgColor="bg.primary"
      display={{ base: 'block', lg: 'none' }}
      position="sticky"
      top="-1px"
      left={ 0 }
      zIndex="sticky2"
      pt="1px"
      height="58px"
      borderBottomWidth="1px"
      borderBottomColor={{ _light: 'border.divider', _dark: 'seth.border' }}
      backdropFilter={{ _dark: 'blur(10px)' }}
    >
      <Flex
        as="header"
        paddingX={ 3 }
        paddingY={ 2 }
        bgColor={{ _light: 'bg.primary', _dark: 'rgba(4, 6, 8, 0.82)' }}
        width="100%"
        alignItems="center"
        transitionProperty="box-shadow"
        transitionDuration="slow"
        boxShadow={ isSticky ? { _light: 'md', _dark: '0 8px 18px rgba(0, 0, 0, 0.28)' } : 'none' }
      >
        <Burger/>
        <Flex alignItems="center" flexGrow={ 1 } mx={ 2 }>
          <NetworkIcon/>
          { !isSethStrict && <TestnetBadge ml={ 2 }/> }
          { !isSethStrict && <RollupStageBadge ml={ 2 }/> }
        </Flex>
        <Flex columnGap={ 2 }>
          { !hideSearchButton && <SearchBarMobile onGoToSearchResults={ onGoToSearchResults }/> }
          { !isSethStrict && config.features.rewards.isEnabled && <RewardsButton/> }
          { isSethStrict ? (
            (config.features.blockchainInteraction.isEnabled && <UserWalletMobile/>) ||
            (config.features.account.isEnabled && <UserProfileMobile/>)
          ) : (
            (config.features.account.isEnabled && <UserProfileMobile/>) ||
            (config.features.blockchainInteraction.isEnabled && <UserWalletMobile/>)
          ) }
        </Flex>
      </Flex>
    </Box>
  );
};

export default React.memo(HeaderMobile);
