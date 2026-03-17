import type { GridProps, HTMLChakraProps } from '@chakra-ui/react';
import { Box, Grid, Flex, Text, VStack } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import React from 'react';

import type { CustomLinksGroup } from 'types/footerLinks';

import config from 'configs/app';
import type { ResourceError } from 'lib/api/resources';
import useApiQuery from 'lib/api/useApiQuery';
import useFetch from 'lib/hooks/useFetch';
import useIssueUrl from 'lib/hooks/useIssueUrl';
import useSethStrict from 'lib/settings/useSethStrict';
import { Image } from 'toolkit/chakra/image';
import { Link } from 'toolkit/chakra/link';
import { Skeleton } from 'toolkit/chakra/skeleton';
import { copy } from 'toolkit/utils/htmlEntities';
import IconSvg from 'ui/shared/IconSvg';
import { CONTENT_MAX_WIDTH } from 'ui/shared/layout/utils';
import NetworkAddToWallet from 'ui/shared/NetworkAddToWallet';

import FooterLinkItem from './FooterLinkItem';
import IntTxsIndexingStatus from './IntTxsIndexingStatus';
import getApiVersionUrl from './utils/getApiVersionUrl';

const MAX_LINKS_COLUMNS = 4;

const SETH_REPO_URL = 'https://github.com/iPoW-Stack/SethExplorer';
const SETH_SITE_URL = 'https://seth.app';

const FRONT_VERSION_URL = `${ SETH_REPO_URL }/tree/${ config.UI.footer.frontendVersion }`;
const FRONT_COMMIT_URL = `${ SETH_REPO_URL }/commit/${ config.UI.footer.frontendCommit }`;

function sanitizeBrandText(value: string) {
  return value.replace(/blockscout/gi, 'Seth Explorer');
}

function sanitizeBrandUrl(url: string) {
  return url
    .replace(/https?:\/\/(www\.)?blockscout\.com/gi, SETH_SITE_URL)
    .replace(/https?:\/\/eth\.blockscout\.com/gi, 'https://explorer.seth.app')
    .replace(/https?:\/\/github\.com\/blockscout\/frontend/gi, SETH_REPO_URL)
    .replace(/https?:\/\/github\.com\/blockscout\/blockscout/gi, SETH_REPO_URL);
}

const Footer = () => {
  const isSethStrict = useSethStrict();

  const { data: backendVersionData } = useApiQuery('general:config_backend_version', {
    queryOptions: {
      staleTime: Infinity,
      enabled: !config.features.opSuperchain.isEnabled,
    },
  });
  const apiVersionUrl = getApiVersionUrl(backendVersionData?.backend_version);
  const issueUrl = useIssueUrl(backendVersionData?.backend_version);

  const SETH_LINKS = [
    {
      icon: 'edit' as const,
      iconSize: '16px',
      text: 'Submit an issue',
      url: issueUrl,
    },
    {
      icon: 'social/git' as const,
      iconSize: '18px',
      text: 'Source code',
      url: SETH_REPO_URL,
    },
    {
      icon: 'social/twitter' as const,
      iconSize: '18px',
      text: 'Seth website',
      url: SETH_SITE_URL,
    },
    {
      icon: 'API' as const,
      iconSize: '18px',
      text: 'API docs',
      url: `${ SETH_SITE_URL }/api`,
    },
    {
      icon: 'donate' as const,
      iconSize: '20px',
      text: 'Explorer status',
      url: 'https://explorer.seth.app/stats',
    },
  ];

  const frontendLink = (() => {
    if (config.UI.footer.frontendVersion) {
      return <Link href={ FRONT_VERSION_URL } external noIcon>{ config.UI.footer.frontendVersion }</Link>;
    }

    if (config.UI.footer.frontendCommit) {
      return <Link href={ FRONT_COMMIT_URL } external noIcon>{ config.UI.footer.frontendCommit }</Link>;
    }

    return null;
  })();

  const fetch = useFetch();

  const { isPlaceholderData, data: linksData } = useQuery<unknown, ResourceError<unknown>, Array<CustomLinksGroup>>({
    queryKey: [ 'footer-links' ],
    queryFn: async() => fetch(config.UI.footer.links || '', undefined, { resource: 'footer-links' }),
    enabled: Boolean(config.UI.footer.links),
    staleTime: Infinity,
    placeholderData: [],
  });

  const sanitizedLinksData = React.useMemo(() => {
    if (!linksData) {
      return [];
    }

    return linksData.map((group) => ({
      ...group,
      title: sanitizeBrandText(group.title),
      links: group.links.map((link) => ({
        ...link,
        text: sanitizeBrandText(link.text),
        url: sanitizeBrandUrl(link.url),
      })),
    }));
  }, [ linksData ]);

  const colNum = isPlaceholderData ? 1 : Math.min(linksData?.length || Infinity, MAX_LINKS_COLUMNS) + 1;

  const renderNetworkInfo = React.useCallback((gridArea?: GridProps['gridArea']) => {
    return (
      <Flex
        alignItems="center"
        gridArea={ gridArea }
        flexWrap="wrap"
        justifyContent="flex-start"
        columnGap={ 3 }
        rowGap={ 2 }
        mb={{ base: 5, lg: 10 }}
        _empty={{ display: 'none' }}
      >
        { !config.UI.indexingAlert.intTxs.isHidden && <IntTxsIndexingStatus/> }
        { !config.features.opSuperchain.isEnabled && <NetworkAddToWallet source="Footer"/> }
      </Flex>
    );
  }, []);

  const renderProjectInfo = React.useCallback((gridArea?: GridProps['gridArea']) => {
    const logoColor = { base: 'blue.600', _dark: 'white' };

    return (
      <Box gridArea={ gridArea }>
        <Flex columnGap={ 2 } textStyle="xs" alignItems="center">
          <span>Made with</span>
          <Link href={ SETH_SITE_URL } external noIcon display="inline-flex" color={ logoColor } _hover={{ color: logoColor }}>
            <Flex alignItems="center" gap={ 2 }>
              <Image src="/assets/seth-logo.png" alt="Seth logo" boxSize="20px"/>
              <Text fontWeight={ 700 } color={ logoColor }>Seth</Text>
            </Flex>
          </Link>
        </Flex>
        <Text mt={ 3 } fontSize="xs">
          Seth Explorer provides a real-time view of the Seth network: blocks, transactions, addresses, tokens, and API data.
        </Text>
        <Box mt={ 6 } alignItems="start" textStyle="xs">
          { apiVersionUrl && (
            <Text>
              Backend: <Link href={ apiVersionUrl } external noIcon>{ backendVersionData?.backend_version }</Link>
            </Text>
          ) }
          { frontendLink && (
            <Text>
              Frontend: { frontendLink }
            </Text>
          ) }
          <Text>
            Copyright { copy } Seth Explorer 2023-{ (new Date()).getFullYear() }
          </Text>
        </Box>
      </Box>
    );
  }, [ apiVersionUrl, backendVersionData?.backend_version, frontendLink ]);

  const containerProps: HTMLChakraProps<'div'> = {
    as: 'footer',
    borderTopWidth: '1px',
    borderTopColor: { _light: 'border.divider', _dark: 'seth.border' },
    bgColor: { _light: 'transparent', _dark: 'rgba(4, 6, 8, 0.78)' },
    backdropFilter: { _dark: 'blur(10px)' },
    boxShadow: { _light: 'none', _dark: 'inset 0 1px 0 rgba(0, 255, 163, 0.04)' },
  };

  if (isSethStrict) {
    const currentYear = (new Date()).getFullYear();

    return (
      <Box as="footer" borderTopWidth="1px" borderTopColor="seth.border">
        <Flex
          px={{ base: 4, lg: 8 }}
          py={{ base: 4, lg: 5 }}
          direction="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          gap={ 3 }
          color="gray.500"
          fontSize="sm"
        >
          <Flex alignItems="center" justifyContent="center" gap={ 6 }>
            <Link href="https://seth.app/terms" external noIcon color="gray.500" _hover={{ color: 'seth.primary' }}>Terms</Link>
            <Link href="https://seth.app/privacy" external noIcon color="gray.500" _hover={{ color: 'seth.primary' }}>Privacy</Link>
            <Link href="/api-docs" noIcon color="gray.500" _hover={{ color: 'seth.primary' }}>API</Link>
          </Flex>
          <Flex alignItems="center" justifyContent="center" gap={ 1 } color="gray.500">
            <Text as="span">&copy; { currentYear } Seth Explorer. Built with</Text>
            <IconSvg name="heart_filled" boxSize={ 3.5 } color="#ef4444"/>
            <Text as="span">for the decentralized world.</Text>
          </Flex>
        </Flex>
      </Box>
    );
  }

  const contentProps: GridProps = {
    px: { base: 4, lg: config.UI.navigation.layout === 'horizontal' ? 6 : 12, '2xl': 6 },
    py: { base: 4, lg: 6 },
    rowGap: 6,
    gridTemplateColumns: { base: '1fr', lg: 'minmax(auto, 470px) 1fr' },
    columnGap: { lg: '32px', xl: '100px' },
    maxW: `${ CONTENT_MAX_WIDTH }px`,
    m: '0 auto',
  };

  const renderRecaptcha = (gridArea?: GridProps['gridArea']) => {
    if (!config.services.reCaptchaV2.siteKey) {
      return <Box gridArea={ gridArea }/>;
    }

    return (
      <Box gridArea={ gridArea } textStyle="xs" mt={ 6 }>
        <span>This site is protected by reCAPTCHA and the Google </span>
        <Link href="https://policies.google.com/privacy" external noIcon>Privacy Policy</Link>
        <span> and </span>
        <Link href="https://policies.google.com/terms" external noIcon>Terms of Service</Link>
        <span> apply.</span>
      </Box>
    );
  };

  if (config.UI.footer.links) {
    return (
      <Box { ...containerProps }>
        <Grid { ...contentProps }>
          <div>
            { renderNetworkInfo() }
            { renderProjectInfo() }
            { renderRecaptcha() }
          </div>

          <Grid
            gap={{ base: 6, lg: colNum === MAX_LINKS_COLUMNS + 1 ? 2 : 8, xl: 12 }}
            gridTemplateColumns={{
              base: 'repeat(auto-fill, 160px)',
              lg: `repeat(${ colNum }, 135px)`,
              xl: `repeat(${ colNum }, 160px)`,
            }}
            justifyContent={{ lg: 'flex-end' }}
            mt={{ base: 8, lg: 0 }}
          >
            {
              ([
                { title: 'Seth Explorer', links: SETH_LINKS },
                ...sanitizedLinksData,
              ])
                .slice(0, colNum)
                .map(linkGroup => (
                  <Box key={ linkGroup.title }>
                    <Skeleton fontWeight={ 500 } mb={ 3 } display="inline-block" loading={ isPlaceholderData }>{ linkGroup.title }</Skeleton>
                    <VStack gap={ 1 } alignItems="start">
                      { linkGroup.links.map(link => <FooterLinkItem { ...link } key={ `${ link.text }-${ link.url }` } isLoading={ isPlaceholderData }/>) }
                    </VStack>
                  </Box>
                ))
            }
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box { ...containerProps }>
      <Grid
        { ...contentProps }
        gridTemplateAreas={{
          lg: `
          "network links-top"
          "info links-bottom"
          "recaptcha links-bottom"
        `,
        }}
      >

        { renderNetworkInfo({ lg: 'network' }) }
        { renderProjectInfo({ lg: 'info' }) }
        { renderRecaptcha({ lg: 'recaptcha' }) }

        <Grid
          gridArea={{ lg: 'links-bottom' }}
          gap={ 1 }
          gridTemplateColumns={{
            base: 'repeat(auto-fill, 160px)',
            lg: 'repeat(2, 160px)',
            xl: 'repeat(3, 160px)',
          }}
          gridTemplateRows={{
            base: 'auto',
            lg: 'repeat(3, auto)',
            xl: 'repeat(2, auto)',
          }}
          gridAutoFlow={{ base: 'row', lg: 'column' }}
          alignContent="start"
          justifyContent={{ lg: 'flex-end' }}
          mt={{ base: 8, lg: 0 }}
        >
          { SETH_LINKS.map(link => <FooterLinkItem { ...link } key={ link.text }/>) }
        </Grid>
      </Grid>
    </Box>
  );
};

export default React.memo(Footer);
