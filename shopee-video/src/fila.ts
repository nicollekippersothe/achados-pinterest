import { readFile, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import { config } from './config.js';

export async function enfileirar(v: {
  arquivo: string;
  itemId: string;
  legenda: string;
  linkAfiliado: string | null;
  produtoNome?: string;
  urlProduto?: string;
  preco?: number;
  comissaoPct?: number;
  agendadoPara?: string;
}): Promise<string> {
  const path = `origem/${randomUUID()}.mp4`;
  const up = await db.storage.from(config.bucket).upload(path, await readFile(v.arquivo), { contentType: 'video/mp4' });
  if (up.error) throw up.error;
  await rm(v.arquivo, { force: true });

  const { data, error } = await db
    .from('sv_videos')
    .insert({
      item_id: v.itemId,
      legenda: v.legenda,
      link_afiliado: v.linkAfiliado,
      origem_path: path,
      produto_nome: v.produtoNome ?? null,
      url_produto: v.urlProduto ?? null,
      preco: v.preco ?? null,
      comissao_pct: v.comissaoPct ?? null,
      ...(v.agendadoPara ? { agendado_para: v.agendadoPara } : {}),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}
