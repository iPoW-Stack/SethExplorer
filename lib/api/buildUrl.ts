import { compile } from 'path-to-regexp';

import type { ExternalChainExtended } from 'types/externalChains';

import config from 'configs/app';

import getResourceParams from './getResourceParams';
import isNeedProxy from './isNeedProxy';
import type { ResourceName, ResourcePathParams } from './resources';

export default function buildUrl<R extends ResourceName>(
  resourceFullName: R,
  pathParams?: ResourcePathParams<R>,
  queryParams?: Record<string, string | Array<string> | number | boolean | null | undefined>,
  noProxy?: boolean,
  chain?: ExternalChainExtended,
): string {
  const { api, resource } = getResourceParams(resourceFullName, chain);
  const basePath = api.basePath ?? '';
  const path = !noProxy && isNeedProxy() ? '/node-api/proxy' + basePath + resource.path : basePath + resource.path;
  const pathWithParams = compile(path)(pathParams);

  const searchParams = new URLSearchParams();
  queryParams && Object.entries(queryParams).forEach(([ key, value ]) => {
    // there are some pagination params that can be null or false for the next page
    value !== undefined && value !== '' && searchParams.append(key, String(value));
  });
  const queryString = searchParams.toString();
  const pathAndQuery = queryString ? `${ pathWithParams }?${ queryString }` : pathWithParams;

  // When using proxy in browser, return relative URL so fetch uses the same protocol as the page (http/https)
  // and avoids CSP "Refused to connect" when page is http but config.app.baseUrl is https
  if (!noProxy && isNeedProxy() && typeof window !== 'undefined') {
    return pathAndQuery;
  }

  const baseUrl = !noProxy && isNeedProxy() ? config.app.baseUrl : api.endpoint;
  const url = new URL(pathWithParams, baseUrl);
  searchParams.forEach((value, key) => url.searchParams.append(key, value));
  return url.toString();
}
