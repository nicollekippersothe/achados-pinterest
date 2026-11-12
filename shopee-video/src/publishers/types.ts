import type { Video } from '../db.js';

export interface Publisher {
  /** Retorna o motivo pelo qual NÃO dá para publicar agora, ou null se está tudo pronto. */
  verificar?(): string | null;
  /** Publica o arquivo local. Lança erro se falhar. */
  publicar(video: Video, arquivoLocal: string): Promise<void>;
}
