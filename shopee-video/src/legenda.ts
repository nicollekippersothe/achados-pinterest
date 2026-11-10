import type { Produto } from './affiliate.js';

const aberturas = [
  'Achadinho da Shopee que vale ver 👇',
  'Olha esse achado 👀',
  'Esse aqui tá saindo muito 🛒',
  'Salva esse achado pra depois 💾',
];
const fechos = [
  'Toca na sacolinha pra ver o produto.',
  'O link do produto está na sacolinha.',
  'Corre na sacolinha pra conferir.',
];

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]!;

export function gerarLegenda(p: Produto): string {
  const nome = p.productName.length > 70 ? p.productName.slice(0, 67).trimEnd() + '...' : p.productName;
  return `${pick(aberturas)}\n${nome}\n${pick(fechos)}\n#shopee #achadosshopee #shopeevideos #achadinhos`;
}
