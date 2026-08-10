"""
Setup inicial — único arquivo que você precisa configurar.
Em produção, os valores sensíveis vêm de variáveis de ambiente (GitHub Secrets).
"""

import os

# ---------------------------------------------------------------------------
# AFILIADOS
# ---------------------------------------------------------------------------
SHOPEE_AFFILIATE_ID = os.getenv("SHOPEE_AFFILIATE_ID", "")
ML_PUBLISHER_ID = os.getenv("ML_PUBLISHER_ID", "")

# ---------------------------------------------------------------------------
# MAKE.COM — Webhook URL do seu cenário
# ---------------------------------------------------------------------------
MAKE_WEBHOOK_URL = os.getenv("MAKE_WEBHOOK_URL", "")

# ---------------------------------------------------------------------------
# PRODUTOS — O que buscar automaticamente
# ---------------------------------------------------------------------------

# Categorias do Mercado Livre (IDs oficiais)
# Consulte todas: https://api.mercadolibre.com/sites/MLB/categories
ML_CATEGORIAS = [
    "MLB1051",   # Beleza e Cuidado Pessoal
    "MLB1648",   # Eletrônicos
    "MLB1430",   # Roupas e Acessórios
    "MLB1574",   # Casa e Móveis
    "MLB1196",   # Esportes e Fitness
]

# Filtros de qualidade
MIN_DESCONTO_PERCENT = 20      # Só posta produtos com >= 20% de desconto
MAX_PRECO = 500                # Preço máximo em reais
MIN_AVALIACOES = 10            # Mínimo de avaliações
MIN_NOTA = 4.0                 # Nota mínima

# Quantos pins gerar por execução (3x/dia = 15 pins/dia)
PINS_POR_EXECUCAO = 5

# ---------------------------------------------------------------------------
# PINTEREST — Board IDs por categoria
# Encontre seus board IDs em: https://developers.pinterest.com/tools/api-explorer/
# ---------------------------------------------------------------------------
PINTEREST_BOARD_IDS = {
    "beleza":     os.getenv("PINTEREST_BOARD_BELEZA", ""),
    "eletronico": os.getenv("PINTEREST_BOARD_ELETRONICO", ""),
    "moda":       os.getenv("PINTEREST_BOARD_MODA", ""),
    "casa":       os.getenv("PINTEREST_BOARD_CASA", ""),
    "fitness":    os.getenv("PINTEREST_BOARD_FITNESS", ""),
    "geral":      os.getenv("PINTEREST_BOARD_GERAL", ""),
}

# ---------------------------------------------------------------------------
# CONTROLE INTERNO
# ---------------------------------------------------------------------------
HISTORICO_FILE = "pins/historico.json"
