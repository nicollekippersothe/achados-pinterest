"""
Orquestrador principal — roda sozinho via GitHub Actions.
Busca produtos, gera pins e envia para o Make.com postar no Pinterest.
"""

import json
import urllib.request
import urllib.error
import sys
from pathlib import Path

from config import MAKE_WEBHOOK_URL, PINTEREST_BOARD_ID
from product_fetcher import buscar_melhores_produtos
from seo_pinterest import gerar_seo_completo
from image_generator import gerar_pin
from affiliate import link_afiliado




def enviar_webhook(payload: dict) -> bool:
    """Envia dados do pin para o Make.com via webhook."""
    if not MAKE_WEBHOOK_URL:
        print("  [SKIP] MAKE_WEBHOOK_URL não configurado — salvando JSON apenas.")
        return False

    dados = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        MAKE_WEBHOOK_URL,
        data=dados,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            status = resp.status
            print(f"  Webhook enviado: HTTP {status}")
            return status == 200
    except urllib.error.HTTPError as e:
        print(f"  Erro webhook: HTTP {e.code}")
        return False
    except Exception as e:
        print(f"  Erro webhook: {e}")
        return False


def processar_produto(produto: dict) -> bool:
    """Processa um produto: gera imagem, SEO, link e envia para Make.com."""
    print(f"\nProcessando: {produto['nome'][:60]}...")

    # Link de afiliado
    afiliado = link_afiliado(produto["url"])
    plataforma = afiliado["plataforma"].lower().replace(" ", "")

    url_final = afiliado["url"]   # já contém MTM_CAMPAIGN=kini4438918

    # SEO
    seo = gerar_seo_completo(
        nome_produto=produto["nome"],
        preco=produto["preco"],
        preco_de=produto.get("preco_de"),
        plataforma=plataforma,
    )

    # Imagem
    try:
        caminho_imagem = gerar_pin(
            nome_produto=produto["nome"],
            preco=produto["preco"],
            link_afiliado=url_final,
            plataforma=plataforma,
            preco_de=produto.get("preco_de"),
            imagem_url=produto.get("imagem_url"),
            hashtags=seo["hashtags"],
            pasta_saida="pins",
        )
        print(f"  Imagem: {caminho_imagem}")
    except Exception as e:
        print(f"  Erro ao gerar imagem: {e}")
        return False

    # Lê imagem como base64 para enviar no webhook
    import base64
    try:
        imagem_b64 = base64.b64encode(Path(caminho_imagem).read_bytes()).decode()
    except Exception:
        imagem_b64 = None

    # Monta payload para Make.com
    descricao_completa = seo["descricao"] + "\n\n" + " ".join(f"#{h}" for h in seo["hashtags"])

    payload = {
        "titulo": seo["titulo"],
        "descricao": descricao_completa,
        "link": url_final,
        "plataforma": afiliado["plataforma"],
        "desconto": f"{produto['desconto_percent']}%",
        "board_id": PINTEREST_BOARD_ID,
        "imagem_path": caminho_imagem,
        "imagem_base64": imagem_b64,
        "produto_id": produto["id"],
    }

    # Salva JSON local (útil para debug e Make.com via Google Drive)
    json_path = Path(caminho_imagem).with_suffix(".json")
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2))

    # Envia webhook
    enviar_webhook(payload)

    print(f"  Titulo: {seo['titulo']}")
    print(f"  Desconto: {produto['desconto_percent']}%  |  {produto['preco']}")
    return True


def main():
    print("=" * 60)
    print("ACHADOS BR — Autoposter")
    print("=" * 60)

    produtos = buscar_melhores_produtos()

    if not produtos:
        print("Nenhum produto disponível. Encerrando.")
        sys.exit(0)

    sucessos = 0
    for produto in produtos:
        ok = processar_produto(produto)
        if ok:
            sucessos += 1

    print(f"\n{'=' * 60}")
    print(f"Concluído: {sucessos}/{len(produtos)} pins gerados e enviados.")
    print("=" * 60)


if __name__ == "__main__":
    main()
