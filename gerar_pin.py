"""
Script principal: recebe dados do produto e gera pin completo (imagem + JSON para Make.com).

Uso rápido:
    python gerar_pin.py

Ou importe e chame gerar() no seu próprio script/automação.
"""

import json
import sys
from pathlib import Path
from datetime import datetime

from affiliate import link_afiliado
from seo_pinterest import gerar_seo_completo
from image_generator import gerar_pin


def gerar(
    nome_produto: str,
    preco: str,
    url_original: str,
    imagem_url: str = None,
    preco_de: str = None,
    descricao_extra: str = None,
    hashtags_extras: list = None,
    pasta_saida: str = "pins",
) -> dict:
    """
    Fluxo completo:
    1. Formata link de afiliado (Shopee ou ML detectado automaticamente)
    2. Gera SEO: título, descrição, hashtags otimizados para Pinterest
    3. Gera imagem do pin (1000x1500px)
    4. Salva JSON pronto para Make.com

    Retorna dict com todos os dados do pin gerado.
    """
    # 1. Link de afiliado
    afiliado = link_afiliado(url_original)
    plataforma = afiliado["plataforma"].lower().replace(" ", "")

    # 2. SEO
    seo = gerar_seo_completo(
        nome_produto=nome_produto,
        preco=preco,
        preco_de=preco_de,
        plataforma=plataforma,
        descricao_extra=descricao_extra,
        hashtags_extras=hashtags_extras,
    )

    # 3. Imagem
    nome_arquivo = f"pin_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    caminho_imagem = gerar_pin(
        nome_produto=nome_produto,
        preco=preco,
        link_afiliado=afiliado["url"],
        plataforma=plataforma,
        preco_de=preco_de,
        descricao=descricao_extra,
        imagem_url=imagem_url,
        hashtags=seo["hashtags"],
        pasta_saida=pasta_saida,
        nome_arquivo=nome_arquivo,
    )

    # 4. JSON para Make.com
    payload = {
        "titulo": seo["titulo"],
        "descricao": seo["descricao"] + "\n\n" + " ".join(f"#{h}" for h in seo["hashtags"]),
        "link": afiliado["url"],
        "plataforma": afiliado["plataforma"],
        "imagem_path": caminho_imagem,
        "hashtags": seo["hashtags"],
        "gerado_em": datetime.now().isoformat(),
    }

    json_path = Path(caminho_imagem).with_suffix(".json")
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2))

    print(f"\n✓ Pin gerado com sucesso!")
    print(f"  Imagem : {caminho_imagem}")
    print(f"  JSON   : {json_path}")
    print(f"  Título : {payload['titulo']}")
    print(f"  Link   : {payload['link']}")

    return payload


# ---------------------------------------------------------------------------
# Exemplos de uso direto
# ---------------------------------------------------------------------------
EXEMPLOS = [
    {
        "nome_produto": "Kit Skincare Completo Vitamina C",
        "preco": "R$ 89,90",
        "preco_de": "R$ 149,90",
        "url_original": "https://shopee.com.br/produto/exemplo-skincare",
        "imagem_url": None,
        "descricao_extra": "Hidratante + sérum + protetor solar. Pele radiante em 30 dias.",
        "hashtags_extras": ["vitamina_c", "pele_saudavel"],
    },
    {
        "nome_produto": "Fone Bluetooth sem Fio com Cancelamento de Ruído",
        "preco": "R$ 129,90",
        "preco_de": "R$ 280,00",
        "url_original": "https://www.mercadolivre.com.br/p/fone-bluetooth-exemplo",
        "imagem_url": None,
        "descricao_extra": "Até 30h de bateria. Compatível com iOS e Android.",
        "hashtags_extras": ["fone", "bluetooth", "tecnologia"],
    },
]


if __name__ == "__main__":
    print("Gerando pins de exemplo...\n")
    for exemplo in EXEMPLOS:
        gerar(**exemplo)
    print("\nPronto! Suba os arquivos da pasta 'pins/' para o Google Drive")
    print("e configure o Make.com para monitorar a pasta e postar no Pinterest.")
