# Setup completo — Achados BR Autoposter

## Fluxo real (sem intervenção manual após setup)

```
GitHub Actions (09h / 15h / 20h BRT)
  → Busca produtos ML com desconto
  → Gera imagem do pin (1000x1500px)
  → Envia webhook → Make.com → Pinterest
```

---

## PARTE 1 — Make.com (fazer primeiro)

### 1.1 Crie uma conta gratuita
Acesse make.com e crie conta. O plano gratuito tem 1.000 operações/mês.

### 1.2 Crie um novo cenário

**Módulo 1 — Gatilho: Webhooks → Custom Webhook**
- Clique em "Add" → escolha "Webhooks" → "Custom Webhook"
- Clique em "Add" para criar o webhook
- **Copie a URL gerada** (vai ficar no formato `https://hook.eu1.make.com/XXXXXX`)
- Guarde essa URL — você vai precisar no Passo 2

**Módulo 2 — Tools → Set Variable**
- Variable name: `imagem_base64`
- Variable value: `{{1.imagem_base64}}`

**Módulo 3 — Tools → Base64 Decode**
- Data: `{{2.imagem_base64}}`
- Output type: Binary

**Módulo 4 — Pinterest → Create a Pin**
- Connection: conecte sua conta Pinterest
- Board ID: `{{1.board_id}}`
- Title: `{{1.titulo}}`
- Description: `{{1.descricao}}`
- Link: `{{1.link}}`
- Image source: Output do Módulo 3 (binary)

> Se o módulo Pinterest não aparecer no plano gratuito, use **Módulo 4 alternativo** abaixo.

**Módulo 4 alternativo — HTTP → Make a Request**
- URL: `https://api.pinterest.com/v5/pins`
- Method: POST
- Headers: `Authorization: Bearer SEU_TOKEN_PINTEREST`
- Body (JSON):
```json
{
  "board_id": "{{1.board_id}}",
  "title": "{{1.titulo}}",
  "description": "{{1.descricao}}",
  "link": "{{1.link}}",
  "media_source": {
    "source_type": "image_base64",
    "content_type": "image/png",
    "data": "{{1.imagem_base64}}"
  }
}
```

### 1.3 Ative o cenário
Ligue o toggle "Scheduling" → escolha "Immediately as data arrives"

---

## PARTE 2 — GitHub Secrets (credenciais seguras)

No seu repositório GitHub:
**Settings → Secrets and variables → Actions → New repository secret**

Adicione estes secrets:

| Nome do Secret | Valor |
|---|---|
| `MAKE_WEBHOOK_URL` | URL copiada no Passo 1.2 |
| `ML_ETIQUETA` | `kini4438918` (sua etiqueta ML Afiliados) |
| `SHOPEE_AFFILIATE_ID` | Seu ID Shopee Afiliados (se tiver) |
| `PINTEREST_BOARD_BELEZA` | ID do board Beleza |
| `PINTEREST_BOARD_ELETRONICO` | ID do board Eletrônicos |
| `PINTEREST_BOARD_MODA` | ID do board Moda |
| `PINTEREST_BOARD_CASA` | ID do board Casa |
| `PINTEREST_BOARD_FITNESS` | ID do board Fitness |
| `PINTEREST_BOARD_GERAL` | ID do board padrão |

### Como encontrar o Board ID do Pinterest
1. Abra o Pinterest no navegador
2. Entre no board desejado
3. A URL será: `pinterest.com/achadosdobr/nome-do-board/`
4. Cole a URL inteira no Make.com — ele resolve automaticamente
   OU use a API Explorer em developers.pinterest.com

---

## PARTE 3 — Ativar o GitHub Actions

1. No repositório, vá em **Actions**
2. Clique em "Achados BR — Autoposter Pinterest"
3. Clique em **"Enable workflow"** se estiver desabilitado
4. Para testar agora: clique em **"Run workflow"** → "Run workflow"

O workflow roda automaticamente:
- 09:00 BRT (todo dia)
- 15:00 BRT (todo dia)
- 20:00 BRT (todo dia)

Cada execução posta **5 pins** = **15 pins/dia** sem intervenção.

---

## PARTE 4 — Personalizar o que é postado

Edite `config.py` para ajustar:

```python
ML_CATEGORIAS = [
    "MLB1051",   # Beleza
    "MLB1648",   # Eletrônicos
    "MLB1430",   # Moda
    "MLB1574",   # Casa
    "MLB1196",   # Fitness
]

MIN_DESCONTO_PERCENT = 20   # Mínimo de desconto para postar
MAX_PRECO = 500             # Preço máximo dos produtos
PINS_POR_EXECUCAO = 5       # Pins por rodada (3 rodadas/dia = 15/dia)
```

Outras categorias ML disponíveis em: `https://api.mercadolibre.com/sites/MLB/categories`

---

## Mercado Livre Afiliados — sua etiqueta

Sua etiqueta `kini4438918` já está configurada no código.

Todos os links gerados ficam no formato:
```
https://www.mercadolivre.com.br/[produto]?MTM_CAMPAIGN=kini4438918&MTM_SOURCE=afiliados&MTM_MEDIUM=referral
```

Acompanhe suas comissões em: `https://afiliados.mercadolivre.com.br`

---

## Dicas de SEO Pinterest

- Os horários do GitHub Actions (09h/15h/20h BRT) são os de maior engajamento no Brasil
- Use boards temáticos separados por categoria — o script já direciona automaticamente
- Mínimo de 10–15 pins/dia para crescimento orgânico acelerado
- Títulos com palavra-chave principal no início (já gerado automaticamente)
- Não misture nichos no mesmo board
