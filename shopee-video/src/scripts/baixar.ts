// Uso: npm run baixar -- <url_do_produto_shopee> "<legenda>" [link_afiliado]
// Abre a página do produto, captura o vídeo que o player carrega (mp4 ou m3u8),
// baixa e coloca na fila. Não testado contra a Shopee real: ajuste se o player mudar.
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';
import { config } from '../config.js';

const run = promisify(execFile);
const [url, legenda = '', link] = process.argv.slice(2);
if (!url) {
  console.error('Uso: npm run baixar -- <url_do_produto> "<legenda>" [link_afiliado]');
  process.exit(1);
}

// Formatos comuns: ...-i.<shopid>.<itemid>  ou  /product/<shopid>/<itemid>
const m = url.match(/-i\.(\d+)\.(\d+)/) ?? url.match(/\/product\/(\d+)\/(\d+)/);
const itemId = m?.[2];
if (!itemId) {
  console.error('Não achei o item_id na URL. Use a URL completa do produto (não o link curto).');
  process.exit(1);
}

const browser = await chromium.launch({ headless: config.headless });
const ctx = await browser.newContext(
  existsSync(config.storageState) ? { storageState: config.storageState } : {},
);
const page = await ctx.newPage();

const achados = new Set<string>();
page.on('response', (r) => {
  const u = r.url();
  const ct = r.headers()['content-type'] ?? '';
  if (/\.(mp4|m3u8)(\?|$)/i.test(u) || ct.startsWith('video/') || ct.includes('mpegurl')) achados.add(u);
});

await page.goto(url, { waitUntil: 'networkidle' });
// Alguns players só carregam após interação
await page.mouse.wheel(0, 300);
await page.waitForTimeout(6000);
await browser.close();

const alvo = [...achados].find((u) => /\.mp4/i.test(u)) ?? [...achados].find((u) => /\.m3u8/i.test(u));
if (!alvo) {
  console.error('Nenhum vídeo capturado. O produto pode não ter vídeo, ou o player exige clique.');
  process.exit(1);
}
console.log('Vídeo encontrado:', alvo);

await mkdir('./tmp', { recursive: true });
const arquivo = `./tmp/${randomUUID()}.mp4`;
if (/\.m3u8/i.test(alvo)) {
  await run('ffmpeg', ['-y', '-i', alvo, '-c', 'copy', arquivo]);
} else {
  await run('ffmpeg', ['-y', '-i', alvo, '-c', 'copy', arquivo]); // ffmpeg também baixa mp4 por URL
}

const path = `origem/${randomUUID()}.mp4`;
const up = await db.storage
  .from(config.bucket)
  .upload(path, await readFile(arquivo), { contentType: 'video/mp4' });
if (up.error) throw up.error;
await rm(arquivo, { force: true });

const { data, error } = await db
  .from('sv_videos')
  .insert({ item_id: itemId, legenda, link_afiliado: link ?? null, origem_path: path })
  .select('id')
  .single();
if (error) throw error;
console.log('Na fila:', data.id, '| item_id:', itemId);
