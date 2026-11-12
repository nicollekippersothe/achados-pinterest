import type { Publisher } from './types.js';

// Só implemente se o portal de desenvolvedores da Shopee mostrar endpoints de
// vídeo disponíveis para a sua conta (init_video_upload, upload_video_part,
// complete_video_upload, edit_video_info, post_video). Não confirmei que existem
// para afiliado. Fluxo previsto: assinar com HMAC-SHA256, enviar em partes de 4 MB
// com MD5, finalizar, vincular item_id e publicar.
export const apiPublisher: Publisher = {
  verificar: () => 'publisher api não implementado',
  async publicar() {
    throw new Error('Publisher "api" não implementado. Valide os endpoints no portal antes.');
  },
};
