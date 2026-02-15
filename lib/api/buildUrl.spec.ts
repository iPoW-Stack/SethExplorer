import { expect, test, describe } from 'vitest';

import buildUrl from './buildUrl';

const protocol = process.env.NEXT_PUBLIC_API_PROTOCOL ||
  process.env.NEXT_PUBLIC_APP_PROTOCOL ||
  'https';
const host = process.env.NEXT_PUBLIC_API_HOST || 'localhost';
const port = process.env.NEXT_PUBLIC_API_PORT || '3003';
const generalOrigin = `${ protocol }://${ host }:${ port }`;

test('builds URL for resource without path params', () => {
  const url = buildUrl('general:config_backend_version');
  expect(url).toBe(`${ generalOrigin }/api/v2/config/backend-version`);
});

test('builds URL for resource with path params', () => {
  const url = buildUrl('general:block', { height_or_hash: '42' });
  expect(url).toBe(`${ generalOrigin }/api/v2/blocks/42`);
});

describe('falsy query parameters', () => {
  test('leaves "false" as query parameter', () => {
    const url = buildUrl('general:block', { height_or_hash: '42' }, { includeTx: false });
    expect(url).toBe(`${ generalOrigin }/api/v2/blocks/42?includeTx=false`);
  });

  test('leaves "null" as query parameter', () => {
    const url = buildUrl('general:block', { height_or_hash: '42' }, { includeTx: null });
    expect(url).toBe(`${ generalOrigin }/api/v2/blocks/42?includeTx=null`);
  });

  test('strips out empty string as query parameter', () => {
    const url = buildUrl('general:block', { height_or_hash: '42' }, { includeTx: null, sort: '' });
    expect(url).toBe(`${ generalOrigin }/api/v2/blocks/42?includeTx=null`);
  });

  test('strips out "undefined" as query parameter', () => {
    const url = buildUrl('general:block', { height_or_hash: '42' }, { includeTx: null, sort: undefined });
    expect(url).toBe(`${ generalOrigin }/api/v2/blocks/42?includeTx=null`);
  });
});

test('builds URL with array-like query parameters', () => {
  const url = buildUrl('general:block', { height_or_hash: '42' }, { includeTx: [ '0x11', '0x22' ], sort: 'asc' });
  expect(url).toBe(`${ generalOrigin }/api/v2/blocks/42?includeTx=0x11%2C0x22&sort=asc`);
});

test('builds URL for resource with custom API endpoint', () => {
  const url = buildUrl('contractInfo:token_verified_info', { chainId: '42', hash: '0x11' });
  expect(url).toBe('https://localhost:3005/api/v1/chains/42/token-infos/0x11');
});
