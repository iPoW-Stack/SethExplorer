import React from 'react';

import type { Props } from './types';

import config from 'configs/app';
import useSethStrict from 'lib/settings/useSethStrict';
import AppErrorBoundary from 'ui/shared/AppError/AppErrorBoundary';
import HeaderAlert from 'ui/snippets/header/HeaderAlert';
import HeaderDesktop from 'ui/snippets/header/HeaderDesktop';
import HeaderMobile from 'ui/snippets/header/HeaderMobile';

import * as Layout from './components';

const LayoutHome = ({ children }: Props) => {
  const isSethStrict = useSethStrict();

  return (
    <Layout.Root content={ children }>
      <Layout.Container>
        { config.UI.navigation.layout === 'horizontal' && <Layout.TopRow/> }
        <Layout.NavBar/>
        <HeaderMobile hideSearchButton/>
        <Layout.MainArea>
          <Layout.SideBar/>
          <Layout.MainColumn
            paddingTop={{ base: 3, lg: isSethStrict ? 8 : 6 }}
          >
            <HeaderAlert mb={ isSethStrict ? 0 : 3 }/>
            { isSethStrict && <HeaderDesktop/> }
            <AppErrorBoundary>
              { children }
            </AppErrorBoundary>
          </Layout.MainColumn>
        </Layout.MainArea>
        <Layout.Footer/>
      </Layout.Container>
    </Layout.Root>
  );
};

export default LayoutHome;
