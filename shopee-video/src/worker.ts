import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from './config.js';
import { db, claim, atualizar, ultimaPublicacao, type Video } from './db.js';
import { padronizar } from './ffmpeg.js';
import { playwrightPublisher } from './publishers/playwright.js';
import { apiPublisher } from './publishers/api.js';

const publisher = config.publisher === 'api' ? apiPublisher : playwrightPublisher;
const TMP = './tmp';

async function processar(v: Video) {
  await mkdir(TMP, { recursive: true });
  const entrada = join(TMP, `${v.id}-in.mp4`);
  const saida = join(TMP, `${v.id}-out.mp4`);
  try {
    const { data, error } = await db.storage.from(config.bucket).download(v.origem_path);
    if (error) throw error;
    await writeFile(entrada, Buffer.from(await data.arrayBuffer()));

    await padronizar(entrada, saida);

    const destino = `processado/${v.id}.mp4`;
    const up = await db.storage
      .from(config.bucket)
      .upload(destino, await readFile(saida), { contentType: 'video/mp4', upsert: true });
    if (up.error) throw up.error;

    await atualizar(v.id, { status: 'pronto', processado_path: destino, erro: null });
  } finally {
    await rm(entrada, { force: true });
    await rm(saida, { force: true });
  }
}

async function publicar(v: Video) {
  await mkdir(TMP, { recursive: true });
  const arquivo = join(TMP, `${v.id}-pub.mp4`);
  try {
    const { data, error } = await db.storage.from(config.bucket).download(v.processado_path!);
    if (error) throw error;
    await writeFile(arquivo, Buffer.from(await data.arrayBuffer()));

    await publisher.publicar(v, arquivo);
    await atualizar(v.id, { status: 'publicado', publicado_em: new Date().toISOString(), erro: null });
  } finally {
    await rm(arquivo, { force: true });
  }
}

async function falhou(v: Video, e: unknown, voltarPara: string) {
  const tentativas = v.tentativas + 1;
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`[${v.id}] falha (${tentativas}/${config.maxTentativas}):`, msg);
  await atualizar(v.id, {
    tentativas,
    erro: msg,
    status: tentativas >= config.maxTentativas ? 'erro' : voltarPara,
  });
}

async function ciclo(): Promise<boolean> {
  // 1) Padroniza o que estiver pendente
  const p = await claim('pendente', 'processando');
  if (p) {
    try { await processar(p); console.log(`[${p.id}] processado`); }
    catch (e) { await falhou(p, e, 'pendente'); }
    return true;
  }

  // 2) Publica um por vez, respeitando o intervalo mínimo
  const ultima = await ultimaPublicacao();
  const espera = ultima ? ultima.getTime() + config.minIntervalMin * 60_000 - Date.now() : 0;
  if (espera > 0) return false;

  const v = await claim('pronto', 'publicando');
  if (v) {
    try { await publicar(v); console.log(`[${v.id}] publicado`); }
    catch (e) { await falhou(v, e, 'pronto'); }
    return true;
  }
  return false;
}

const UMA_VEZ = process.argv.includes('--once');
for (;;) {
  const trabalhou = await ciclo();
  if (UMA_VEZ && !trabalhou) break; // --once: esvazia o que der e sai
  if (UMA_VEZ) continue;
  if (!trabalhou) await new Promise((r) => setTimeout(r, 30_000));
}
