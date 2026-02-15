import * as cookies from 'lib/cookies';

import { getEnvValue } from './utils';

const appPort = getEnvValue('NEXT_PUBLIC_APP_PORT');
const appSchema = getEnvValue('NEXT_PUBLIC_APP_PROTOCOL');
const appHost = getEnvValue('NEXT_PUBLIC_APP_HOST');
const resolvedHost = appHost || (typeof window !== 'undefined' ? window.location.hostname : undefined) || 'localhost';
// When env is missing in browser (e.g. envs.js not loaded), use current page protocol
// so API requests use http if the user opened http://...
const protocol = appSchema || (typeof window !== 'undefined' ? window.location.protocol.replace(':', '') : undefined) || 'https';
const baseUrl = [
  protocol,
  '://',
  resolvedHost,
  appPort && ':' + appPort,
].filter(Boolean).join('');
const isDev = getEnvValue('NEXT_PUBLIC_APP_ENV') === 'development';
const isReview = getEnvValue('NEXT_PUBLIC_APP_ENV') === 'review';
const isPw = getEnvValue('NEXT_PUBLIC_APP_INSTANCE') === 'pw';
const spriteHash = getEnvValue('NEXT_PUBLIC_ICON_SPRITE_HASH');
const isPrivateMode = cookies.get(cookies.NAMES.APP_PROFILE) === 'private';

const app = Object.freeze({
  isDev,
  isReview,
  isPw,
  protocol: appSchema,
  host: resolvedHost,
  port: appPort,
  baseUrl,
  useProxy: getEnvValue('NEXT_PUBLIC_USE_NEXT_JS_PROXY') === 'true',
  spriteHash,
  isPrivateMode,
});

export default app;
