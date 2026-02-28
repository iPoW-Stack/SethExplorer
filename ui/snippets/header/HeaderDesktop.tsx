import { HStack, Box, Flex } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import React from 'react';
import { FaRegBell, FaWallet } from 'react-icons/fa6';

import { route } from 'nextjs-routes';

import config from 'configs/app';
import useSethStrict from 'lib/settings/useSethStrict';
import RewardsButton from 'ui/rewards/RewardsButton';
import IconSvg from 'ui/shared/IconSvg';
import SearchBar from 'ui/snippets/searchBar/SearchBarDesktop';
import UserProfileDesktop from 'ui/snippets/user/profile/UserProfileDesktop';
import UserWalletDesktop from 'ui/snippets/user/wallet/UserWalletDesktop';
import { Link } from 'toolkit/chakra/link';

type Props = {
  renderSearchBar?: () => React.ReactNode;
};

const HeaderDesktop = ({ renderSearchBar }: Props) => {
  const isSethStrict = useSethStrict();
  const router = useRouter();
  const showStrictBell = isSethStrict && router.pathname === '/';
  const strictAction = (
    (config.features.blockchainInteraction.isEnabled && <UserWalletDesktop/>) ||
    (config.features.account.isEnabled && <UserProfileDesktop/>)
  );
  const strictActionNode = strictAction || (
    <Link
      href={ route({ pathname: '/login' }) }
      noIcon
      display="inline-flex"
      alignItems="center"
      gap={ 2 }
      px={ 4 }
      py={ 2 }
      borderRadius="8px"
      bgColor="seth.primary"
      color="black"
      fontSize="sm"
      fontWeight={ 700 }
      lineHeight="20px"
      boxShadow="0 0 15px rgba(0, 255, 163, 0.3)"
      _hover={{ bgColor: '#34ffd2', color: '#041018' }}
    >
      <Box as={ FaWallet } boxSize={ 4 } color="currentColor"/>
      <Box as="span">Connect</Box>
    </Link>
  );

  const searchBar = renderSearchBar ? renderSearchBar() : <SearchBar/>;

  return (
    <HStack
      as="header"
      display={{ base: 'none', lg: 'flex' }}
      width="100%"
      minH="64px"
      position="sticky"
      top={ 0 }
      zIndex="docked"
      alignItems="center"
      justifyContent={ isSethStrict ? 'space-between' : 'center' }
      gap={ isSethStrict ? 4 : 6 }
      px={{ base: 3, lg: 6 }}
      py={ isSethStrict ? 0 : 2 }
      borderBottomWidth="1px"
      borderBottomColor={{ _light: 'border.divider', _dark: 'seth.border' }}
      bgColor={{ _light: 'transparent', _dark: isSethStrict ? 'rgba(4, 6, 8, 0.8)' : 'rgba(4, 6, 8, 0.85)' }}
      backdropFilter={{ _dark: isSethStrict ? 'blur(4px)' : 'blur(12px)' }}
    >
      { isSethStrict ? (
        <>
          <Box flex={ 1 } maxW="2xl" mr={ 4 }>
            { searchBar }
          </Box>
          <Flex alignItems="center" gap={ 4 } ml={ 4 } flexShrink={ 0 }>
            <Box
              px={ 3 }
              py={ 1 }
              borderRadius="full"
              borderWidth="1px"
              borderColor="seth.border"
              bgColor="rgba(15, 23, 42, 0.7)"
              fontSize="xs"
              fontWeight={ 500 }
              lineHeight="16px"
              color="gray.300"
              display="inline-flex"
              alignItems="center"
              gap={ 2 }
            >
              <Box boxSize={ 2 } borderRadius="full" bgColor="#22c55e"/>
              Mainnet
            </Box>
            { showStrictBell && (
              <Box
                as="button"
                position="relative"
                boxSize="36px"
                color="gray.400"
                _hover={{ color: 'white' }}
                transitionProperty="color"
                transitionDuration="normal"
              >
                <Flex alignItems="center" justifyContent="center" w="100%" h="100%">
                  <FaRegBell size={ 16 }/>
                </Flex>
                <Box
                  position="absolute"
                  top="7px"
                  right="8px"
                  boxSize={ 2 }
                  borderRadius="full"
                  bgColor="#ef4444"
                  borderWidth="2px"
                  borderColor="#040608"
                />
              </Box>
            ) }
            { strictActionNode }
          </Flex>
        </>
      ) : (
        <>
          <Box width="100%">
            { searchBar }
          </Box>
          { config.UI.navigation.layout === 'vertical' && (
            <Box display="flex" gap={ 2 } flexShrink={ 0 }>
              { config.features.rewards.isEnabled && <RewardsButton/> }
              { (config.features.account.isEnabled && <UserProfileDesktop/>) ||
                (config.features.blockchainInteraction.isEnabled && <UserWalletDesktop/>) }
            </Box>
          ) }
        </>
      ) }
    </HStack>
  );
};

export default React.memo(HeaderDesktop);
