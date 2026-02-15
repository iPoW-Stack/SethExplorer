import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const FALLBACK = 'window.__envs = window.__envs || {};';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

  const filePath = path.join(process.cwd(), 'public', 'assets', 'envs.js');
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return res.status(200).send(content);
    }
  } catch {
    // fall through to fallback
  }
  return res.status(200).send(FALLBACK);
}
