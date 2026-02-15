import fs from 'node:fs/promises';
import path from 'node:path';

import { PNG } from 'pngjs';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'test-results', 'design-audit');
const METRICS_PATH = path.join(OUTPUT_DIR, 'runtime-vs-design-metrics.json');

const PAGES = [ 'home', 'blocks', 'txs', 'block', 'tx', 'address' ];
const VIEWPORTS = [ 'desktop', 'mobile' ];
const DIFF_THRESHOLD = 24;

async function readPng(filePath) {
  const buffer = await fs.readFile(filePath);
  return PNG.sync.read(buffer);
}

async function writePng(filePath, png) {
  const buffer = PNG.sync.write(png);
  await fs.writeFile(filePath, buffer);
}

function copyPixel(src, srcIndex, dst, dstIndex) {
  dst.data[dstIndex + 0] = src.data[srcIndex + 0];
  dst.data[dstIndex + 1] = src.data[srcIndex + 1];
  dst.data[dstIndex + 2] = src.data[srcIndex + 2];
  dst.data[dstIndex + 3] = 255;
}

function createTripleImage(design, runtime) {
  const out = new PNG({ width: design.width * 3, height: design.height });

  for (let y = 0; y < design.height; y += 1) {
    for (let x = 0; x < design.width; x += 1) {
      const srcIndex = (y * design.width + x) * 4;

      const leftIndex = (y * out.width + x) * 4;
      const middleIndex = (y * out.width + (x + design.width)) * 4;
      const rightIndex = (y * out.width + (x + design.width * 2)) * 4;

      copyPixel(design, srcIndex, out, leftIndex);
      copyPixel(runtime, srcIndex, out, middleIndex);

      const dr = Math.abs(design.data[srcIndex + 0] - runtime.data[srcIndex + 0]);
      const dg = Math.abs(design.data[srcIndex + 1] - runtime.data[srcIndex + 1]);
      const db = Math.abs(design.data[srcIndex + 2] - runtime.data[srcIndex + 2]);
      const delta = (dr + dg + db) / 3;

      if (delta > DIFF_THRESHOLD) {
        out.data[rightIndex + 0] = 255;
        out.data[rightIndex + 1] = Math.max(40, 255 - Math.round(delta * 3));
        out.data[rightIndex + 2] = 64;
        out.data[rightIndex + 3] = 255;
      } else {
        const base = Math.round((design.data[srcIndex + 0] + design.data[srcIndex + 1] + design.data[srcIndex + 2]) / 3);
        const dimmed = Math.round(base * 0.28);
        out.data[rightIndex + 0] = dimmed;
        out.data[rightIndex + 1] = dimmed;
        out.data[rightIndex + 2] = dimmed;
        out.data[rightIndex + 3] = 255;
      }
    }
  }

  return out;
}

function computeMetrics(design, runtime) {
  const totalPixels = design.width * design.height;
  let sumAbs = 0;
  let sumSq = 0;
  let changed = 0;

  for (let i = 0; i < design.data.length; i += 4) {
    const dr = Math.abs(design.data[i + 0] - runtime.data[i + 0]);
    const dg = Math.abs(design.data[i + 1] - runtime.data[i + 1]);
    const db = Math.abs(design.data[i + 2] - runtime.data[i + 2]);
    const delta = (dr + dg + db) / 3;

    sumAbs += delta;
    sumSq += delta * delta;

    if (delta > DIFF_THRESHOLD) {
      changed += 1;
    }
  }

  const mae = sumAbs / totalPixels;
  const rmse = Math.sqrt(sumSq / totalPixels);
  const changedRatio = changed / totalPixels;
  const similarityScore = Number((100 - (mae / 255) * 100).toFixed(2));

  return {
    mae: Number(mae.toFixed(4)),
    rmse: Number(rmse.toFixed(4)),
    changed_ratio: Number(changedRatio.toFixed(4)),
    similarity_score: similarityScore,
  };
}

async function run() {
  const metrics = {};

  for (const pageKey of PAGES) {
    metrics[pageKey] = {};

    for (const viewport of VIEWPORTS) {
      const designPath = path.join(OUTPUT_DIR, `design-${ pageKey }-${ viewport }.png`);
      const runtimePath = path.join(OUTPUT_DIR, `runtime-${ pageKey }-${ viewport }.png`);
      const comparePath = path.join(OUTPUT_DIR, `compare-${ pageKey }-${ viewport }.png`);

      const designImage = await readPng(designPath);
      const runtimeImage = await readPng(runtimePath);

      if (designImage.width !== runtimeImage.width || designImage.height !== runtimeImage.height) {
        throw new Error(
          `Dimension mismatch for ${ pageKey }/${ viewport}: design=${ designImage.width }x${ designImage.height }, runtime=${ runtimeImage.width }x${ runtimeImage.height}`,
        );
      }

      const currentMetrics = computeMetrics(designImage, runtimeImage);
      metrics[pageKey][viewport] = currentMetrics;

      const compareImage = createTripleImage(designImage, runtimeImage);
      await writePng(comparePath, compareImage);

      // eslint-disable-next-line no-console
      console.log(`[compare] ${ pageKey }/${ viewport} similarity=${ currentMetrics.similarity_score }`);
    }
  }

  await fs.writeFile(METRICS_PATH, `${ JSON.stringify(metrics, null, 2) }\n`, 'utf8');
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[compare] failed:', error);
  process.exitCode = 1;
});
