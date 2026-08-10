"""Formata links de afiliado para Shopee e Mercado Livre."""

import re
from urllib.parse import urlparse, urlencode, urlunparse, parse_qs, urljoin


SHOPEE_AFFILIATE_ID = ""   # ex: "achadosbr"
ML_AFFILIATE_ID = ""       # ex: "achadosbr" ou ID numérico


def formatar_shopee(url: str, affiliate_id: str = SHOPEE_AFFILIATE_ID) -> str:
    """
    Adiciona parâmetro de afiliado Shopee.
    Aceita links shope.ee ou shopee.com.br.
    """
    if not affiliate_id:
        return url
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    params["af_sub1"] = [affiliate_id]
    params["smtt"] = ["0.0.9"]
    nova_query = urlencode({k: v[0] for k, v in params.items()})
    return urlunparse(parsed._replace(query=nova_query))


def formatar_ml(url: str, affiliate_id: str = ML_AFFILIATE_ID) -> str:
    """
    Adiciona parâmetro de afiliado Mercado Livre.
    Usa o programa Mercado Livre Afiliados (deal_print_id ou partner_id).
    """
    if not affiliate_id:
        return url
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    params["deal_print_id"] = [affiliate_id]
    nova_query = urlencode({k: v[0] for k, v in params.items()})
    return urlunparse(parsed._replace(query=nova_query))


def detectar_plataforma(url: str) -> str:
    dominio = urlparse(url).netloc.lower()
    if "shopee" in dominio or "shope.ee" in dominio:
        return "shopee"
    if "mercadolivre" in dominio or "mercadopago" in dominio or "mlcdn" in dominio:
        return "mercadolivre"
    return "outro"


def link_afiliado(url: str) -> dict:
    """Retorna link formatado e plataforma detectada."""
    plataforma = detectar_plataforma(url)
    if plataforma == "shopee":
        return {"url": formatar_shopee(url), "plataforma": "Shopee"}
    if plataforma == "mercadolivre":
        return {"url": formatar_ml(url), "plataforma": "Mercado Livre"}
    return {"url": url, "plataforma": "outro"}
