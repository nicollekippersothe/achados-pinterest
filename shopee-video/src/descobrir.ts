// Escolhe produtos sozinho, baixa um vídeo de creator da página e coloca na fila.
import { db } from './db.js';
import { config } from './config.js';
import { buscarProdutos, buscarPorItem, gerarLink, type Produto } from './affiliate.js';
import { capturarVideo } from './fonte-video.js';
import { enfileirar } from './fila.js';
import { lerCanal, resolverProduto, baixarVideo } from './telegram.js';
import { gerarLegenda } from './legenda.js';
import { classificar } from './filtro.js';

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

let adicionados = 0;
const motivos: Record<string, number> = {};

async function viaTelegram() {
  for (const canal of embaralhar(config.telegramCanais)) {
    if (adicionados >= config.porRodada) return;
    let posts;
    try { posts = await lerCanal(canal, config.telegramPaginas); }
    catch (e) { console.error(`[tg:${canal}] falha ao ler:`, e instanceof Error ? e.message : e); continue; }
    console.log(`[tg:${canal}] ${posts.length} posts com vídeo e link da Shopee`);
    const aceitosAntes = posts.filter((p) => classificar(p).ok).length;
    if (posts.length >= 10 && aceitosAntes === 0) {
      console.warn(`[tg:${canal}] ATENÇÃO: nenhum post passou na regra do canal. O formato das legendas pode ter mudado (ver src/canais.ts).`);
    }

    let tentados = 0;
    for (const post of embaralhar(posts)) {
      if (adicionados >= config.porRodada || tentados >= config.maxCandidatos) break;
      const v = classificar(post);
      if (!v.ok) { motivos[v.motivo] = (motivos[v.motivo] ?? 0) + 1; continue; }
      tentados++;
      try {
        const ids = await resolverProduto(post.linkShopee);
        if (!ids) { motivos['link não é de produto'] = (motivos['link não é de produto'] ?? 0) + 1; continue; }
        if (await jaVisto(ids.itemId)) continue;

        const prod = await buscarPorItem(ids.itemId); // pode ser null (sem oferta ou API indisponível)
        if (prod && (prod.commissionRate < config.minComissao || prod.sales < config.minVendas || prod.ratingStar < config.minNota)) {
          await db.from('sv_descartados').upsert({ item_id: ids.itemId, motivo: 'fora dos filtros' });
          console.log(`[${ids.itemId}] fora dos filtros, descartado`);
          continue;
        }
        const nome = prod?.productName ?? v.nome;
        if (!nome) { motivos['sem nome (API não achou o produto)'] = (motivos['sem nome (API não achou o produto)'] ?? 0) + 1; continue; }

        const urlProduto = `https://shopee.com.br/product/${ids.shopId}/${ids.itemId}`;
        // Sempre o SEU link de afiliado. O link do canal nunca é reutilizado.
        const link = prod?.offerLink || (await gerarLink(urlProduto));
        const arquivo = await baixarVideo(post.videoUrl);
        const id = await enfileirar({
          arquivo, itemId: ids.itemId, legenda: gerarLegenda({ productName: nome }), linkAfiliado: link,
          produtoNome: nome, urlProduto, preco: prod?.price, comissaoPct: prod?.commissionRate,
        });
        adicionados++;
        console.log(`[${ids.itemId}] na fila (${id}) via ${canal}: ${nome}`);
      } catch (e) {
        console.error(`[tg:${canal}/${post.id}] erro:`, e instanceof Error ? e.message : e);
      }
    }
  }
}

async function viaApi() {
const kw = config.keywords.length ? config.keywords[Math.floor(Math.random() * config.keywords.length)] : undefined;
const pagina = 1 + Math.floor(Math.random() * 3);
console.log(`Buscando produtos (palavra: ${kw ?? 'geral'}, página ${pagina})`);

const todos = await buscarProdutos({ keyword: kw, page: pagina, limit: 40 });
const bons: Produto[] = todos.filter(
  (p) => p.commissionRate >= config.minComissao && p.sales >= config.minVendas && p.ratingStar >= config.minNota,
);
console.log(`${todos.length} produtos, ${bons.length} passam nos filtros`);

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
console.log(`[api] ${tentados} tentados.`);
}

for (const fonte of config.fontes) {
  if (adicionados >= config.porRodada) break;
  if (fonte === 'telegram') await viaTelegram();
  else if (fonte === 'api') await viaApi();
}
console.log(`Descoberta concluída: ${adicionados} adicionados. Descartados por motivo:`, motivos);
