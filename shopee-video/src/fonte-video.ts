// Abre a página do produto e captura o vídeo que o player carrega (mp4 ou m3u8).
// Não testado contra a Shopee real. Pode pegar o vídeo do vendedor em vez do de creator.
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { config } from './config.js';

const run = promisify(execFile);

export async function capturarVideo(url: string): Promise<{ arquivo: string; titulo: string } | null> {
  const browser = await chromium.launch({ headless: config.headless });
  let alvo: string | undefined;
  let titulo = '';
  try {
    const ctx = await browser.newContext(existsSync(config.storageState) ? { storageState: config.storageState } : {});
    const page = await ctx.newPage();
    const achados: string[] = [];
    page.on('response', (r) => {
      const u = r.url();
      const ct = r.headers()['content-type'] ?? '';
      if (/\.(mp4|m3u8)(\?|$)/i.test(u) || ct.startsWith('video/') || ct.includes('mpegurl')) achados.push(u);
    });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(6000);
    titulo = await page.title();
    alvo = achados.find((u) => /\.mp4/i.test(u)) ?? achados.find((u) => /\.m3u8/i.test(u));
  } finally {
    await browser.close();
  }
  if (!alvo) return null;

  await mkdir('./tmp', { recursive: true });
  const arquivo = `./tmp/${randomUUID()}.mp4`;
  await run('ffmpeg', ['-y', '-i', alvo, '-c', 'copy', arquivo]);
  return { arquivo, titulo };
}
