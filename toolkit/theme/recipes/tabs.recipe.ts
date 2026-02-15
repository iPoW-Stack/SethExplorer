import { defineSlotRecipe } from '@chakra-ui/react';

export const recipe = defineSlotRecipe({
  slots: [ 'root', 'list', 'trigger', 'content', 'indicator' ],
  base: {
    root: {
      '--tabs-trigger-radius': 'radii.l2',
      position: 'relative',
      _horizontal: {
        display: 'block',
      },
      _vertical: {
        display: 'flex',
      },
    },
    list: {
      display: 'inline-flex',
      width: '100%',
      position: 'relative',
      isolation: 'isolate',
      '--tabs-indicator-shadow': 'shadows.xs',
      '--tabs-indicator-bg': 'colors.bg',
      minH: 'var(--tabs-height)',
      borderBottomWidth: '1px',
      borderColor: 'border.divider',
      _horizontal: {
        flexDirection: 'row',
      },
      _vertical: {
        flexDirection: 'column',
      },
    },
    trigger: {
      outline: '0',
      minW: 'var(--tabs-height)',
      height: 'var(--tabs-height)',
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
      cursor: 'button',
      gap: '2',
      transitionProperty: 'color,border-color,background-color,box-shadow',
      transitionDuration: 'normal',
      _focusVisible: {
        zIndex: 1,
        outline: '2px solid',
        outlineColor: 'colorPalette.focusRing',
      },
      _disabled: {
        cursor: 'not-allowed',
        opacity: 0.5,
      },
    },
    content: {
      focusVisibleRing: 'inside',
      _horizontal: {
        width: '100%',
        pt: 'var(--tabs-content-padding)',
      },
      _vertical: {
        height: '100%',
        ps: 'var(--tabs-content-padding)',
      },
    },
    indicator: {
      width: 'var(--width)',
      height: 'var(--height)',
      borderRadius: 'var(--tabs-indicator-radius)',
      bg: 'var(--tabs-indicator-bg)',
      shadow: 'var(--tabs-indicator-shadow)',
      zIndex: -1,
    },
  },

  variants: {
    fitted: {
      'true': {
        list: {
          display: 'flex',
        },
        trigger: {
          flex: 1,
          textAlign: 'center',
          justifyContent: 'center',
        },
      },
    },

    justify: {
      start: {
        list: {
          justifyContent: 'flex-start',
        },
      },
      center: {
        list: {
          justifyContent: 'center',
        },
      },
      end: {
        list: {
          justifyContent: 'flex-end',
        },
      },
    },

    size: {
      sm: {
        root: {
          '--tabs-height': 'sizes.8',
          '--tabs-content-padding': 'spacing.6',
        },
        trigger: {
          py: '1',
          px: '3',
          textStyle: 'sm',
        },
      },
      md: {
        root: {
          '--tabs-height': 'sizes.10',
          '--tabs-content-padding': 'spacing.6',
        },
        trigger: {
          py: '2',
          px: '4',
          textStyle: 'md',
        },
      },
      free: {},
    },

    variant: {
      solid: {
        trigger: {
          fontWeight: '600',
          gap: '1',
          borderRadius: 'base',
          color: 'tabs.solid.fg',
          bg: 'transparent',
          borderWidth: '1px',
          borderColor: 'transparent',
          _dark: {
            color: 'gray.300',
          },
          _selected: {
            bg: { _light: 'selected.control.bg', _dark: 'rgba(0, 255, 163, 0.12)' },
            color: { _light: 'selected.control.text', _dark: 'seth.primary' },
            borderColor: { _light: 'transparent', _dark: 'rgba(0, 255, 163, 0.28)' },
            boxShadow: { _light: 'none', _dark: '0 0 16px rgba(0, 255, 163, 0.1)' },
            _hover: {
              color: { _light: 'selected.control.text', _dark: 'seth.primary' },
            },
          },
          _hover: {
            color: 'hover',
            bg: { _light: 'transparent', _dark: 'rgba(255, 255, 255, 0.03)' },
            borderColor: { _light: 'transparent', _dark: 'rgba(255, 255, 255, 0.08)' },
          },
        },
      },
      secondary: {
        list: {
          border: 'none',
          columnGap: '3',
          _horizontal: {
            _before: {
              display: 'none',
            },
          },
        },
        trigger: {
          fontWeight: '500',
          color: 'tabs.secondary.fg',
          bg: 'transparent',
          borderWidth: '2px',
          borderStyle: 'solid',
          borderColor: 'tabs.secondary.border',
          borderRadius: 'lg',
          _selected: {
            bg: 'selected.control.bg',
            color: 'selected.control.text',
            borderColor: 'transparent',
            _hover: {
              borderColor: 'transparent',
            },
          },
          _hover: {
            color: 'hover',
            borderColor: 'hover',
          },
        },
      },
      segmented: {
        trigger: {
          color: 'tabs.segmented.fg',
          bg: 'transparent',
          borderWidth: '2px',
          borderStyle: 'solid',
          borderColor: 'selected.control.bg',
          _hover: {
            color: 'hover',
          },
          _selected: {
            color: 'selected.control.text',
            bg: 'selected.control.bg',
            borderColor: 'selected.control.bg',
            _hover: {
              color: 'selected.control.text',
            },
            '& + *': {
              borderLeftWidth: '0',
            },
          },
          _notLast: {
            borderRightWidth: '0',
            _selected: {
              borderRightWidth: '2px',
            },
          },
          _first: {
            borderTopLeftRadius: 'base',
            borderBottomLeftRadius: 'base',
          },
          _last: {
            borderTopRightRadius: 'base',
            borderBottomRightRadius: 'base',
          },
        },
      },
      unstyled: {},
    },
  },

  defaultVariants: {
    size: 'md',
    variant: 'solid',
  },
});
