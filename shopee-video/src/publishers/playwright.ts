import { chromium } from 'playwright';
import { config } from '../config.js';
import type { Video } from '../db.js';
import type { Publisher } from './types.js';
import { sel } from './selectors.js';

const pausa = (min = 800, max = 2200) =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

export const playwrightPublisher: Publisher = {
  async publicar(video: Video, arquivo: string) {
    if (Object.values(sel).some((s) => s.startsWith('TODO_'))) {
      throw new Error('Seletores em src/publishers/selectors.ts ainda não foram preenchidos');
    }

    const browser = await chromium.launch({ headless: config.headless });
    try {
      const ctx = await browser.newContext({ storageState: config.storageState });
      const page = await ctx.newPage();
      await page.goto(config.uploadUrl(), { waitUntil: 'networkidle' });
      if (/login|signin/i.test(page.url())) {
        throw new Error('Sessão expirada. Rode `npm run login` de novo.');
      }

      await page.setInputFiles(sel.inputArquivo, arquivo);
      await pausa();
      await page.fill(sel.campoLegenda, video.legenda);
      await pausa();

      await page.click(sel.botaoAdicionarProduto);
      await page.fill(sel.campoBuscaProduto, video.link_afiliado ?? video.item_id);
      await pausa(1500, 3000);
      await page.click(sel.resultadoProduto);
      await page.click(sel.botaoConfirmarProduto);
      await pausa();

      await page.click(sel.botaoPublicar);
      await page.waitForSelector(sel.sucesso, { timeout: 120_000 });
    } finally {
      await browser.close();
    }
  },
};
