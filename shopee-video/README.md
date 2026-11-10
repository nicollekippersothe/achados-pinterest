# shopee-video

Fila de vídeos para o Shopee Vídeos: padroniza com FFmpeg e publica com o produto de afiliado vinculado.

## Fluxo

`add-video` envia o .mp4 ao Storage e cria a linha em `sv_videos` (pendente)
→ worker baixa, padroniza para 1080x1920 H.264/AAC (máx. 60s) → status `pronto`
→ worker publica um por vez, respeitando `MIN_INTERVAL_MIN` → `publicado`.
Falhas voltam para a fila até `MAX_TENTATIVAS`, depois ficam em `erro`.

## Setup

1. Migration já aplicada no projeto `nicollekippersothe's Project` (URL `https://swyepprjyaqxqjwnakoy.supabase.co`). A service role key está em Settings > API do Supabase.
2. `cp .env.example .env` e preencha `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SHOPEE_UPLOAD_URL`.
3. `npm install` e `npx playwright install chromium`. Precisa de `ffmpeg` no PATH.
4. `npm run login` (abre o navegador, você loga, a sessão vai para `storageState.json`).
5. Preencha os seletores em `src/publishers/selectors.ts` com a tela real de upload.
6. Para baixar da própria Shopee: `npm run baixar -- <url_do_produto> "legenda" <link_afiliado>` (não testado contra a Shopee real).
   Para arquivo local: `npm run add -- video.mp4 <item_id> "legenda" <link_afiliado>`
7. `npm run worker` (ou `npx tsx src/worker.ts --once` para um ciclo, bom para cron).

## Pendências conhecidas

- Seletores do Playwright são placeholders. O publisher recusa rodar até serem preenchidos.
- Publisher `api` não implementado: não confirmei que a Shopee expõe endpoints de vídeo para afiliado.
- Se o clique em Publicar funcionar mas a confirmação falhar, o retry pode duplicar o post.
- Automatizar o painel viola os termos da Shopee. Poste pouco e com intervalos longos.
