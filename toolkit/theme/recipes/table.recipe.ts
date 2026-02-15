import { defineSlotRecipe } from '@chakra-ui/react';

export const recipe = defineSlotRecipe({
  slots: [ 'root', 'row', 'cell', 'columnHeader', 'caption', 'footer', 'body', 'header' ],
  base: {
    root: {
      tableLayout: 'fixed',
      fontVariant: 'normal',
      fontVariantLigatures: 'no-contextual',
      borderCollapse: 'collapse',
      width: 'full',
      textAlign: 'start',
      verticalAlign: 'top',
      overflow: 'unset',
      borderRadius: 'xl',
    },
    cell: {
      textAlign: 'start',
      alignItems: 'center',
      verticalAlign: 'top',
      fontWeight: 'medium',
    },
    columnHeader: {
      fontWeight: 'medium',
      textAlign: 'start',
    },
  },

  variants: {
    variant: {
      line: {
        columnHeader: {
          color: 'table.header.fg',
          backgroundColor: 'table.header.bg',
          borderBottomWidth: '1px',
          borderColor: 'border.divider',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontSize: 'xs',
          backdropFilter: 'blur(10px)',
          _first: {
            borderTopLeftRadius: '8px',
          },
          _last: {
            borderTopRightRadius: '8px',
          },
        },
        cell: {
          borderBottomWidth: '1px',
          borderColor: 'border.divider',
        },
        row: {
          bg: { _light: 'bg', _dark: 'rgba(10, 16, 20, 0.48)' },
          _hover: {
            bg: { _light: 'blackAlpha.50', _dark: 'rgba(255, 255, 255, 0.03)' },
          },
        },
      },
    },

    size: {
      md: {
        root: {
          fontSize: 'sm',
        },
        columnHeader: {
          px: '6px',
          py: '10px',
          _first: {
            pl: 3,
          },
          _last: {
            pr: 3,
          },
        },
        cell: {
          px: '6px',
          py: 4,
          _first: {
            pl: 3,
          },
          _last: {
            pr: 3,
          },
        },
      },
    },
  },

  defaultVariants: {
    variant: 'line',
    size: 'md',
  },
});
