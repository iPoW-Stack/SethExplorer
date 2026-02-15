import { defineRecipe } from '@chakra-ui/react';

export const recipe = defineRecipe({
  base: {
    gap: 0,
    transitionProperty: 'background-color,border-color,color,box-shadow',
    transitionDuration: 'normal',
    _disabled: {
      cursor: 'not-allowed',
    },
  },
  variants: {
    variant: {
      primary: {
        color: 'link.primary',
        _hover: {
          textDecoration: 'none',
          color: 'link.primary.hover',
        },
      },
      secondary: {
        color: 'link.secondary',
        _hover: {
          textDecoration: 'none',
          color: 'hover',
        },
      },
      subtle: {
        color: 'link.subtle',
        _hover: {
          color: 'link.subtle.hover',
          textDecorationLine: 'underline',
          textDecorationColor: 'link.subtle.hover',
        },
      },
      underlaid: {
        color: 'link.primary',
        bgColor: 'link.underlaid.bg',
        px: '8px',
        py: '6px',
        borderRadius: 'base',
        borderWidth: '1px',
        borderColor: { _light: 'transparent', _dark: 'seth.border' },
        textStyle: 'sm',
        _hover: {
          color: 'link.primary.hover',
          borderColor: { _light: 'transparent', _dark: 'hover' },
          textDecoration: 'none',
        },
      },
      menu: {
        color: 'link.menu',
        _hover: {
          color: 'hover',
          textDecoration: 'none',
        },
      },
      navigation: {
        color: 'link.navigation.fg',
        bg: { _light: 'transparent', _dark: 'transparent' },
        borderWidth: '1px',
        borderColor: 'transparent',
        borderRadius: 'base',
        _hover: {
          color: 'link.navigation.fg.hover',
          bg: { _light: 'transparent', _dark: 'rgba(255, 255, 255, 0.05)' },
          borderColor: { _light: 'transparent', _dark: 'rgba(255, 255, 255, 0.08)' },
          textDecoration: 'none',
        },
        _selected: {
          color: 'link.navigation.fg.selected',
          bg: 'link.navigation.bg.selected',
          borderColor: { _light: 'transparent', _dark: 'rgba(0, 255, 163, 0.28)' },
          boxShadow: { _light: 'none', _dark: '0 0 16px rgba(0, 255, 163, 0.12)' },
        },
        _active: {
          color: 'link.navigation.fg.active',
        },
      },
      plain: {
        color: 'inherit',
        _hover: {
          textDecoration: 'none',
        },
      },
    },
  },
  defaultVariants: {
    variant: 'primary',
  },
});
