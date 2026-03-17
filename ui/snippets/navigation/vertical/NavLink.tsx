import { HStack, Box, useBreakpointValue, chakra } from '@chakra-ui/react';
import React from 'react';

import type { NavItem } from 'types/client/navigation';

import { route } from 'nextjs-routes';

import useIsMobile from 'lib/hooks/useIsMobile';
import { isInternalItem } from 'lib/hooks/useNavItems';
import useSethStrict from 'lib/settings/useSethStrict';
import { Link } from 'toolkit/chakra/link';
import { Tooltip } from 'toolkit/chakra/tooltip';

import LightningLabel, { LIGHTNING_LABEL_CLASS_NAME } from '../LightningLabel';
import NavLinkIcon from '../NavLinkIcon';
import useNavLinkStyleProps from '../useNavLinkStyleProps';
import { checkRouteHighlight } from '../utils';

type Props = {
  item: NavItem;
  onClick?: (e: React.MouseEvent) => void;
  isCollapsed?: boolean;
  isDisabled?: boolean;
};

const NavLink = ({ item, onClick, isCollapsed, isDisabled }: Props) => {
  const isMobile = useIsMobile();
  const isSethStrict = useSethStrict();

  const isInternalLink = isInternalItem(item);

  const isExpanded = isCollapsed === false;

  const styleProps = useNavLinkStyleProps({ isCollapsed, isExpanded, isActive: isInternalLink && item.isActive });
  const isXLScreen = useBreakpointValue({ base: false, xl: true });

  const isHighlighted = checkRouteHighlight(item);

  return (
    <Box as="li" listStyleType="none" w="100%">
      <Link
        href={isInternalLink ? route(item.nextRoute) : item.url}
        external={!isInternalLink}
        {...styleProps.itemProps}
        w={{ base: '100%', lg: isExpanded ? '100%' : '60px', xl: isCollapsed ? '60px' : '100%' }}
        display="flex"
        position="relative"
        px={{
          base: 2,
          lg: isSethStrict ? 4 : (isExpanded ? 2 : '15px'),
          xl: isSethStrict ? 4 : (isCollapsed ? '15px' : 2),
        }}
        borderColor="transparent"
        aria-label={`${item.text} link`}
        whiteSpace="nowrap"
        onClick={onClick}
        _hover={{
          bgColor: { _light: 'transparent', _dark: 'rgba(255, 255, 255, 0.05)' },
          borderColor: { _light: 'transparent', _dark: 'rgba(255, 255, 255, 0.08)' },
          [`& *:not(.${LIGHTNING_LABEL_CLASS_NAME}, .${LIGHTNING_LABEL_CLASS_NAME} *)`]: {
            color: isDisabled ? 'inherit' : 'link.navigation.fg.hover',
          },
        }}
        _selected={{
          borderColor: { _light: 'transparent', _dark: 'rgba(0, 255, 163, 0.24)' },
          borderLeftWidth: '2px',
          borderLeftColor: { _light: 'blue.500', _dark: '#00FF94' },
          boxShadow: { _light: 'none', _dark: '0 0 14px rgba(0, 255, 163, 0.1)' },
          bgColor: { _light: 'transparent', _dark: 'rgba(0, 255, 163, 0.1)' },
        }}
      >
        <Tooltip
          content={item.text}
          showArrow={false}
          disabled={isMobile || isCollapsed === false || (isCollapsed === undefined && isXLScreen)}
          positioning={{ placement: 'right', offset: { crossAxis: 0, mainAxis: 20 } }}
          variant="popover"
          contentProps={{
            color: isInternalLink && item.isActive ? 'link.navigation.fg.selected' : 'link.navigation.fg.hover',
          }}
          interactive
        >
          <HStack gap={0} overflow="hidden">
            <NavLinkIcon item={item} />
            <chakra.span
              {...styleProps.textProps}
              ml={3}
              display={{ base: 'inline', lg: isExpanded ? 'inline' : 'none', xl: isCollapsed ? 'none' : 'inline' }}
            >
              <span>{item.text}</span>
            </chakra.span>
            {isHighlighted && (
              <LightningLabel
                iconColor={isInternalLink && item.isActive ? 'link.navigation.bg.selected' : 'link.navigation.bg.group'}
                isCollapsed={isCollapsed}
              />
            )}
          </HStack>
        </Tooltip>
      </Link>
    </Box>
  );
};

export default React.memo(NavLink);
