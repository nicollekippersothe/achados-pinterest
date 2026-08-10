# Como configurar o Make.com para postar no Pinterest

## Fluxo completo

```
Google Drive (pasta "pins/") → Make.com → Pinterest
```

---

## Passo 1 — Configurar o script local

1. Instale as dependências:
   ```bash
   pip install Pillow python-pptx jinja2
   ```

2. Abra `affiliate.py` e coloque seus IDs de afiliado:
   ```python
   SHOPEE_AFFILIATE_ID = "seu_id_shopee"
   ML_AFFILIATE_ID = "seu_id_ml"
   ```

3. Rode para testar:
   ```bash
   python gerar_pin.py
   ```

4. Os arquivos `.png` e `.json` aparecem na pasta `pins/`

---

## Passo 2 — Subir imagens para o Google Drive

Sincronize (manual ou automático) a pasta `pins/` com uma pasta no Google Drive.
Sugestão: use o app Google Drive Desktop para sincronização automática.

---

## Passo 3 — Configurar o Make.com (gratuito)

### Cenário no Make.com:

**Módulo 1 — Gatilho: Google Drive → Watch Files in a Folder**
- Folder: sua pasta `pins/`
- File type: `png`
- Interval: 15 minutos

**Módulo 2 — Google Drive → Download a File**
- File ID: `{{1.id}}`

**Módulo 3 — Google Drive → Download a File** (para o JSON)
- File name: mesmo nome do PNG mas com extensão `.json`

**Módulo 4 — JSON → Parse JSON**
- JSON string: conteúdo do arquivo `.json`

**Módulo 5 — Pinterest → Create a Pin**
- Board ID: seu board de destino
- Title: `{{4.titulo}}`
- Description: `{{4.descricao}}`
- Link: `{{4.link}}`
- Image: arquivo do Módulo 2

---

## IDs de afiliado — onde encontrar

### Shopee Afiliados
1. Acesse: https://affiliate.shopee.com.br
2. Crie sua conta de afiliado
3. Gere links pelo painel — o ID fica no parâmetro `af_sub1`

### Mercado Livre Afiliados
1. Acesse: https://afiliados.mercadolivre.com.br
2. Crie conta e pegue seu `publisher_id`
3. Coloque em `ML_AFFILIATE_ID` no `affiliate.py`

---

## Dicas de SEO Pinterest

- Poste entre 19h–22h (horário de maior engajamento BR)
- Use boards temáticos (ex: "Achados Shopee", "Ofertas ML")
- Mínimo 5 pins/dia para crescimento orgânico
- Títulos com palavra-chave principal no início
