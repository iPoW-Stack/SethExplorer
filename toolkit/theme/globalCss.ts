import type { SystemConfig } from '@chakra-ui/react';

import addressEntity from './globals/address-entity';
import entity from './globals/entity';
import recaptcha from './globals/recaptcha';
import scrollbar from './globals/scrollbar';

const webkitAutofillOverrides = {
  WebkitTextFillColor: 'var(--chakra-colors-input-fg)',
  '-webkit-box-shadow': '0 0 0px 1000px var(--chakra-colors-input-bg) inset',
  transition: 'background-color 5000s ease-in-out 0s',
};

const webkitAutofillRules = {
  '&:-webkit-autofill': webkitAutofillOverrides,
  '&:-webkit-autofill:hover': webkitAutofillOverrides,
  '&:-webkit-autofill:focus': webkitAutofillOverrides,
};

const globalCss: SystemConfig['globalCss'] = {
  body: {
    bg: 'global.body.bg',
    color: 'global.body.fg',
    WebkitTapHighlightColor: 'transparent',
    fontVariantLigatures: 'no-contextual',
    focusRingStyle: 'hidden',
    minHeight: '100vh',
    position: 'relative',
    colorScheme: 'dark',
  },
  'html.dark body': {
    bg: '#040608',
    backgroundImage: [
      'radial-gradient(circle at 15% 50%, rgba(0, 255, 163, 0.08) 0%, transparent 25%)',
      'radial-gradient(circle at 85% 30%, rgba(16, 185, 129, 0.05) 0%, transparent 25%)',
    ].join(', '),
    backgroundAttachment: 'fixed',
  },
  'html.dark body::before': {
    content: '""',
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    background: 'linear-gradient(180deg, rgba(2, 10, 8, 0.2) 0%, rgba(4, 6, 8, 0) 35%)',
    zIndex: 0,
  },
  'html.dark body *::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(0, 255, 163, 0.55)',
    borderRadius: '9999px',
    border: '2px solid transparent',
    backgroundClip: 'padding-box',
  },
  'html.dark body *': {
    scrollbarColor: 'rgba(0, 255, 163, 0.55) transparent',
  },
  'html.dark .seth-page-shell': {
    position: 'relative',
    zIndex: 1,
  },
  'html.dark .seth-panel': {
    background: 'rgba(10, 16, 20, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 0 0 1px rgba(0, 255, 163, 0.02), 0 8px 30px rgba(0, 0, 0, 0.4)',
  },
  'html.dark .seth-panel-soft': {
    background: 'rgba(10, 16, 20, 0.58)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
  },
  'html.dark .seth-panel-hover': {
    transitionProperty: 'background-color,border-color,box-shadow,transform',
    transitionDuration: 'normal',
  },
  'html.dark .seth-panel-hover:hover': {
    borderColor: 'rgba(0, 255, 163, 0.28)',
    boxShadow: '0 0 15px rgba(0, 255, 163, 0.05), 0 8px 30px rgba(0, 0, 0, 0.4)',
  },
  'html.dark .seth-header-glass': {
    background: 'rgba(4, 6, 8, 0.76)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
  },
  'html.dark .seth-divider': {
    borderColor: 'rgba(21, 34, 43, 1)',
  },
  'html.dark .tsqd-open-btn-container': {
    display: 'none !important',
  },
  'html.dark [class*="tsqd-open-btn-container"]': {
    display: 'none !important',
  },
  'html.dark nextjs-portal': {
    display: 'none !important',
  },
  'html.dark [data-nextjs-toast]': {
    display: 'none !important',
  },
  mark: {
    bg: 'global.mark.bg',
    color: 'inherit',
  },
  'svg *::selection': {
    color: 'none',
    background: 'none',
  },
  form: {
    w: '100%',
  },
  input: {
    // hide number input arrows in Google Chrome
    '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
      WebkitAppearance: 'none',
      margin: 0,
    },
    ...webkitAutofillRules,
  },
  textarea: {
    ...webkitAutofillRules,
  },
  select: {
    ...webkitAutofillRules,
  },
  ...recaptcha,
  ...scrollbar,
  ...entity,
  ...addressEntity,
};

export default globalCss;
