import type { DocumentContext } from 'next/document';
import Document, { Html, Head, Main, NextScript } from 'next/document';
import React from 'react';

import logRequestFromBot from 'nextjs/utils/logRequestFromBot';
import * as serverTiming from 'nextjs/utils/serverTiming';

import config from 'configs/app';
import * as svgSprite from 'ui/shared/IconSvg';

const marketplaceFeature = config.features.marketplace;

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const originalRenderPage = ctx.renderPage;
    ctx.renderPage = async() => {
      const start = Date.now();
      const result = await originalRenderPage();
      const end = Date.now();

      serverTiming.appendValue(ctx.res, 'renderPage', end - start);

      return result;
    };

    await logRequestFromBot(ctx.req, ctx.res, ctx.pathname);

    const initialProps = await Document.getInitialProps(ctx);

    return initialProps;
  }

  render() {
    return (
      <Html lang="en">
        <Head>
          { /* FONTS */ }
          <link
            href={ config.UI.fonts.heading?.url ?? 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap' }
            rel="stylesheet"
          />
          <link
            href={ config.UI.fonts.body?.url ?? 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' }
            rel="stylesheet"
          />

          { /* eslint-disable-next-line @next/next/no-sync-scripts */ }
          <script src="/assets/envs.js"/>
          { config.features.opSuperchain.isEnabled && (
            <>
              { /* eslint-disable-next-line @next/next/no-sync-scripts */ }
              <script src="/assets/multichain/config.js"/>
            </>
          ) }
          { marketplaceFeature.isEnabled && marketplaceFeature.essentialDapps && (
            <>
              { /* eslint-disable-next-line @next/next/no-sync-scripts */ }
              <script src="/assets/essential-dapps/chains.js"/>
            </>
          ) }

          { /* FAVICON */ }
          <link rel="icon" type="image/svg+xml" href="/favicon-seth.svg?v=seth-20260302-r2"/>
          <link rel="icon" href="/favicon-seth.ico?v=seth-20260302-r2"/>
          <link rel="shortcut icon" href="/favicon.ico?v=seth-20260302-r2"/>
          <link rel="apple-touch-icon" href="/apple-touch-icon-seth.png?v=seth-20260302-r2"/>
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=seth-20260302-r2"/>
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-seth-16x16.png?v=seth-20260302-r2"/>
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-seth-32x32.png?v=seth-20260302-r2"/>
          <link rel="icon" type="image/png" sizes="192x192" href="/assets/favicon/android-chrome-192x192.png?v=seth-20260302-r2"/>
          <link rel="preload" as="image" href={ svgSprite.href }/>
        </Head>
        <body>
          <Main/>
          <NextScript/>
        </body>
      </Html>
    );
  }
}

export default MyDocument;
