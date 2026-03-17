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
    bg: '#0A0A0A',
    backgroundImage: [
      'radial-gradient(circle at 14% 16%, rgba(0, 255, 148, 0.07) 0%, transparent 26%)',
      'radial-gradient(circle at 86% 2%, rgba(255, 255, 255, 0.05) 0%, transparent 20%)',
      'radial-gradient(circle at 72% 76%, rgba(0, 255, 148, 0.04) 0%, transparent 22%)',
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
    backgroundColor: 'rgba(0, 255, 148, 0.5)',
    borderRadius: '9999px',
    border: '2px solid transparent',
    backgroundClip: 'padding-box',
  },
  'html.dark body *': {
    scrollbarColor: 'rgba(0, 255, 148, 0.5) transparent',
  },
  'html.dark .seth-page-shell': {
    position: 'relative',
    zIndex: 1,
  },
  'html.dark .seth-panel': {
    background: 'linear-gradient(160deg, rgba(28, 28, 28, 0.94) 0%, rgba(20, 20, 20, 0.9) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    backdropFilter: 'blur(14px)',
    boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.02), 0 10px 28px rgba(0, 0, 0, 0.42)',
  },
  'html.dark .seth-panel-soft': {
    background: 'linear-gradient(160deg, rgba(26, 26, 26, 0.88) 0%, rgba(20, 20, 20, 0.82) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
  },
  'html.dark .seth-panel-hover': {
    transitionProperty: 'background-color,border-color,box-shadow,transform',
    transitionDuration: 'normal',
  },
  'html.dark .seth-fade-in-up': {
    opacity: 0,
    animation: 'sethFadeInUp 420ms ease-out forwards',
    animationDelay: 'calc(var(--seth-index, 0) * 60ms)',
  },
  'html.dark .seth-list-enter': {
    animation: 'sethSlideDown 300ms ease-out both, sethFlashGreen 1.5s ease-out both',
    animationDelay: 'calc(var(--seth-index, 0) * 30ms), calc(var(--seth-index, 0) * 30ms)',
  },
  'html.dark .seth-panel-hover:hover': {
    borderColor: 'rgba(0, 255, 148, 0.22)',
    boxShadow: '0 0 22px rgba(0, 255, 148, 0.06), 0 14px 34px rgba(0, 0, 0, 0.45)',
    transform: 'translateY(-1px)',
  },
  'html.dark .seth-panel table tbody tr td': {
    height: '48px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },
  'html.dark .seth-panel table tbody tr:nth-of-type(odd) td': {
    bgColor: 'rgba(255, 255, 255, 0.015)',
  },
  'html.dark .seth-panel table tbody tr:hover td': {
    bgColor: 'rgba(255, 255, 255, 0.03)',
  },
  'html.dark .seth-panel table tbody tr:hover td:first-of-type': {
    boxShadow: 'inset 3px 0 0 #00FF94',
  },
  'html.dark .seth-panel code, html.dark .seth-panel pre, html.dark [data-entity-hash="true"]': {
    fontFamily: 'var(--chakra-fonts-mono)',
    letterSpacing: '0.1px',
  },
  'html.dark .seth-header-glass': {
    background: 'rgba(10, 10, 10, 0.76)',
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
