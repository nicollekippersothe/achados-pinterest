"""Gera título, descrição e hashtags otimizados para Pinterest SEO."""

import re

# Palavras-chave de alta performance para achados/ofertas no Pinterest BR
KEYWORDS_OFERTA = ["oferta", "promoção", "desconto", "barato", "em promoção", "preço baixo"]
KEYWORDS_ACAO = ["compre agora", "aproveite", "não perca", "link na bio", "corre que é por tempo limitado"]

HASHTAGS_BASE = [
    "achadosbr", "achados", "oferta", "promocao", "desconto",
    "comprasinteligentes", "economize", "dicasdecompras",
]

HASHTAGS_PLATAFORMA = {
    "shopee": ["shopee", "shopeebrasil", "shopeeofertas", "cupomshopee"],
    "mercadolivre": ["mercadolivre", "melhoresofertasml", "mercadolivrebrasil"],
    "outro": [],
}

CATEGORIAS_KEYWORDS = {
    "moda": ["moda", "roupa", "look", "estilo", "fashion", "roupas femininas", "roupas masculinas"],
    "beleza": ["skincare", "maquiagem", "beleza", "cuidados", "cabelo", "perfume"],
    "casa": ["decoração", "organização", "cozinha", "casa", "utilidades"],
    "eletronico": ["eletrônico", "tecnologia", "gadget", "celular", "fone", "smartwatch"],
    "fitness": ["academia", "esporte", "fitness", "treino", "suplemento"],
    "infantil": ["bebê", "infantil", "criança", "brinquedo", "kids"],
    "pet": ["pet", "cachorro", "gato", "animal", "petshop"],
}


def detectar_categoria(nome_produto: str) -> str:
    nome = nome_produto.lower()
    for categoria, palavras in CATEGORIAS_KEYWORDS.items():
        if any(p in nome for p in palavras):
            return categoria
    return "geral"


def gerar_hashtags(nome_produto: str, plataforma: str = "outro", extra: list = None) -> list:
    categoria = detectar_categoria(nome_produto)
    tags = list(HASHTAGS_BASE)
    tags += HASHTAGS_PLATAFORMA.get(plataforma, [])

    if categoria in CATEGORIAS_KEYWORDS:
        palavra = CATEGORIAS_KEYWORDS[categoria][0].replace(" ", "")
        tags.append(palavra)

    if extra:
        tags += [t.lstrip("#").replace(" ", "").lower() for t in extra]

    # Remove duplicatas mantendo ordem
    seen = set()
    return [t for t in tags if not (t in seen or seen.add(t))][:15]


def gerar_titulo_seo(nome_produto: str, preco: str = None, plataforma: str = "outro") -> str:
    """
    Gera título Pinterest SEO-friendly (máx 100 caracteres).
    Formato: [Produto] com Desconto | Melhor Preço na [Plataforma]
    """
    nome = nome_produto.strip()
    plat_label = {"shopee": "Shopee", "mercadolivre": "Mercado Livre"}.get(plataforma, "")

    if preco and plat_label:
        titulo = f"{nome} por {preco} | Oferta {plat_label}"
    elif preco:
        titulo = f"{nome} por {preco} | Promoção Imperdível"
    elif plat_label:
        titulo = f"{nome} com Desconto na {plat_label}"
    else:
        titulo = f"{nome} | Oferta Imperdível — Achados BR"

    return titulo[:100]


def gerar_descricao_seo(
    nome_produto: str,
    preco: str = None,
    preco_de: str = None,
    plataforma: str = "outro",
    descricao_extra: str = None,
) -> str:
    """
    Gera descrição Pinterest SEO-friendly (máx 500 caracteres).
    Inclui palavras-chave naturalmente + CTA.
    """
    plat_label = {"shopee": "Shopee", "mercadolivre": "Mercado Livre"}.get(plataforma, "a loja")
    categoria = detectar_categoria(nome_produto)
    kw_categoria = CATEGORIAS_KEYWORDS.get(categoria, ["produto"])[0]

    partes = []

    if preco_de and preco:
        partes.append(f"De {preco_de} por apenas {preco}! 🔥")
    elif preco:
        partes.append(f"Encontrei por {preco} — preço incrível! 🔥")

    if descricao_extra:
        partes.append(descricao_extra.strip())

    partes.append(
        f"Achado de {kw_categoria} com desconto em {plat_label}. "
        f"Aproveite essa promoção antes que acabe — link direto no pin!"
    )

    descricao = " ".join(partes)
    return descricao[:500]


def gerar_seo_completo(
    nome_produto: str,
    preco: str = None,
    preco_de: str = None,
    plataforma: str = "outro",
    descricao_extra: str = None,
    hashtags_extras: list = None,
) -> dict:
    return {
        "titulo": gerar_titulo_seo(nome_produto, preco, plataforma),
        "descricao": gerar_descricao_seo(nome_produto, preco, preco_de, plataforma, descricao_extra),
        "hashtags": gerar_hashtags(nome_produto, plataforma, hashtags_extras),
    }
