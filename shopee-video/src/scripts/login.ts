// Abre o navegador visível para você logar na Shopee (SMS/2FA incluso) e salva a sessão.
import { chromium } from 'playwright';
import readline from 'node:readline/promises';
import { config } from '../config.js';

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(config.uploadUrl());

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
await rl.question('Faça login no navegador e aperte Enter aqui quando terminar... ');
rl.close();

await ctx.storageState({ path: config.storageState });
await browser.close();
console.log(`Sessão salva em ${config.storageState}`);
