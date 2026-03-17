import { Box, Flex, HStack, Text } from '@chakra-ui/react';
import React from 'react';

import type { ButtonProps } from 'toolkit/chakra/button';
import { Button } from 'toolkit/chakra/button';
import IconSvg, { type IconName } from 'ui/shared/IconSvg';

interface ExplorerEmptyStateAction {
  label: string;
  href: string;
  variant?: ButtonProps['variant'];
}

interface Props {
  title: string;
  description: string;
  iconName?: IconName;
  primaryAction?: ExplorerEmptyStateAction;
  secondaryAction?: ExplorerEmptyStateAction;
  testId?: string;
  hint?: string;
}

const ExplorerEmptyState = ({
  title,
  description,
  iconName = 'search',
  primaryAction,
  secondaryAction,
  testId,
  hint,
}: Props) => {
  return (
    <Flex
      data-testid={ testId }
      direction="column"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      w="100%"
      minH={{ base: '220px', lg: '260px' }}
      borderWidth="1px"
      borderColor="seth.border"
      borderRadius="xl"
      bg="linear-gradient(160deg, rgba(12, 18, 22, 0.82) 0%, rgba(8, 12, 16, 0.92) 100%)"
      px={{ base: 4, lg: 8 }}
      py={{ base: 8, lg: 10 }}
      gap={ 4 }
    >
      <Flex
        boxSize="48px"
        borderRadius="full"
        alignItems="center"
        justifyContent="center"
        bg="rgba(0, 255, 163, 0.12)"
        borderWidth="1px"
        borderColor="rgba(0, 255, 163, 0.35)"
        boxShadow="0 0 20px rgba(0, 255, 163, 0.08)"
      >
        <IconSvg name={ iconName } boxSize={ 6 } color="seth.primary"/>
      </Flex>

      <Box maxW="560px">
        <Text fontSize="16px" fontWeight={ 600 } color="gray.100">
          { title }
        </Text>
        <Text mt={ 2 } color="text.secondary" fontSize="14px">
          { description }
        </Text>
        { hint && (
          <Text mt={ 2 } color="gray.400" fontSize="xs">
            { hint }
          </Text>
        ) }
      </Box>

      { (primaryAction || secondaryAction) && (
        <HStack gap={ 3 } flexWrap="wrap" justifyContent="center">
          { primaryAction && (
            <Button asChild size="sm" variant={ primaryAction.variant ?? 'solid' }>
              <a href={ primaryAction.href }>{ primaryAction.label }</a>
            </Button>
          ) }
          { secondaryAction && (
            <Button asChild size="sm" variant={ secondaryAction.variant ?? 'outline' }>
              <a href={ secondaryAction.href }>{ secondaryAction.label }</a>
            </Button>
          ) }
        </HStack>
      ) }
    </Flex>
  );
};

export default React.memo(ExplorerEmptyState);
