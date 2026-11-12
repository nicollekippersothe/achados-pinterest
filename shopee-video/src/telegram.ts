// Lê canais PÚBLICOS do Telegram pela página de preview (t.me/s/<canal>), sem login.
// Pega mensagens com vídeo + link da Shopee, resolve o item_id pelo redirecionamento do link curto
// e baixa o mp4. Nenhuma página da Shopee é aberta.
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const SHOPEE_LINK = /https?:\/\/(?:s\.shopee\.com\.br|shope\.ee|shp\.ee)\/[A-Za-z0-9_-]+/;

export interface PostTelegram {
  canal: string;
  id: number;
  videoUrl: string;
  texto: string;
  linkShopee: string;
}

const decode = (s: string) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function parsePagina(canal: string, html: string): { posts: PostTelegram[]; menorId: number } {
  const blocos = html.split('<div class="tgme_widget_message_wrap').slice(1);
  const posts: PostTelegram[] = [];
  let menorId = Infinity;
  for (const b of blocos) {
    const idm = b.match(/data-post="[^/"]+\/(\d+)"/);
    if (!idm) continue;
    const id = Number(idm[1]);
    menorId = Math.min(menorId, id);
    const video = b.match(/<video[^>]+src="([^"]+)"/)?.[1];
    if (!video) continue;
    const textoHtml = [...b.matchAll(/tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/g)].map((m) => m[1]).join(' ');
    const texto = decode(textoHtml.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, ' '));
    const links = [...b.matchAll(/href="([^"]+)"/g)].map((m) => decode(m[1]!));
    const link = links.find((l) => SHOPEE_LINK.test(l)) ?? texto.match(SHOPEE_LINK)?.[0];
    if (!link) continue;
    posts.push({ canal, id, videoUrl: decode(video), texto, linkShopee: link });
  }
  return { posts, menorId: Number.isFinite(menorId) ? menorId : 0 };
}

/** Busca posts do canal. `paginas` = quantas páginas (de ~20 posts) voltar no tempo. */
export async function lerCanal(canal: string, paginas = 1): Promise<PostTelegram[]> {
  const todos: PostTelegram[] = [];
  let before = 0;
  for (let i = 0; i < paginas; i++) {
    const url = `https://t.me/s/${canal}${before ? `?before=${before}` : ''}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) break;
    const { posts, menorId } = parsePagina(canal, await res.text());
    todos.push(...posts);
    if (!menorId || menorId === before) break;
    before = menorId;
  }
  return todos;
}

/** Segue o link curto só até o redirecionamento e extrai shopId/itemId, sem abrir a página. */
export async function resolverProduto(linkCurto: string): Promise<{ shopId: string; itemId: string } | null> {
  let url = linkCurto;
  for (let i = 0; i < 5; i++) {
    const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': UA } });
    const loc = res.headers.get('location');
    if (!loc) return null;
    url = new URL(loc, url).toString();
    const m = url.match(/shopee\.com\.br\/(?:product\/|[^/?]+\/)(\d+)\/(\d+)/) ?? url.match(/-i\.(\d+)\.(\d+)/);
    if (m) return { shopId: m[1]!, itemId: m[2]! };
  }
  return null;
}

/** Nome do produto = primeira linha útil da legenda, sem emoji, hashtag e texto de chamada. */
export function nomeDoTexto(texto: string): string | null {
  for (const linha of texto.split('\n')) {
    const limpo = linha
      .replace(/https?:\/\/\S+/g, '')
      .replace(/#\w+/g, '')
      .replace(/V[ií]deo pronto.*$/i, '')
      .replace(/[\p{Extended_Pictographic}\uFE0F\u2022]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (limpo.length < 6) continue;
    if (/^(analise|edite|lista de grupos|automa[cç][aã]o|canal|acesse|entre)/i.test(limpo)) continue;
    return limpo;
  }
  return null;
}

export async function baixarVideo(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Download do vídeo falhou: HTTP ${res.status}`);
  await mkdir('./tmp', { recursive: true });
  const arquivo = `./tmp/${randomUUID()}.mp4`;
  await writeFile(arquivo, Buffer.from(await res.arrayBuffer()));
  return arquivo;
}
