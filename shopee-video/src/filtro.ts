// Decide se um post do Telegram é um vídeo de PRODUTO com legenda aproveitável.
// Regras baseadas no padrão real do canal: vídeos de produto trazem "Vídeo pronto para afiliados...",
// anúncios vendem pacote/canal/curso e não trazem link de produto.
import type { PostTelegram } from './telegram.js';
import { nomeDoTexto } from './telegram.js';

const MARCADOR_PRODUTO = /V[ií]deo pronto para afiliados/i;

// Anúncios do próprio canal e promoções genéricas (cupom, frete, campanha) que não são um produto.
const ANUNCIO =
  /\b(pack|canal vip|canal de (storys?|carross|v[ií]deos)|grupo privado|desafio|combo|curso|mentoria|aula|lista de grupos|automa[cç][aã]o|seja afiliado|por apenas r\$|oferta rel[aâ]mpago|vagas?)\b/i;
const PROMO_GENERICA = /\b(cupom|cupons|frete gr[aá]tis|mega ?sale|flash ?sale|dia \d{1,2}\.\d{1,2}|campanha|resgate)\b/i;

export interface Veredito {
  ok: boolean;
  motivo: string;
  nome: string | null;
}

export function classificar(post: PostTelegram): Veredito {
  const texto = post.texto;
  const nome = nomeDoTexto(texto);
  const temMarcador = MARCADOR_PRODUTO.test(texto);

  // Marcador do canal é o sinal mais forte de vídeo de produto.
  if (temMarcador) {
    return nome ? { ok: true, motivo: 'marcador de produto', nome } : { ok: false, motivo: 'sem nome de produto', nome };
  }

  if (ANUNCIO.test(texto)) return { ok: false, motivo: 'anúncio do canal', nome };
  if (PROMO_GENERICA.test(texto)) return { ok: false, motivo: 'promoção genérica', nome };
  // Post só com o link (sem texto): o nome do produto virá da API de Afiliados. Sem ela, o post é pulado depois.
  const semLinks = texto.replace(/https?:\/\/\S+/g, '').replace(/[\s\p{Extended_Pictographic}\uFE0F]/gu, '');
  if (!nome && semLinks.length === 0) return { ok: true, motivo: 'só link (nome via API)', nome: null };
  if (!nome) return { ok: false, motivo: 'sem legenda de produto', nome };
  // Sem marcador: só aceita legenda com cara de produto (nome razoável). O link ainda precisa resolver para item.
  return nome.split(' ').length >= 3
    ? { ok: true, motivo: 'legenda com nome de produto', nome }
    : { ok: false, motivo: 'legenda curta demais', nome };
}
