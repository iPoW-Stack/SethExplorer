import { Box, Flex, Text, chakra } from '@chakra-ui/react';
import React from 'react';

import type { Route } from 'nextjs-routes';
import { route } from 'nextjs-routes';

import { Link } from 'toolkit/chakra/link';
import { Skeleton } from 'toolkit/chakra/skeleton';
import { Hint } from 'toolkit/components/Hint/Hint';
import { TruncatedText } from 'toolkit/components/truncation/TruncatedText';
import IconSvg, { type IconName } from 'ui/shared/IconSvg';

export type Props = {
  className?: string;
  label: string;
  value: string | React.ReactNode;
  valuePrefix?: string;
  valuePostfix?: string;
  hint?: string | React.ReactNode;
  isLoading?: boolean;
  diff?: string | number;
  diffFormatted?: string;
  diffPeriod?: '24h';
  period?: '1h' | '24h' | '30min';
  href?: Route;
  icon?: IconName;
};

const Container = ({ href, children, className }: { href?: Route; children: React.JSX.Element; className?: string }) => {
  if (href) {
    return (
      <Link href={ route(href) } variant="plain" className={ className }>
        { children }
      </Link>
    );
  }

  return children;
};

const StatsWidget = ({
  className,
  icon,
  label,
  value,
  valuePrefix,
  valuePostfix,
  isLoading,
  hint,
  diff,
  diffPeriod = '24h',
  diffFormatted,
  period,
  href,
}: Props) => {
  return (
    <Container href={ !isLoading ? href : undefined } className={ href ? className : undefined }>
      <Flex
        className={ href ? undefined : className }
        alignItems="center"
        bg={ isLoading ? { _light: 'blackAlpha.50', _dark: 'whiteAlpha.50' } : { _light: 'theme.stats.bg._light', _dark: 'linear-gradient(160deg, rgba(28, 28, 28, 0.94) 0%, rgba(20, 20, 20, 0.9) 100%)' } }
        p={{ base: 2.5, lg: 3 }}
        borderRadius="lg"
        borderWidth="1px"
        borderColor={{ _light: 'transparent', _dark: 'rgba(255, 255, 255, 0.06)' }}
        boxShadow={{ _light: 'none', _dark: 'inset 0 0 0 1px rgba(255, 255, 255, 0.02), 0 8px 20px rgba(0, 0, 0, 0.32)' }}
        justifyContent="space-between"
        columnGap={ 2 }
        w="100%"
        h="100%"
      >
        { icon && (
          <IconSvg
            name={ icon }
            p={ 2 }
            boxSize="40px"
            isLoading={ isLoading }
            borderRadius="base"
            bg={{ _light: 'blackAlpha.100', _dark: 'rgba(0, 255, 148, 0.14)' }}
            borderWidth="1px"
            borderColor={{ _light: 'transparent', _dark: 'rgba(0, 255, 148, 0.3)' }}
            color={{ _light: 'icon.primary', _dark: '#b8ffe0' }}
            display={{ base: 'none', lg: 'block' }}
            flexShrink={ 0 }
          />
        ) }
        <Box
          w={{
            base: `calc(100% - ${ hint ? '24px' : '0px' })`,
            lg: `calc(100% - ${ icon ? '48px' : '0px' } - ${ hint ? '24px' : '0px' })`,
          }}
        >
          <Skeleton
            loading={ isLoading }
            color="gray.400"
            textStyle="sm"
            w="fit-content"
          >
            <h2>{ label }</h2>
          </Skeleton>
          <Skeleton
            loading={ isLoading }
            display="flex"
            alignItems="baseline"
            fontWeight={ 700 }
            fontSize={{ base: '26px', lg: '32px' }}
            lineHeight={{ base: '32px', lg: '38px' }}
          >
            { valuePrefix && <chakra.span whiteSpace="pre">{ valuePrefix }</chakra.span> }
            { typeof value === 'string' ? (
              <TruncatedText text={ value } loading={ isLoading }/>
            ) : (
              value
            ) }
            { valuePostfix && <chakra.span whiteSpace="pre">{ valuePostfix }</chakra.span> }
            { diff && Number(diff) > 0 && (
              <>
                <Text ml={ 2 } mr={ 1 } color="green.500">
                  +{ diffFormatted || Number(diff).toLocaleString() }
                </Text>
                <Text color="text.secondary" textStyle="sm">({ diffPeriod })</Text>
              </>
            ) }
            { period && <Text color="text.secondary" textStyle="xs" fontWeight={ 400 } ml={ 1 }>({ period })</Text> }
          </Skeleton>
        </Box>
        { typeof hint === 'string' ? (
          <Skeleton loading={ isLoading } alignSelf="center" borderRadius="base">
            <Hint label={ hint } boxSize={ 5 } color="icon.secondary"/>
          </Skeleton>
        ) : hint }
      </Flex>
    </Container>
  );
};

export default chakra(StatsWidget);
