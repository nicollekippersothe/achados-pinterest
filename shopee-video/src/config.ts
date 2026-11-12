import 'dotenv/config';

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável ${name} não definida (.env)`);
  return v;
}

export const config = {
  supabaseUrl: () => req('SUPABASE_URL'),
  supabaseKey: () => req('SUPABASE_SERVICE_ROLE_KEY'),
  publisher: (process.env.PUBLISHER ?? 'telegram') as 'api' | 'playwright' | 'telegram',
  minIntervalMin: Number(process.env.MIN_INTERVAL_MIN ?? 30),
  maxTentativas: Number(process.env.MAX_TENTATIVAS ?? 3),
  storageState: process.env.STORAGE_STATE ?? './storageState.json',
  uploadUrl: () => req('SHOPEE_UPLOAD_URL'),
  headless: (process.env.HEADLESS ?? 'true') === 'true',
  bucket: 'sv-videos',

  // Fontes de vídeo: telegram (padrão) e/ou api (página do produto; a Shopee bloqueia IP de datacenter)
  fontes: (process.env.FONTES ?? 'telegram').split(',').map((s) => s.trim()).filter(Boolean),
  telegramCanais: (process.env.TELEGRAM_CANAIS ??
    'achadosshopebrasil,achadinhosshopeeafiliados')
    .split(',').map((s) => s.trim()).filter(Boolean),
  telegramPaginas: Number(process.env.TELEGRAM_PAGINAS ?? 2),

  // Descoberta automática (API de Afiliados)
  affiliateAppId: () => req('AFFILIATE_APP_ID'),
  affiliateSecret: () => req('AFFILIATE_SECRET'),
  keywords: (process.env.KEYWORDS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  filaMin: Number(process.env.FILA_MIN ?? 6),          // só busca produto novo se a fila tiver menos que isso
  porRodada: Number(process.env.DISCOVER_PER_RUN ?? 2),
  maxCandidatos: Number(process.env.MAX_CANDIDATOS ?? 12),
  minComissao: Number(process.env.MIN_COMISSAO ?? 0.08), // 8%
  minVendas: Number(process.env.MIN_VENDAS ?? 100),
  minNota: Number(process.env.MIN_NOTA ?? 4.5),
};
