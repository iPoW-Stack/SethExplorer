import type CspDev from 'csp-dev';
import { uniq } from 'es-toolkit';

export const KEY_WORDS = {
  BLOB: 'blob:',
  DATA: 'data:',
  NONE: '\'none\'',
  REPORT_SAMPLE: `'report-sample'`,
  SELF: '\'self\'',
  STRICT_DYNAMIC: `'strict-dynamic'`,
  UNSAFE_INLINE: '\'unsafe-inline\'',
  UNSAFE_EVAL: '\'unsafe-eval\'',
};

export function mergeDescriptors(...descriptors: Array<CspDev.DirectiveDescriptor>) {
  return descriptors.reduce((result, item) => {
    for (const _key in item) {
      const key = _key as CspDev.Directive;
      const value = item[key];

      if (!value) {
        continue;
      }

      if (result[key]) {
        result[key]?.push(...value);
      } else {
        result[key] = [ ...value ];
      }
    }

    return result;
  }, {} as CspDev.DirectiveDescriptor);
}

/**
 * CSP source is invalid if it starts/ends with a quote (e.g. from env misconfiguration),
 * except for valid CSP keywords that must be quoted by spec ('self', 'none', etc.).
 */
function isValidCspSource(source: string): boolean {
  const s = source.trim();
  if (s.length === 0) {
    return false;
  }

  if (/^'[a-z-]+'$/i.test(s)) {
    return true;
  }

  return !/^["']|["']$/.test(s);
}

export function makePolicyString(policyDescriptor: CspDev.DirectiveDescriptor) {
  return Object.entries(policyDescriptor)
    .map(([ key, value ]) => {
      if (!value || value.length === 0) {
        return;
      }

      const filtered = key === 'connect-src' ?
        value.filter((v) => typeof v === 'string' && isValidCspSource(v)) :
        value;
      const uniqueValues = uniq(filtered);
      if (uniqueValues.length === 0) {
        return;
      }
      return [ key, uniqueValues.join(' ') ].join(' ');
    })
    .filter(Boolean)
    .join(';');
}
