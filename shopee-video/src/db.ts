import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

export const db = createClient(config.supabaseUrl(), config.supabaseKey(), {
  auth: { persistSession: false },
});

export interface Video {
  id: string;
  item_id: string;
  link_afiliado: string | null;
  legenda: string;
  origem_path: string;
  processado_path: string | null;
  status: string;
  tentativas: number;
  erro: string | null;
  agendado_para: string;
  publicado_em: string | null;
}

export async function claim(de: string, para: string): Promise<Video | null> {
  const { data, error } = await db.rpc('sv_claim', { de, para });
  if (error) throw error;
  return (data as Video[])[0] ?? null;
}

export async function atualizar(id: string, campos: Partial<Video>) {
  const { error } = await db
    .from('sv_videos')
    .update({ ...campos, atualizado_em: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function ultimaPublicacao(): Promise<Date | null> {
  const { data, error } = await db
    .from('sv_videos')
    .select('publicado_em')
    .eq('status', 'publicado')
    .order('publicado_em', { ascending: false })
    .limit(1);
  if (error) throw error;
  const v = data?.[0]?.publicado_em;
  return v ? new Date(v) : null;
}
