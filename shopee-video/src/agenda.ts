// Agenda de postagens: horários do dia salvos no Supabase (não no computador).
// - Todo dia são sorteados 4 a 5 horários dentro da janela, com espaço mínimo de 100 min entre eles.
// - Horário que passou com o computador desligado fica pendente e sai assim que ele volta.
// - Horário de dia anterior nunca é recuperado (vira 'perdido'). Depois do fim da janela, nada é postado.
import { db } from './db.js';

const TZ = 'America/Sao_Paulo';
const [MIN, MAX] = (process.env.POSTS_POR_DIA ?? '4-5').split('-').map(Number) as [number, number | undefined];
const LIMITE_MIN = MIN || 4;
const LIMITE_MAX = MAX || LIMITE_MIN;
const DE = Number(process.env.PUBLICAR_DE ?? 9);      // hora inicial da janela (inclusive)
const ATE = Number(process.env.PUBLICAR_ATE ?? 22);   // hora final da janela (exclusive)
const ESPACO_MIN = 100 * 60_000;                      // espaço mínimo entre horários da agenda

function partes(d: Date) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const g = (t: string) => f.find((p) => p.type === t)!.value;
  return { dia: `${g('year')}-${g('month')}-${g('day')}`, hora: Number(g('hour')) % 24, minuto: Number(g('minute')) };
}

const hhmm = (d: Date) => {
  const p = partes(d);
  return `${String(p.hora).padStart(2, '0')}:${String(p.minuto).padStart(2, '0')}`;
};

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

const inicioDoDia = (dia: string) => new Date(`${dia}T00:00:00-03:00`); // Brasil sem horário de verão
const horaNoDia = (dia: string, h: number) => new Date(inicioDoDia(dia).getTime() + h * 3_600_000);

/** Distribui até `n` horários entre `inicio` e `fim`, com variação aleatória, sempre ≥100 min entre eles. */
export function gerarHorarios(n: number, inicio: number, fim: number, rnd: () => number = Math.random): number[] {
  const span = fim - inicio;
  const qtd = Math.min(n, Math.floor(span / ESPACO_MIN));
  if (qtd <= 0) return [];
  const seg = span / qtd;
  const jitter = Math.max(0, Math.min(20 * 60_000, (seg - ESPACO_MIN) / 2));
  return Array.from({ length: qtd }, (_, i) => Math.round(inicio + (i + 0.5) * seg + (rnd() * 2 - 1) * jitter));
}

export async function publicadosHoje(d = new Date()): Promise<number> {
  const { dia } = partes(d);
  const { count, error } = await db
    .from('sv_videos')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'publicado')
    .gte('publicado_em', inicioDoDia(dia).toISOString());
  if (error) throw error;
  return count ?? 0;
}

/** Cria a agenda de hoje (se não existir) e marca como perdidos os horários de dias anteriores. */
export async function garantirAgenda(agora = new Date()): Promise<void> {
  const { dia } = partes(agora);

  const perdidos = await db.from('sv_agenda').update({ status: 'perdido' }).eq('status', 'pendente').lt('dia', dia);
  if (perdidos.error) throw perdidos.error;

  const existentes = await db.from('sv_agenda').select('id', { count: 'exact', head: true }).eq('dia', dia);
  if (existentes.error) throw existentes.error;
  if ((existentes.count ?? 0) > 0) return;

  // Se a agenda nasce no meio do dia, só agenda o que falta e só no futuro.
  const restante = Math.max(0, limiteDoDia(agora) - (await publicadosHoje(agora)));
  const inicio = Math.max(horaNoDia(dia, DE).getTime(), agora.getTime() + 5 * 60_000);
  const fim = horaNoDia(dia, ATE).getTime() - 30 * 60_000; // último horário até 30 min antes do fim da janela
  const horarios = gerarHorarios(restante, inicio, fim);
  if (horarios.length === 0) { console.log('Agenda de hoje: nada a agendar.'); return; }

  const linhas = horarios.map((t, i) => ({ dia, ordem: i + 1, horario: new Date(t).toISOString() }));
  const { error } = await db.from('sv_agenda').upsert(linhas, { onConflict: 'dia,ordem', ignoreDuplicates: true });
  if (error) throw error;
  console.log(`Agenda de hoje criada: ${horarios.map((t) => hhmm(new Date(t))).join(', ')} (Brasília)`);
}

export interface Slot { id: string; horario: string; ordem: number }

/** Próximo horário de hoje que já passou e ainda está pendente. Só vale dentro da janela. */
export async function slotVencido(agora = new Date()): Promise<Slot | null> {
  if (!dentroDaJanela(agora)) return null;
  const { dia } = partes(agora);
  const { data, error } = await db
    .from('sv_agenda').select('id,horario,ordem')
    .eq('dia', dia).eq('status', 'pendente').lte('horario', agora.toISOString())
    .order('horario').limit(1);
  if (error) throw error;
  return (data?.[0] as Slot) ?? null;
}

export async function proximoHorario(agora = new Date()): Promise<string | null> {
  const { dia } = partes(agora);
  const { data, error } = await db
    .from('sv_agenda').select('horario')
    .eq('dia', dia).eq('status', 'pendente').gt('horario', agora.toISOString())
    .order('horario').limit(1);
  if (error) throw error;
  return data?.[0] ? hhmm(new Date(data[0].horario as string)) : null;
}

export async function marcarFeito(slotId: string, videoId: string): Promise<void> {
  const { error } = await db
    .from('sv_agenda').update({ status: 'feito', video_id: videoId, feito_em: new Date().toISOString() }).eq('id', slotId);
  if (error) throw error;
}
