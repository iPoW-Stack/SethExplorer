const SETH_REPO_URL = 'https://github.com/iPoW-Stack/SethExplorer';

export default function getApiVersionUrl(version: string | undefined): string | undefined {
  if (!version) {
    return;
  }

  const [ tag, commit ] = version.split('.+commit.');

  if (commit) {
    return `${ SETH_REPO_URL }/commit/${ commit }`;
  }

  return `${ SETH_REPO_URL }/tree/${ tag }`;
}
