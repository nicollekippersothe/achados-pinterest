"""
Setup inicial — único arquivo que você precisa configurar.
Em produção, os valores sensíveis vêm de variáveis de ambiente (GitHub Secrets).
"""

import os

# ---------------------------------------------------------------------------
# AFILIADOS
# ---------------------------------------------------------------------------
SHOPEE_AFFILIATE_ID = os.getenv("SHOPEE_AFFILIATE_ID", "")
ML_ETIQUETA = os.getenv("ML_ETIQUETA", "kini4438918")

# ---------------------------------------------------------------------------
# MAKE.COM — Webhook URL do seu cenário
# ---------------------------------------------------------------------------
MAKE_WEBHOOK_URL = os.getenv("MAKE_WEBHOOK_URL", "")

# ---------------------------------------------------------------------------
# PINTEREST — Um único board para tudo
# Cole a URL do board: pinterest.com/achadosdobr/nome-do-board/
# ---------------------------------------------------------------------------
PINTEREST_BOARD_ID = os.getenv("PINTEREST_BOARD_ID", "https://br.pinterest.com/achadosdobr/pinterest_board_beleza/")

# ---------------------------------------------------------------------------
# PRODUTOS — O que buscar automaticamente
# ---------------------------------------------------------------------------

# Categorias do Mercado Livre
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
# CONTROLE INTERNO
# ---------------------------------------------------------------------------
HISTORICO_FILE = "pins/historico.json"
