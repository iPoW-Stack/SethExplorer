import { defineRecipe } from '@chakra-ui/react';

export const recipe = defineRecipe({
  base: {
    width: '100%',
    minWidth: '0',
    outline: '0',
    position: 'relative',
    appearance: 'textfield',
    textAlign: 'start',
    borderRadius: 'lg',
    height: 'var(--input-height)',
    minW: 'var(--input-height)',
    color: 'input.fg',
    '--focus-color': 'colors.border.error',
    '--error-color': 'colors.border.error',
    fontWeight: 'medium',
    transitionProperty: 'border-color,background-color,box-shadow,color',
    transitionDuration: 'normal',
    _invalid: {
      focusRingColor: 'var(--error-color)',
      borderColor: 'var(--error-color)',
    },
    _readOnly: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
  },

  variants: {
    size: {
      sm: {
        textStyle: 'sm',
        px: '2',
        '--input-height': 'sizes.8',
      },
      md: {
        textStyle: 'sm',
        px: '2',
        '--input-height': 'sizes.10',
      },
      lg: {
        textStyle: 'md',
        px: '4',
        '--input-height': '60px',
      },
    },

    variant: {
      outline: {
        bg: 'input.bg',
        borderWidth: '2px',
        borderColor: 'input.border.filled',
        _dark: {
          background: 'rgba(10, 16, 20, 0.78)',
          backdropFilter: 'blur(10px)',
        },
        focusVisibleRing: 'none',
        _placeholder: {
          color: 'input.placeholder',
        },
        _placeholderShown: {
          borderColor: 'input.border',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          _invalid: {
            borderColor: 'input.border.error',
          },
        },
        _hover: {
          borderColor: 'input.border.hover',
        },
        _focus: {
          borderColor: 'input.border.focus',
          boxShadow: { _light: 'size.md', _dark: '0 0 0 1px rgba(0, 255, 163, 0.3), 0 0 16px rgba(0, 255, 163, 0.16)' },
          _hover: {
            borderColor: 'input.border.focus',
          },
        },
        _readOnly: {
          userSelect: 'all',
          pointerEvents: 'none',
          bg: 'input.bg.readOnly',
          borderColor: 'input.border.readOnly',
          _focus: {
            borderColor: 'input.border.readOnly',
          },
          _hover: {
            borderColor: 'input.border.readOnly',
          },
        },
        _disabled: {
          opacity: 'control.disabled',
        },
        _invalid: {
          borderColor: 'input.border.error',
          _placeholder: {
            color: 'input.placeholder.error',
          },
          _hover: {
            borderColor: 'input.border.error',
          },
        },
      },
    },

    floating: {
      'true': {},
    },
  },

  compoundVariants: [
    {
      size: 'lg',
      floating: true,
      css: {
        padding: '26px 10px 10px 16px',
      },
    },
  ],

  defaultVariants: {
    size: 'md',
    variant: 'outline',
    floating: false,
  },
});
