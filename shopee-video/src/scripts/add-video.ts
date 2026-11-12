// Uso: npm run add -- <arquivo.mp4> <item_id> "<legenda>" [link_afiliado] [agendado_para_ISO]
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';
import { config } from '../config.js';

const [arquivo, itemId, legenda = '', link, quando] = process.argv.slice(2);
if (!arquivo || !itemId) {
  console.error('Uso: npm run add -- <arquivo.mp4> <item_id> "<legenda>" [link_afiliado] [agendado_para_ISO]');
  process.exit(1);
}

const path = `origem/${randomUUID()}.mp4`;
const { error: upErr } = await db.storage
  .from(config.bucket)
  .upload(path, await readFile(arquivo), { contentType: 'video/mp4' });
if (upErr) throw upErr;

const { data, error } = await db
  .from('sv_videos')
  .insert({
    item_id: itemId,
    legenda,
    link_afiliado: link ?? null,
    origem_path: path,
    ...(quando ? { agendado_para: quando } : {}),
  })
  .select('id')
  .single();
if (error) throw error;
console.log('Na fila:', data.id);
