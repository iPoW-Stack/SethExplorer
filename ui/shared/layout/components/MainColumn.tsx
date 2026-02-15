import { Flex, chakra } from '@chakra-ui/react';
import React from 'react';

import config from 'configs/app';
import useSethStrict from 'lib/settings/useSethStrict';

interface Props {
  className?: string;
  children: React.ReactNode;
}

const MainColumn = ({ children, className }: Props) => {
  const isSethStrict = useSethStrict();
  const desktopPaddingX = (() => {
    if (isSethStrict) {
      return 8;
    }

    return config.UI.navigation.layout === 'horizontal' ? 6 : 12;
  })();

  return (
    <Flex
      flexDir="column"
      flexGrow={ 1 }
      rowGap={ isSethStrict ? 2 : 3 }
      w={{ base: '100%', lg: config.UI.navigation.layout === 'horizontal' ? '100%' : 'auto' }}
      paddingX={{ base: 3, lg: desktopPaddingX }}
      paddingRight={{ '2xl': isSethStrict ? 8 : 6 }}
      paddingTop={{ base: isSethStrict ? 1 : '10px', lg: isSethStrict ? 2 : 5 }}
      paddingBottom={ isSethStrict ? 4 : 6 }
      className={ [ 'seth-page-shell', className ].filter(Boolean).join(' ') }
    >
      { children }
    </Flex>
  );
};

export default React.memo(chakra(MainColumn));
