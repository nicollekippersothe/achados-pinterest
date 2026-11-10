// Escolhe produtos sozinho, baixa um vídeo de creator da página e coloca na fila.
import { db } from './db.js';
import { config } from './config.js';
import { buscarProdutos, gerarLink, type Produto } from './affiliate.js';
import { capturarVideo } from './fonte-video.js';
import { enfileirar } from './fila.js';
import { gerarLegenda } from './legenda.js';

const embaralhar = <T,>(a: T[]) => a.map((x) => [Math.random(), x] as const).sort((x, y) => x[0] - y[0]).map(([, x]) => x);

async function tamanhoFila(): Promise<number> {
  const { count, error } = await db
    .from('sv_videos')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pendente', 'processando', 'pronto']);
  if (error) throw error;
  return count ?? 0;
}

async function jaVisto(itemId: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    db.from('sv_videos').select('id').eq('item_id', itemId).limit(1),
    db.from('sv_descartados').select('item_id').eq('item_id', itemId).limit(1),
  ]);
  return Boolean(a.data?.length || b.data?.length);
}

const fila = await tamanhoFila();
if (fila >= config.filaMin) {
  console.log(`Fila com ${fila} itens (mínimo ${config.filaMin}). Nada a descobrir.`);
  process.exit(0);
}

const kw = config.keywords.length ? config.keywords[Math.floor(Math.random() * config.keywords.length)] : undefined;
const pagina = 1 + Math.floor(Math.random() * 3);
console.log(`Buscando produtos (palavra: ${kw ?? 'geral'}, página ${pagina})`);

const todos = await buscarProdutos({ keyword: kw, page: pagina, limit: 40 });
const bons: Produto[] = todos.filter(
  (p) => p.commissionRate >= config.minComissao && p.sales >= config.minVendas && p.ratingStar >= config.minNota,
);
console.log(`${todos.length} produtos, ${bons.length} passam nos filtros`);

let adicionados = 0;
let tentados = 0;
for (const p of embaralhar(bons)) {
  if (adicionados >= config.porRodada || tentados >= config.maxCandidatos) break;
  if (await jaVisto(p.itemId)) continue;
  tentados++;

  const urlProduto = `https://shopee.com.br/product/${p.shopId}/${p.itemId}`;
  try {
    const v = await capturarVideo(urlProduto);
    if (!v) {
      await db.from('sv_descartados').upsert({ item_id: p.itemId, motivo: 'sem video' });
      console.log(`[${p.itemId}] sem vídeo, descartado`);
      continue;
    }
    const link = p.offerLink || (await gerarLink(p.productLink));
    const id = await enfileirar({
      arquivo: v.arquivo,
      itemId: p.itemId,
      legenda: gerarLegenda(p),
      linkAfiliado: link,
      produtoNome: p.productName,
      urlProduto,
      preco: p.price,
      comissaoPct: p.commissionRate,
    });
    adicionados++;
    console.log(`[${p.itemId}] na fila (${id}): ${p.productName}`);
  } catch (e) {
    console.error(`[${p.itemId}] erro:`, e instanceof Error ? e.message : e);
  }
}
console.log(`Descoberta concluída: ${adicionados} adicionados, ${tentados} tentados.`);
