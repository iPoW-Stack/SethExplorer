import { Box, Flex, HStack, Text, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import React from 'react';

import type { NavItem, NavItemInternal } from 'types/client/navigation';

import { route } from 'nextjs-routes';

import { useAppContext } from 'lib/contexts/app';
import * as cookies from 'lib/cookies';
import useNavItems, { isGroupItem } from 'lib/hooks/useNavItems';
import useSethStrict from 'lib/settings/useSethStrict';
import { Image } from 'toolkit/chakra/image';
import { Link } from 'toolkit/chakra/link';
import IconSvg from 'ui/shared/IconSvg';
import useIsAuth from 'ui/snippets/auth/useIsAuth';
import NetworkIcon from 'ui/snippets/networkLogo/NetworkIcon';
import NetworkLogo from 'ui/snippets/networkLogo/NetworkLogo';

import NavigationPromoBanner from '../promoBanner/NavigationPromoBanner';
import RollupStageBadge from '../RollupStageBadge';
import TestnetBadge from '../TestnetBadge';
import NavLinkIcon from '../NavLinkIcon';
import NavLink from './NavLink';
import NavLinkGroup from './NavLinkGroup';
import NavLinkRewards from './NavLinkRewards';

function isAccountsRoute(pathname: string) {
  return pathname === '/accounts' ||
    pathname === '/address/[hash]' ||
    pathname === '/chain/[chain_slug]/address/[hash]';
}

function getSethStrictItems(pathname: string) {
  const menuItems: Array<NavItemInternal> = [
    {
      text: 'Dashboard',
      nextRoute: { pathname: '/' as const },
      icon: 'navigation/blockchain',
      isActive: pathname === '/',
    },
    {
      text: 'Blocks',
      nextRoute: { pathname: '/blocks' as const },
      icon: 'navigation/block',
      isActive: pathname === '/blocks' || pathname === '/block/[height_or_hash]' || pathname === '/chain/[chain_slug]/block/[height_or_hash]',
    },
    {
      text: 'Transactions',
      nextRoute: { pathname: '/txs' as const },
      icon: 'navigation/transactions',
      isActive: pathname === '/txs' || pathname === '/tx/[hash]' || pathname === '/chain/[chain_slug]/tx/[hash]',
    },
    {
      text: 'Addresses',
      nextRoute: { pathname: '/accounts' as const },
      icon: 'navigation/top_accounts',
      isActive: isAccountsRoute(pathname),
    },
    {
      text: 'Tokens',
      nextRoute: { pathname: '/tokens' as const },
      icon: 'navigation/tokens',
      isActive: pathname === '/tokens' || pathname.startsWith('/token/'),
    },
  ];

  const resourcesItems: Array<NavItemInternal> = [
    {
      text: 'Charts',
      nextRoute: { pathname: '/stats' as const },
      icon: 'navigation/stats',
      isActive: pathname.startsWith('/stats') || pathname.startsWith('/gas-tracker') || pathname.startsWith('/hot-contracts'),
    },
    {
      text: 'API',
      nextRoute: { pathname: '/api-docs' as const },
      icon: 'navigation/api_docs',
      isActive: pathname.startsWith('/api-docs'),
    },
  ];

  return { menuItems, resourcesItems };
}

const StrictNavItem = ({ item }: { item: NavItemInternal }) => {
  return (
    <Box as="li" listStyleType="none" w="100%">
      <Link
        href={ route(item.nextRoute) }
        noIcon
        w="100%"
        fontSize="14px"
        lineHeight="20px"
        fontWeight={ 500 }
        px={ 4 }
        py={ 3 }
        borderRadius="8px"
        borderWidth="1px"
        borderColor={ item.isActive ? 'rgba(0, 255, 163, 0.22)' : 'transparent' }
        bgColor={ item.isActive ? 'rgba(0, 255, 163, 0.1)' : 'transparent' }
        boxShadow={ item.isActive ? '0 0 15px rgba(0, 255, 163, 0.1)' : 'none' }
        color={ item.isActive ? 'seth.primary' : 'gray.400' }
        _hover={{
          color: item.isActive ? 'seth.primary' : 'white',
          bgColor: item.isActive ? 'rgba(0, 255, 163, 0.1)' : 'rgba(255, 255, 255, 0.05)',
          borderColor: item.isActive ? 'rgba(0, 255, 163, 0.22)' : 'rgba(255, 255, 255, 0.08)',
        }}
      >
        <HStack gap={ 3 } alignItems="center">
          <NavLinkIcon item={ item }/>
          <Text fontSize="14px" lineHeight="20px" fontWeight={ 500 }>{ item.text }</Text>
        </HStack>
      </Link>
    </Box>
  );
};

const NavigationDesktop = () => {
  const appProps = useAppContext();
  const cookiesString = appProps.cookies;
  const router = useRouter();
  const isSethStrict = useSethStrict();

  const isNavBarCollapsedCookie = cookies.get(cookies.NAMES.NAV_BAR_COLLAPSED, cookiesString);
  let isNavBarCollapsed;
  if (isNavBarCollapsedCookie === 'true') {
    isNavBarCollapsed = true;
  }
  if (isNavBarCollapsedCookie === 'false') {
    isNavBarCollapsed = false;
  }

  const { mainNavItems, accountNavItems } = useNavItems();
  const isAuth = useIsAuth();

  const [ isCollapsed, setCollapsedState ] = React.useState<boolean | undefined>(
    isNavBarCollapsed === undefined ? false : isNavBarCollapsed,
  );

  const isExpanded = isSethStrict ? true : isCollapsed === false;

  const handleTogglerClick = React.useCallback(() => {
    if (isSethStrict) {
      return;
    }
    setCollapsedState((flag) => !flag);
    cookies.set(cookies.NAMES.NAV_BAR_COLLAPSED, isCollapsed ? 'false' : 'true');
  }, [ isCollapsed, isSethStrict ]);

  const handleContainerClick = React.useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      handleTogglerClick();
    }
  }, [ handleTogglerClick ]);

  const strictItems = React.useMemo(() => getSethStrictItems(router.pathname), [ router.pathname ]);
  const showStrictResources = isSethStrict;
  const showLogoLg = isSethStrict || isCollapsed === false;
  const showLogoXl = !isSethStrict && !isCollapsed;
  const showIconLg = !isSethStrict && isCollapsed !== false;
  const showIconXl = !isSethStrict && Boolean(isCollapsed);

  return (
    <Flex
      display={{ base: 'none', lg: 'flex' }}
      className="group"
      position="relative"
      flexDirection="column"
      alignItems="stretch"
      borderRight="1px solid"
      borderColor="seth.border"
      bgColor={ isSethStrict ? '#040608' : 'rgba(4, 6, 8, 0.86)' }
      backdropFilter={ isSethStrict ? 'none' : 'blur(14px)' }
      boxShadow={ isSethStrict ? 'none' : '0 0 0 1px rgba(0, 255, 163, 0.02), 0 12px 28px rgba(0, 0, 0, 0.35)' }
      px={{
        lg: isSethStrict ? 0 : (isExpanded ? 5 : 4),
        xl: isSethStrict ? 0 : (isCollapsed ? 4 : 5),
      }}
      pt={ isSethStrict ? 0 : 6 }
      pb={ isSethStrict ? 0 : 6 }
      width={{
        lg: isSethStrict ? '256px' : (isExpanded ? '255px' : '88px'),
        xl: isSethStrict ? '256px' : (isCollapsed ? '88px' : '255px'),
      }}
      onClick={ handleContainerClick }
      transitionProperty="width, padding"
      transitionDuration="normal"
      transitionTimingFunction="ease"
    >
      { !isSethStrict && <TestnetBadge position="absolute" pl={ 3 } w="49px" top="34px"/> }
      { !isSethStrict && <RollupStageBadge position="absolute" ml={{ lg: isExpanded ? 3 : '10px', xl: isCollapsed ? '10px' : 3 }} top="34px"/> }

      <Box
        as="header"
        display="flex"
        justifyContent="flex-start"
        alignItems="center"
        flexDirection="row"
        w="100%"
        pl={{
          lg: isSethStrict ? 6 : (isExpanded ? 3 : '15px'),
          xl: isSethStrict ? 6 : (isCollapsed ? '15px' : 3),
        }}
        pr={{
          lg: isSethStrict ? 6 : (isExpanded ? 0 : '15px'),
          xl: isSethStrict ? 6 : (isCollapsed ? '15px' : 0),
        }}
        h={ isSethStrict ? '64px' : 10 }
        borderBottomWidth="1px"
        borderBottomColor={ isSethStrict ? 'seth.border' : 'rgba(255, 255, 255, 0.06)' }
        pb={ isSethStrict ? 0 : 2.5 }
        transitionProperty="padding"
        transitionDuration="normal"
        transitionTimingFunction="ease"
      >
        { isSethStrict ? (
          <Link
            href={ route({ pathname: '/' }) }
            noIcon
            display="inline-flex"
            alignItems="center"
            columnGap={ 3 }
            aria-label="Link to main page"
          >
            <Image
              src="/assets/seth-logo.png"
              alt="Seth logo"
              boxSize="32px"
              borderRadius="lg"
              boxShadow="0 0 15px rgba(0,255,163,0.3)"
            />
            <Text
              fontSize="xl"
              fontWeight={ 700 }
              textShadow="0 0 8px rgba(0, 255, 163, 0.28)"
              letterSpacing="0.2px"
              style={{
                background: 'linear-gradient(90deg, #ffffff 0%, #d1fae5 52%, #34d399 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              SETH
            </Text>
          </Link>
        ) : (
          <Box display={{ base: 'none', lg: showLogoLg ? 'block' : 'none', xl: showLogoXl ? 'block' : 'none' }}>
            <NetworkLogo/>
          </Box>
        ) }
        <Box display={{ base: 'none', lg: showIconLg ? 'block' : 'none', xl: showIconXl ? 'block' : 'none' }}>
          <NetworkIcon/>
        </Box>
      </Box>

      { isSethStrict ? (
        <Box as="nav" mt={ 6 } px={ 3 } w="100%" display="flex" flexDirection="column" flexGrow={ 1 }>
          <Text
            fontSize="xs"
            lineHeight="16px"
            color="gray.500"
            textTransform="uppercase"
            letterSpacing="wider"
            fontWeight={ 600 }
            px={ 4 }
            mb={ 2 }
          >
            Menu
          </Text>
          <VStack as="ul" gap="1" alignItems="flex-start" mb={ 6 }>
            { strictItems.menuItems.map((item) => <StrictNavItem key={ item.text } item={ item }/>) }
          </VStack>

          { showStrictResources && (
            <>
              <Text
                fontSize="xs"
                lineHeight="16px"
                color="gray.500"
                textTransform="uppercase"
                letterSpacing="wider"
                fontWeight={ 600 }
                px={ 4 }
                mb={ 2 }
                mt={ 4 }
              >
                Resources
              </Text>
              <VStack as="ul" gap="1" alignItems="flex-start">
                { strictItems.resourcesItems.map((item) => <StrictNavItem key={ item.text } item={ item }/>) }
              </VStack>
            </>
          ) }

          <Box mt="auto" p={ 4 } borderTopWidth="1px" borderTopColor="seth.border">
            <Box
              p={ 3 }
              borderRadius="xl"
              borderWidth="1px"
              borderColor="seth.border"
              bg="linear-gradient(145deg, rgba(16, 24, 32, 0.92) 0%, rgba(10, 16, 20, 0.86) 100%)"
            >
              <Flex justifyContent="space-between" alignItems="center" mb={ 2 }>
                <Text fontSize="xs" color="text.secondary">Seth Price</Text>
                <Text fontSize="xs" color="seth.primary" fontWeight={ 600 }>+2.4%</Text>
              </Flex>
              <Text fontSize="lg" fontWeight={ 700 } lineHeight="short">$1,842.23</Text>
            </Box>
          </Box>
        </Box>
      ) : (
        <>
          <Box as="nav" mt={ 5 } w="100%">
            <VStack as="ul" gap="1" alignItems="flex-start">
              { mainNavItems.map((item) => {
                if (isGroupItem(item)) {
                  return <NavLinkGroup key={ item.text } item={ item } isCollapsed={ isCollapsed }/>;
                }
                return <NavLink key={ item.text } item={ item } isCollapsed={ isCollapsed }/>;
              }) }
            </VStack>
          </Box>
          { isAuth && (
            <Box as="nav" borderTopWidth="1px" borderColor="rgba(255, 255, 255, 0.06)" w="100%" mt={ 3 } pt={ 3 }>
              <VStack as="ul" gap="1" alignItems="flex-start">
                <NavLinkRewards isCollapsed={ isCollapsed }/>
                { accountNavItems.map((item) => <NavLink key={ item.text } item={ item } isCollapsed={ isCollapsed }/>) }
              </VStack>
            </Box>
          ) }
          <NavigationPromoBanner isCollapsed={ isCollapsed }/>
        </>
      ) }

      { !isSethStrict && (
        <IconSvg
          name="arrows/east-mini"
          width={ 6 }
          height={ 6 }
          _hover={{ color: 'hover' }}
          borderRadius="base"
          bgColor={{ base: 'bg.primary', _dark: 'rgba(10, 16, 20, 0.92)' }}
          color={{ base: 'blackAlpha.400', _dark: 'gray.300' }}
          borderWidth="1px"
          borderColor={{ base: 'border.divider', _dark: 'seth.border' }}
          transform={{ lg: isExpanded ? 'rotate(0)' : 'rotate(180deg)', xl: isCollapsed ? 'rotate(180deg)' : 'rotate(0)' }}
          transformOrigin="center"
          position="absolute"
          top="100px"
          left={{ lg: isExpanded ? '222px' : '76px', xl: isCollapsed ? '76px' : '222px' }}
          cursor="pointer"
          onClick={ handleTogglerClick }
          aria-label="Expand/Collapse menu"
          display="none"
          _groupHover={{ display: 'block' }}
          transitionProperty="transform, left"
          transitionDuration="normal"
          transitionTimingFunction="ease"
        />
      ) }
    </Flex>
  );
};

export default NavigationDesktop;
