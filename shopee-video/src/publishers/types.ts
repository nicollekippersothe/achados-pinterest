import type { Video } from '../db.js';

export interface Publisher {
  /** Publica o arquivo local. Lança erro se falhar. */
  publicar(video: Video, arquivoLocal: string): Promise<void>;
}
