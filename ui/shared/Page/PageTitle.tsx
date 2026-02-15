import { Flex, chakra } from '@chakra-ui/react';
import { debounce } from 'es-toolkit';
import React from 'react';

import useIsMobile from 'lib/hooks/useIsMobile';
import useSethStrict from 'lib/settings/useSethStrict';
import { Heading } from 'toolkit/chakra/heading';
import { Skeleton } from 'toolkit/chakra/skeleton';
import { Tooltip } from 'toolkit/chakra/tooltip';
import { useDisclosure } from 'toolkit/hooks/useDisclosure';
import TextAd from 'ui/shared/ad/TextAd';

type Props = {
  title: string;
  className?: string;
  beforeTitle?: React.ReactNode;
  afterTitle?: React.ReactNode;
  contentAfter?: React.ReactNode;
  secondRow?: React.ReactNode;
  isLoading?: boolean;
  withTextAd?: boolean;
};

const TEXT_MAX_LINES = 1;

const PageTitle = ({ title, contentAfter, withTextAd, className, isLoading = false, afterTitle, beforeTitle, secondRow }: Props) => {
  const tooltip = useDisclosure();
  const isMobile = useIsMobile();
  const isSethStrict = useSethStrict();
  const [ isTextTruncated, setIsTextTruncated ] = React.useState(false);

  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const textRef = React.useRef<HTMLSpanElement>(null);

  const updatedTruncateState = React.useCallback(() => {
    if (!headingRef.current || !textRef.current) {
      return;
    }

    const headingRect = headingRef.current.getBoundingClientRect();
    const textRect = textRef.current.getBoundingClientRect();
    if ((TEXT_MAX_LINES + 1) * headingRect.height <= textRect.height) {
      setIsTextTruncated(true);
    } else {
      setIsTextTruncated(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isLoading) {
      updatedTruncateState();
    }
  }, [ isLoading, updatedTruncateState ]);

  React.useEffect(() => {
    const handleResize = debounce(updatedTruncateState, 1000);
    window.addEventListener('resize', handleResize);

    return function cleanup() {
      window.removeEventListener('resize', handleResize);
    };
  }, [ updatedTruncateState ]);

  const handleTooltipOpenChange = React.useCallback((details: { open: boolean }) => {
    if (details.open) {
      tooltip.onOpen();
    } else {
      tooltip.onClose();
    }
  }, [ tooltip ]);

  return (
    <Flex
      className={ [ 'seth-page-shell', className ].filter(Boolean).join(' ') }
      flexDir="column"
      rowGap={ isSethStrict ? 2 : 4 }
      mb={ isSethStrict ? 5 : 6 }
    >
      <Flex
        flexDir="row"
        flexWrap="wrap"
        rowGap={ 2.5 }
        columnGap={ 3 }
        alignItems="center"
        px={ isSethStrict ? 0 : { base: 3, lg: 4 } }
        py={ isSethStrict ? 0 : { base: 3, lg: 3.5 } }
        pb={ isSethStrict ? 4 : undefined }
        borderRadius={ isSethStrict ? 0 : 'xl' }
        borderWidth={ isSethStrict ? 0 : '1px' }
        borderColor={ isSethStrict ? undefined : { _light: 'transparent', _dark: 'rgba(255, 255, 255, 0.08)' } }
        borderBottomWidth={ isSethStrict ? '1px' : undefined }
        borderBottomColor={ isSethStrict ? 'seth.border' : undefined }
        bgColor={ isSethStrict ? 'transparent' : { _light: 'transparent', _dark: 'rgba(10, 16, 20, 0.78)' } }
        backdropFilter={ isSethStrict ? undefined : { _dark: 'blur(10px)' } }
        boxShadow={ isSethStrict ? 'none' : { _light: 'none', _dark: 'inset 0 0 0 1px rgba(0, 255, 163, 0.03)' } }
      >
        <Flex h={{ base: 'auto', lg: isLoading ? 10 : 'auto' }} maxW="100%" alignItems="center">
          { beforeTitle }
          <Skeleton
            loading={ isLoading }
            overflow="hidden"
          >
            <Tooltip
              content={ title }
              open={ tooltip.open }
              onOpenChange={ handleTooltipOpenChange }
              contentProps={{ maxW: { base: 'calc(100vw - 32px)', lg: '500px' } }}
              closeOnScroll={ isMobile ? true : false }
              disabled={ !isTextTruncated }
            >
              <Heading
                ref={ headingRef }
                level="1"
                textStyle={ isSethStrict ? { base: 'heading.lg', lg: 'heading.lg' } : undefined }
                whiteSpace="normal"
                wordBreak="break-all"
                style={{
                  WebkitLineClamp: TEXT_MAX_LINES,
                  WebkitBoxOrient: 'vertical',
                  display: '-webkit-box',
                }}
                overflow="hidden"
                textOverflow="ellipsis"
                onMouseEnter={ tooltip.onOpen }
                onMouseLeave={ tooltip.onClose }
                onClick={ isMobile ? tooltip.onToggle : undefined }
              >
                <span ref={ textRef }>
                  { title }
                </span>
              </Heading>
            </Tooltip>
          </Skeleton>
          { afterTitle }
        </Flex>
        { contentAfter }
        { withTextAd && <TextAd order={{ base: -1, lg: 100 }} mb={{ base: 6, lg: 0 }} ml="auto" w={{ base: '100%', lg: 'auto' }}/> }
      </Flex>
      { secondRow && (
        <Skeleton
          loading={ isLoading }
          alignItems="center"
          minH={ 10 }
          overflow="hidden"
          display="flex"
          _empty={{ display: 'none' }}
          px={ isSethStrict ? 0 : { base: 3, lg: 4 } }
          py={ isSethStrict ? 0 : { base: 2, lg: 3 } }
          borderRadius={ isSethStrict ? 0 : 'xl' }
          borderWidth={ isSethStrict ? 0 : '1px' }
          borderColor={ isSethStrict ? undefined : { _light: 'transparent', _dark: 'rgba(255, 255, 255, 0.08)' } }
          bgColor={ isSethStrict ? 'transparent' : { _light: 'transparent', _dark: 'rgba(10, 16, 20, 0.64)' } }
        >
          { secondRow }
        </Skeleton>
      ) }
    </Flex>
  );
};

export default chakra(PageTitle);
