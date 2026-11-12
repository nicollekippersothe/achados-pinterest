// Cliente da API de Afiliados da Shopee (GraphQL). Credenciais em affiliate.shopee.com.br > API aberta.
// Atenção: escrito a partir da documentação pública que conheço, ainda NÃO testado com credenciais reais.
import { createHash } from 'node:crypto';
import { config } from './config.js';

const ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql';

async function gql<T>(query: string): Promise<T> {
  const appId = config.affiliateAppId();
  const ts = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ query });
  const sig = createHash('sha256').update(`${appId}${ts}${payload}${config.affiliateSecret()}`).digest('hex');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `SHA256 Credential=${appId}, Timestamp=${ts}, Signature=${sig}`,
    },
    body: payload,
  });
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (!res.ok || json.errors?.length) {
    throw new Error(`API de afiliados: ${JSON.stringify(json.errors ?? res.status)}`);
  }
  return json.data as T;
}

export interface Produto {
  itemId: string;
  shopId: string;
  productName: string;
  price: number;
  sales: number;
  ratingStar: number;
  commissionRate: number; // fração, ex.: 0.12
  offerLink: string;
  productLink: string;
}

export async function buscarProdutos(opts: { keyword?: string; page?: number; limit?: number }): Promise<Produto[]> {
  const kw = opts.keyword ? `keyword: ${JSON.stringify(opts.keyword)},` : '';
  const q = `{
    productOfferV2(${kw} sortType: 5, page: ${opts.page ?? 1}, limit: ${opts.limit ?? 40}) {
      nodes { itemId shopId productName price sales ratingStar commissionRate offerLink productLink }
    }
  }`;
  const d = await gql<{ productOfferV2: { nodes: Record<string, string>[] } }>(q);
  return d.productOfferV2.nodes.map((n) => ({
    itemId: String(n.itemId),
    shopId: String(n.shopId),
    productName: n.productName,
    price: Number(n.price),
    sales: Number(n.sales),
    ratingStar: Number(n.ratingStar),
    commissionRate: Number(n.commissionRate),
    offerLink: n.offerLink,
    productLink: n.productLink,
  }));
}

export async function gerarLink(urlOriginal: string): Promise<string> {
  const q = `mutation { generateShortLink(input: { originUrl: ${JSON.stringify(urlOriginal)} }) { shortLink } }`;
  const d = await gql<{ generateShortLink: { shortLink: string } }>(q);
  return d.generateShortLink.shortLink;
}

/** Consulta um produto específico. Retorna null se não houver oferta de afiliado ou se a consulta falhar. */
export async function buscarPorItem(itemId: string): Promise<Produto | null> {
  try {
    const q = `{ productOfferV2(itemId: ${Number(itemId)}, limit: 1) {
      nodes { itemId shopId productName price sales ratingStar commissionRate offerLink productLink } } }`;
    const d = await gql<{ productOfferV2: { nodes: Record<string, string>[] } }>(q);
    const n = d.productOfferV2.nodes[0];
    if (!n) return null;
    return {
      itemId: String(n.itemId), shopId: String(n.shopId), productName: n.productName,
      price: Number(n.price), sales: Number(n.sales), ratingStar: Number(n.ratingStar),
      commissionRate: Number(n.commissionRate), offerLink: n.offerLink, productLink: n.productLink,
    };
  } catch (e) {
    console.warn(`consulta por item ${itemId} falhou:`, e instanceof Error ? e.message : e);
    return null;
  }
}
