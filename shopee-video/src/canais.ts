// Uma regra de leitura por canal. Cada canal escreve a legenda de um jeito, então cada um tem o seu modo.
//
//  marcador : o canal avisa que o post é de produto com uma frase fixa (ex.: "Vídeo pronto para afiliados").
//             Só aceita post com a frase E com nome de produto na legenda.
//  so-link  : a legenda é apenas o link da Shopee. O nome do produto vem da API de Afiliados.
//             Qualquer texto a mais é tratado como anúncio ou promoção e o post é rejeitado.
//  generico : canal sem regra própria. Aceita só legenda com nome de produto e sem palavra de anúncio.

export interface RegraCanal {
  modo: 'marcador' | 'so-link' | 'generico';
  marcador?: RegExp;
  bloquear?: RegExp; // palavras que descartam o post, além das comuns
  observacao?: string;
}

export const REGRAS: Record<string, RegraCanal> = {
  achadosshopebrasil: {
    modo: 'marcador',
    marcador: /V[ií]deo pronto para afiliados/i,
    observacao: 'Legenda: nome do produto + "Vídeo pronto para afiliados". Anúncios vêm como #publi sem esse aviso.',
  },
  achadinhosshopeeafiliados: {
    modo: 'so-link',
    observacao: 'Legenda é só o link. Nome via API de Afiliados.',
  },
};

export const REGRA_PADRAO: RegraCanal = { modo: 'generico' };

export const regraDoCanal = (canal: string): RegraCanal => REGRAS[canal] ?? REGRA_PADRAO;
