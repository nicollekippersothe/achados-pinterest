// Decide se um post do Telegram é um vídeo de PRODUTO, aplicando a regra do canal de origem (ver canais.ts).
import type { PostTelegram } from './telegram.js';
import { nomeDoTexto } from './telegram.js';
import { regraDoCanal } from './canais.js';

// Anúncios do próprio canal e promoções genéricas que não são um produto.
const ANUNCIO =
  /\b(pack|canal vip|canal de (storys?|carross|v[ií]deos)|grupo privado|desafio|combo|curso|mentoria|aula|lista de grupos|automa[cç][aã]o|seja afiliado|por apenas r\$|oferta rel[aâ]mpago|vagas?)\b/i;
const PROMO_GENERICA = /\b(cupom|cupons|frete gr[aá]tis|mega ?sale|flash ?sale|dia \d{1,2}\.\d{1,2}|campanha|resgate)\b/i;

export interface Veredito {
  ok: boolean;
  motivo: string;
  nome: string | null;
}

const soLink = (texto: string) =>
  texto.replace(/https?:\/\/\S+/g, '').replace(/[\s\p{Extended_Pictographic}️]/gu, '').length === 0;

export function classificar(post: PostTelegram): Veredito {
  const regra = regraDoCanal(post.canal);
  const texto = post.texto;
  const nome = nomeDoTexto(texto);

  if (regra.bloquear?.test(texto)) return { ok: false, motivo: 'bloqueado pela regra do canal', nome };

  if (regra.modo === 'so-link') {
    return soLink(texto)
      ? { ok: true, motivo: 'só link (nome via API)', nome: null }
      : { ok: false, motivo: 'legenda fora do padrão do canal', nome };
  }

  if (regra.modo === 'marcador') {
    if (!regra.marcador?.test(texto)) return { ok: false, motivo: 'sem marcador de produto', nome };
    return nome
      ? { ok: true, motivo: 'marcador de produto', nome }
      : { ok: false, motivo: 'sem nome de produto', nome };
  }

  // generico
  if (ANUNCIO.test(texto)) return { ok: false, motivo: 'anúncio do canal', nome };
  if (PROMO_GENERICA.test(texto)) return { ok: false, motivo: 'promoção genérica', nome };
  if (!nome) return { ok: false, motivo: 'sem legenda de produto', nome };
  return nome.split(' ').length >= 3
    ? { ok: true, motivo: 'legenda com nome de produto', nome }
    : { ok: false, motivo: 'legenda curta demais', nome };
}
