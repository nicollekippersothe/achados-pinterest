"""
Busca produtos com desconto na API pública do Mercado Livre.
Sem autenticação necessária para leitura pública.
"""

import json
import urllib.request
import urllib.parse
from pathlib import Path
from config import (
    ML_CATEGORIAS, MIN_DESCONTO_PERCENT, MAX_PRECO,
    MIN_AVALIACOES, MIN_NOTA, PINS_POR_EXECUCAO, HISTORICO_FILE,
)


ML_API = "https://api.mercadolibre.com"


def _get(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "AchadosBR/1.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())


def buscar_produtos_categoria(categoria_id: str, limite: int = 50) -> list:
    """Busca produtos em promoção dentro de uma categoria ML."""
    params = urllib.parse.urlencode({
        "category": categoria_id,
        "sort": "price_asc",   # Produtos mais baratos = maior alcance
        "limit": limite,
        "condition": "new",
    })
    url = f"{ML_API}/sites/MLB/search?{params}"
    try:
        data = _get(url)
        return data.get("results", [])
    except Exception as e:
        print(f"  Erro ao buscar categoria {categoria_id}: {e}")
        return []


def calcular_desconto(preco_atual: float, preco_original: float) -> float:
    if not preco_original or preco_original <= preco_atual:
        return 0.0
    return round((1 - preco_atual / preco_original) * 100, 1)


def filtrar_produto(item: dict) -> dict | None:
    """Retorna dados normalizados do produto se passar nos filtros, ou None."""
    preco = item.get("price", 0)
    preco_original = item.get("original_price") or preco
    desconto = calcular_desconto(preco, preco_original)

    if desconto < MIN_DESCONTO_PERCENT:
        return None
    if preco > MAX_PRECO:
        return None

    # Avaliações (nem todos os itens têm)
    reviews = item.get("reviews", {})
    total_reviews = reviews.get("total", 0) if reviews else 0
    nota = reviews.get("rating_average", 0) if reviews else 0

    if total_reviews > 0 and total_reviews < MIN_AVALIACOES:
        return None
    if nota > 0 and nota < MIN_NOTA:
        return None

    thumbnail = item.get("thumbnail", "").replace("-I.jpg", "-O.jpg")

    return {
        "id": item["id"],
        "nome": item["title"],
        "preco": f"R$ {preco:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
        "preco_de": f"R$ {preco_original:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if desconto > 0 else None,
        "desconto_percent": desconto,
        "url": item.get("permalink", ""),
        "imagem_url": thumbnail,
        "categoria_id": item.get("category_id", ""),
        "nota": nota,
        "avaliacoes": total_reviews,
    }


def carregar_historico() -> set:
    """IDs de produtos já postados (evita repetição)."""
    path = Path(HISTORICO_FILE)
    if path.exists():
        try:
            return set(json.loads(path.read_text()).get("ids", []))
        except Exception:
            pass
    return set()


def salvar_historico(ids_vistos: set):
    path = Path(HISTORICO_FILE)
    path.parent.mkdir(exist_ok=True)
    existentes = carregar_historico()
    todos = list(existentes | ids_vistos)[-500:]   # Mantém últimos 500
    path.write_text(json.dumps({"ids": todos}, ensure_ascii=False))


def buscar_melhores_produtos() -> list:
    """
    Busca produtos em todas as categorias configuradas,
    filtra pelos critérios de qualidade e retorna os melhores.
    """
    historico = carregar_historico()
    candidatos = []

    print(f"Buscando produtos em {len(ML_CATEGORIAS)} categorias...")

    for cat_id in ML_CATEGORIAS:
        itens = buscar_produtos_categoria(cat_id)
        for item in itens:
            if item["id"] in historico:
                continue
            produto = filtrar_produto(item)
            if produto:
                candidatos.append(produto)

    if not candidatos:
        print("Nenhum produto encontrado com os critérios atuais.")
        return []

    # Ordena por: maior desconto primeiro, depois por nota
    candidatos.sort(key=lambda p: (p["desconto_percent"], p["nota"]), reverse=True)

    # Remove duplicatas por ID
    vistos = set()
    unicos = []
    for p in candidatos:
        if p["id"] not in vistos:
            vistos.add(p["id"])
            unicos.append(p)

    selecionados = unicos[:PINS_POR_EXECUCAO]
    print(f"Selecionados {len(selecionados)} produtos para postar.")

    # Salva no histórico
    salvar_historico({p["id"] for p in selecionados})

    return selecionados
