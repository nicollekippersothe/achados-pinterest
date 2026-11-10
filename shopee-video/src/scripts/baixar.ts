// Uso manual: npm run baixar -- <url_do_video_ou_produto> "<legenda>" <link_afiliado> [item_id]
import { capturarVideo } from '../fonte-video.js';
import { enfileirar } from '../fila.js';

const [url, legenda = '', link, itemIdArg] = process.argv.slice(2);
if (!url) {
  console.error('Uso: npm run baixar -- <url> "<legenda>" <link_afiliado> [item_id]');
  process.exit(1);
}
const m = url.match(/-i\.(\d+)\.(\d+)/) ?? url.match(/\/product\/(\d+)\/(\d+)/);
const itemId = itemIdArg ?? m?.[2];
if (!itemId) {
  console.error('Sem item_id: passe-o como 4º argumento (necessário para URL de vídeo de creator).');
  process.exit(1);
}
const v = await capturarVideo(url);
if (!v) {
  console.error('Nenhum vídeo capturado.');
  process.exit(1);
}
const id = await enfileirar({ arquivo: v.arquivo, itemId, legenda, linkAfiliado: link ?? null, produtoNome: v.titulo, urlProduto: url });
console.log('Na fila:', id);
