import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

export async function duracaoSegundos(arquivo: string): Promise<number> {
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arquivo,
  ]);
  return Number(stdout.trim());
}

/** Padroniza para 1080x1920 (9:16), H.264 + AAC, no máximo 60s. */
export async function padronizar(entrada: string, saida: string): Promise<void> {
  const dur = await duracaoSegundos(entrada);
  if (!(dur >= 5)) throw new Error(`Vídeo com ${dur}s, mínimo é 5s`);

  const filtro =
    'scale=1080:1920:force_original_aspect_ratio=decrease,' +
    'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=30';

  await run('ffmpeg', [
    '-y', '-i', entrada,
    '-t', '60',
    '-vf', filtro,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
    '-movflags', '+faststart',
    saida,
  ]);
}
