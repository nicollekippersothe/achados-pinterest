// Verifica a saúde da regra de cada canal, sem tocar no Supabase.
// Uso: npm run canais   (sai com erro se algum canal não rende nenhum post aproveitável)
import { config } from '../config.js';
import { lerCanal, resolverProduto } from '../telegram.js';
import { classificar } from '../filtro.js';
import { regraDoCanal } from '../canais.js';

let falhou = false;
for (const canal of config.telegramCanais) {
  const regra = regraDoCanal(canal);
  const posts = await lerCanal(canal, config.telegramPaginas);
  const motivos: Record<string, number> = {};
  let aceitos = 0, produto = 0, semProduto = 0;
  for (const p of posts) {
    const v = classificar(p);
    motivos[v.motivo] = (motivos[v.motivo] ?? 0) + 1;
    if (!v.ok) continue;
    aceitos++;
    (await resolverProduto(p.linkShopee)) ? produto++ : semProduto++;
  }
  const saudavel = posts.length >= 5 && produto > 0;
  if (!saudavel) falhou = true;
  console.log(`\n== ${canal} (regra: ${regra.modo}) ${saudavel ? 'OK' : 'ATENÇÃO'}`);
  console.log(`   ${posts.length} posts com vídeo e link | ${aceitos} aceitos | ${produto} viraram produto | ${semProduto} link não é de produto`);
  console.log('   motivos:', motivos);
  if (!saudavel) console.log('   A regra pode estar desatualizada ou o canal mudou o formato das legendas.');
}
process.exit(falhou ? 1 : 0);
