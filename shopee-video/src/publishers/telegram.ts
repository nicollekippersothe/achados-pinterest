// "Publicador" que entrega o vídeo pronto no seu Telegram (vídeo + legenda + link), para você postar no app em segundos.
// Nesse modo, status "publicado" significa "entregue no Telegram".
import { readFile } from 'node:fs/promises';
import type { Video } from '../db.js';
import type { Publisher } from './types.js';

const base = () => process.env.TELEGRAM_API_BASE ?? 'https://api.telegram.org';
const token = () => process.env.TELEGRAM_BOT_TOKEN ?? '';
const chat = () => process.env.TELEGRAM_CHAT_ID ?? '';

async function chamar(metodo: string, corpo: FormData | URLSearchParams): Promise<void> {
  const res = await fetch(`${base()}/bot${token()}/${metodo}`, { method: 'POST', body: corpo });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!res.ok || !json.ok) throw new Error(`Telegram ${metodo}: ${json.description ?? `HTTP ${res.status}`}`);
}

export const telegramPublisher: Publisher = {
  verificar() {
    if (!token()) return 'TELEGRAM_BOT_TOKEN não definido';
    if (!chat()) return 'TELEGRAM_CHAT_ID não definido';
    return null;
  },

  async publicar(video: Video, arquivo: string) {
    // 1) O vídeo, com a legenda pronta para copiar (limite do Telegram: 1024 caracteres).
    const form = new FormData();
    form.set('chat_id', chat());
    form.set('caption', video.legenda.slice(0, 1024));
    form.set('supports_streaming', 'true');
    form.set('video', new Blob([await readFile(arquivo)], { type: 'video/mp4' }), `${video.id}.mp4`);
    await chamar('sendVideo', form);

    // 2) Mensagem separada com produto e o seu link, fácil de copiar.
    const texto = [
      `Produto: ${video.produto_nome ?? video.item_id}`,
      video.link_afiliado ? `Seu link:\n${video.link_afiliado}` : 'Sem link de afiliado gerado.',
    ].join('\n\n');
    const msg = new URLSearchParams({ chat_id: chat(), text: texto, disable_web_page_preview: 'true' });
    await chamar('sendMessage', msg);
  },
};
