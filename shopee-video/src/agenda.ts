// Regras de cadência: limite diário (4 a 5 por padrão) e janela de horário, sempre em horário de Brasília.
import { db } from './db.js';

const TZ = 'America/Sao_Paulo';
const [MIN, MAX] = (process.env.POSTS_POR_DIA ?? '4-5').split('-').map(Number) as [number, number | undefined];
const LIMITE_MIN = MIN || 4;
const LIMITE_MAX = MAX || LIMITE_MIN;
const DE = Number(process.env.PUBLICAR_DE ?? 9);     // hora inicial (inclusive)
const ATE = Number(process.env.PUBLICAR_ATE ?? 22);  // hora final (exclusive)

function partes(d: Date) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  }).formatToParts(d);
  const g = (t: string) => f.find((p) => p.type === t)!.value;
  return { dia: `${g('year')}-${g('month')}-${g('day')}`, hora: Number(g('hour')) % 24 };
}

/** Limite do dia: varia entre MIN e MAX, mas é o mesmo durante o dia todo. */
export function limiteDoDia(d = new Date()): number {
  const { dia } = partes(d);
  const h = [...dia].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return LIMITE_MIN + (h % (LIMITE_MAX - LIMITE_MIN + 1));
}

export function dentroDaJanela(d = new Date()): boolean {
  const { hora } = partes(d);
  return hora >= DE && hora < ATE;
}

export async function publicadosHoje(d = new Date()): Promise<number> {
  const { dia } = partes(d);
  const inicio = new Date(`${dia}T00:00:00-03:00`).toISOString(); // Brasil sem horário de verão
  const { count, error } = await db
    .from('sv_videos')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'publicado')
    .gte('publicado_em', inicio);
  if (error) throw error;
  return count ?? 0;
}

export async function podePublicarAgora(): Promise<{ ok: boolean; motivo?: string }> {
  if (!dentroDaJanela()) return { ok: false, motivo: `fora da janela ${DE}h-${ATE}h (Brasília)` };
  const [feitos, limite] = [await publicadosHoje(), limiteDoDia()];
  if (feitos >= limite) return { ok: false, motivo: `limite do dia atingido (${feitos}/${limite})` };
  return { ok: true };
}
