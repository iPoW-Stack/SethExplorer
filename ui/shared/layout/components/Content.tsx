import { Box, chakra } from '@chakra-ui/react';
import React from 'react';

import useSethStrict from 'lib/settings/useSethStrict';

interface Props {
  className?: string;
  children: React.ReactNode;
}

const Content = ({ children, className }: Props) => {
  const isSethStrict = useSethStrict();

  return (
    <Box
      pt={{ base: 0, lg: isSethStrict ? 0 : 4 }}
      as="main"
      flexGrow={ 1 }
      className={ [ 'seth-page-shell', className ].filter(Boolean).join(' ') }
      position="relative"
      zIndex={ 1 }
    >
      { children }
    </Box>
  );
};

export default React.memo(chakra(Content));
