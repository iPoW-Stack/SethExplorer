import { chakra } from '@chakra-ui/react';
import React from 'react';
import { FaBorderAll, FaChartLine, FaCode, FaCoins, FaCube, FaRightLeft, FaWallet } from 'react-icons/fa6';

import type { NavItem, NavGroupItem } from 'types/client/navigation';

import useSethStrict from 'lib/settings/useSethStrict';
import IconSvg from 'ui/shared/IconSvg';

interface Props {
  className?: string;
  item: NavItem | NavGroupItem;
}

const NavLinkIcon = ({ item, className }: Props) => {
  const isSethStrict = useSethStrict();
  const iconSize = isSethStrict ? 5 : '30px';

  if (isSethStrict && 'icon' in item && item.icon) {
    const strictIconByName = {
      'navigation/blockchain': FaBorderAll,
      'navigation/block': FaCube,
      'navigation/transactions': FaRightLeft,
      'navigation/top_accounts': FaWallet,
      'navigation/tokens': FaCoins,
      'navigation/stats': FaChartLine,
      'navigation/api_docs': FaCode,
    } as const;

    const StrictIcon = strictIconByName[item.icon as keyof typeof strictIconByName];
    if (StrictIcon) {
      return <StrictIcon className={ className } size={ 14 } style={{ flexShrink: 0 }}/>;
    }
  }

  if ('icon' in item && item.icon) {
    return <IconSvg className={ className } name={ item.icon } boxSize={ iconSize } flexShrink={ 0 } fill="currentColor"/>;
  }
  if ('iconComponent' in item && item.iconComponent) {
    const IconComponent = item.iconComponent;
    return <IconComponent className={ className } size={ isSethStrict ? 20 : 30 }/>;
  }

  return null;
};

export default chakra(NavLinkIcon);
