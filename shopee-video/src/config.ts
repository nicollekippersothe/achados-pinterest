import 'dotenv/config';

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável ${name} não definida (.env)`);
  return v;
}

export const config = {
  supabaseUrl: () => req('SUPABASE_URL'),
  supabaseKey: () => req('SUPABASE_SERVICE_ROLE_KEY'),
  publisher: (process.env.PUBLISHER ?? 'playwright') as 'api' | 'playwright',
  minIntervalMin: Number(process.env.MIN_INTERVAL_MIN ?? 90),
  maxTentativas: Number(process.env.MAX_TENTATIVAS ?? 3),
  storageState: process.env.STORAGE_STATE ?? './storageState.json',
  uploadUrl: () => req('SHOPEE_UPLOAD_URL'),
  headless: (process.env.HEADLESS ?? 'true') === 'true',
  bucket: 'sv-videos',
};
