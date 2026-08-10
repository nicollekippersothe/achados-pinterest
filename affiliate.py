"""Formata links de afiliado para Shopee e Mercado Livre."""

import os
from urllib.parse import urlparse, urlencode, urlunparse, parse_qs

# Etiqueta do ML Afiliados (MLM_CAMPAIGN) — rastreia suas comissões
# Lida do ambiente (GitHub Secret) ou hardcoded aqui
ML_ETIQUETA = os.getenv("ML_ETIQUETA", "kini4438918")

# ID de afiliado Shopee (af_sub1)
SHOPEE_AFFILIATE_ID = os.getenv("SHOPEE_AFFILIATE_ID", "")


def formatar_shopee(url: str, affiliate_id: str = None) -> str:
    """Adiciona rastreamento de afiliado Shopee. Aceita shope.ee ou shopee.com.br."""
    affiliate_id = affiliate_id or SHOPEE_AFFILIATE_ID
    if not affiliate_id:
        return url
    parsed = urlparse(url)
    params = parse_qs(parsed.query, keep_blank_values=True)
    params["af_sub1"] = [affiliate_id]
    params["smtt"] = ["0.0.9"]
    nova_query = urlencode({k: v[0] for k, v in params.items()})
    return urlunparse(parsed._replace(query=nova_query))


def formatar_ml(url: str, etiqueta: str = None) -> str:
    """
    Adiciona rastreamento de afiliado Mercado Livre.
    Usa MTM_CAMPAIGN com a etiqueta do painel ML Afiliados.
    Formato oficial: ?MTM_CAMPAIGN=<etiqueta>&MTM_SOURCE=afiliados&MTM_MEDIUM=referral
    """
    etiqueta = etiqueta or ML_ETIQUETA
    if not etiqueta:
        return url
    parsed = urlparse(url)
    params = parse_qs(parsed.query, keep_blank_values=True)
    params["MTM_CAMPAIGN"] = [etiqueta]
    params["MTM_SOURCE"]   = ["afiliados"]
    params["MTM_MEDIUM"]   = ["referral"]
    nova_query = urlencode({k: v[0] for k, v in params.items()})
    return urlunparse(parsed._replace(query=nova_query))


def detectar_plataforma(url: str) -> str:
    dominio = urlparse(url).netloc.lower()
    if "shopee" in dominio or "shope.ee" in dominio:
        return "shopee"
    if "mercadolivre" in dominio or "mercadopago" in dominio or "mlcdn" in dominio or "mercadoshops" in dominio:
        return "mercadolivre"
    return "outro"


def link_afiliado(url: str) -> dict:
    """Retorna link com rastreamento de afiliado e plataforma detectada."""
    plataforma = detectar_plataforma(url)
    if plataforma == "shopee":
        return {"url": formatar_shopee(url), "plataforma": "Shopee"}
    if plataforma == "mercadolivre":
        return {"url": formatar_ml(url), "plataforma": "Mercado Livre"}
    return {"url": url, "plataforma": "outro"}


if __name__ == "__main__":
    # Teste rápido
    url_ml = "https://www.mercadolivre.com.br/produto/exemplo-p123456"
    url_shopee = "https://shopee.com.br/produto/exemplo"
    print("ML:    ", formatar_ml(url_ml))
    print("Shopee:", formatar_shopee(url_shopee) if SHOPEE_AFFILIATE_ID else "(sem ID Shopee configurado)")
