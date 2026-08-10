"""Gera imagem de pin para Pinterest usando Pillow (sem custo de API)."""

import textwrap
import urllib.request
import io
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
except ImportError:
    raise ImportError("Instale: pip install Pillow")


# Dimensão ideal Pinterest: 1000x1500px (proporção 2:3)
PIN_W, PIN_H = 1000, 1500

# Paleta Achados BR
COR_FUNDO = "#F2EDE4"
COR_HEADER = "#7A8C6E"
COR_TEXTO = "#3D3530"
COR_SUBTEXTO = "#5a5248"
COR_PRECO = "#7A8C6E"
COR_PRECO_DE = "#9C8E80"
COR_BTN = "#E63946"
COR_BTN_TEXTO = "#FFFFFF"
COR_MARCA = "#9C8E80"


def hex_to_rgb(h: str) -> tuple:
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def baixar_imagem(url: str, largura: int = PIN_W, altura: int = 700) -> Image.Image:
    """Baixa imagem do produto e redimensiona."""
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            dados = resp.read()
        img = Image.open(io.BytesIO(dados)).convert("RGB")
        img = img.resize((largura, altura), Image.LANCZOS)
        return img
    except Exception:
        # Fallback: retângulo colorido
        img = Image.new("RGB", (largura, altura), hex_to_rgb(COR_HEADER))
        return img


def carregar_fonte(tamanho: int, negrito: bool = False) -> ImageFont.ImageFont:
    """Tenta carregar fontes do sistema; usa default como fallback."""
    candidatas = (
        ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
         "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]
        if negrito else
        ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
         "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"]
    )
    for caminho in candidatas:
        if Path(caminho).exists():
            return ImageFont.truetype(caminho, tamanho)
    return ImageFont.load_default()


def quebrar_texto(texto: str, fonte: ImageFont.ImageFont, largura_max: int, draw: ImageDraw.ImageDraw) -> list:
    """Quebra texto para caber na largura máxima."""
    palavras = texto.split()
    linhas, linha_atual = [], ""
    for palavra in palavras:
        teste = (linha_atual + " " + palavra).strip()
        bbox = draw.textbbox((0, 0), teste, font=fonte)
        if bbox[2] - bbox[0] <= largura_max:
            linha_atual = teste
        else:
            if linha_atual:
                linhas.append(linha_atual)
            linha_atual = palavra
    if linha_atual:
        linhas.append(linha_atual)
    return linhas


def gerar_pin(
    nome_produto: str,
    preco: str,
    link_afiliado: str,
    plataforma: str = "outro",
    preco_de: str = None,
    descricao: str = None,
    imagem_url: str = None,
    hashtags: list = None,
    pasta_saida: str = "pins",
    nome_arquivo: str = None,
) -> str:
    """Gera imagem PNG do pin e retorna o caminho do arquivo salvo."""
    Path(pasta_saida).mkdir(exist_ok=True)

    canvas = Image.new("RGB", (PIN_W, PIN_H), hex_to_rgb(COR_FUNDO))
    draw = ImageDraw.ImageDraw(canvas)

    # --- Header ---
    draw.rectangle([(0, 0), (PIN_W, 100)], fill=hex_to_rgb(COR_HEADER))
    fonte_marca = carregar_fonte(28, negrito=True)
    draw.text((PIN_W // 2, 50), "ACHADOS BR", font=fonte_marca,
              fill=hex_to_rgb("#FFFFFF"), anchor="mm")

    # --- Imagem do produto ---
    y_img = 100
    altura_img = 650
    if imagem_url:
        img_produto = baixar_imagem(imagem_url, PIN_W, altura_img)
    else:
        img_produto = Image.new("RGB", (PIN_W, altura_img), hex_to_rgb("#E8E0D4"))
        d = ImageDraw.Draw(img_produto)
        d.text((PIN_W // 2, altura_img // 2), "📦", fill=hex_to_rgb(COR_HEADER), anchor="mm")
    canvas.paste(img_produto, (0, y_img))

    # --- Área de texto ---
    y = y_img + altura_img + 32
    margem = 56

    # Nome do produto
    fonte_titulo = carregar_fonte(44, negrito=True)
    linhas_titulo = quebrar_texto(nome_produto, fonte_titulo, PIN_W - 2 * margem, draw)
    for linha in linhas_titulo[:3]:
        draw.text((margem, y), linha, font=fonte_titulo, fill=hex_to_rgb(COR_TEXTO))
        bbox = draw.textbbox((0, 0), linha, font=fonte_titulo)
        y += (bbox[3] - bbox[1]) + 8
    y += 16

    # Descrição curta
    if descricao:
        fonte_desc = carregar_fonte(30)
        linhas_desc = quebrar_texto(descricao[:120], fonte_desc, PIN_W - 2 * margem, draw)
        for linha in linhas_desc[:2]:
            draw.text((margem, y), linha, font=fonte_desc, fill=hex_to_rgb(COR_SUBTEXTO))
            bbox = draw.textbbox((0, 0), linha, font=fonte_desc)
            y += (bbox[3] - bbox[1]) + 6
        y += 20

    # Preço de (riscado)
    if preco_de:
        fonte_preco_de = carregar_fonte(32)
        texto_de = f"De {preco_de}"
        draw.text((margem, y), texto_de, font=fonte_preco_de, fill=hex_to_rgb(COR_PRECO_DE))
        bbox = draw.textbbox((margem, y), texto_de, font=fonte_preco_de)
        # linha riscada
        meio_y = (bbox[1] + bbox[3]) // 2
        draw.line([(bbox[0], meio_y), (bbox[2], meio_y)], fill=hex_to_rgb(COR_PRECO_DE), width=2)
        y += (bbox[3] - bbox[1]) + 8

    # Preço atual
    fonte_preco = carregar_fonte(64, negrito=True)
    draw.text((margem, y), preco, font=fonte_preco, fill=hex_to_rgb(COR_PRECO))
    bbox = draw.textbbox((0, 0), preco, font=fonte_preco)
    y += (bbox[3] - bbox[1]) + 28

    # Botão CTA
    btn_h = 72
    btn_y1, btn_y2 = y, y + btn_h
    draw.rounded_rectangle([(margem, btn_y1), (PIN_W - margem, btn_y2)],
                            radius=12, fill=hex_to_rgb(COR_BTN))
    plat_label = {"shopee": "Shopee", "mercadolivre": "Mercado Livre"}.get(plataforma, "")
    cta = f"VER OFERTA NA {plat_label.upper()}" if plat_label else "VER OFERTA →"
    fonte_btn = carregar_fonte(30, negrito=True)
    draw.text((PIN_W // 2, btn_y1 + btn_h // 2), cta,
              font=fonte_btn, fill=hex_to_rgb(COR_BTN_TEXTO), anchor="mm")
    y = btn_y2 + 24

    # Hashtags
    if hashtags:
        fonte_tags = carregar_fonte(24)
        tags_texto = "  ".join(f"#{t}" for t in hashtags[:6])
        draw.text((margem, y), tags_texto, font=fonte_tags, fill=hex_to_rgb(COR_HEADER))

    # Rodapé
    draw.rectangle([(0, PIN_H - 56), (PIN_W, PIN_H)], fill=hex_to_rgb(COR_HEADER))
    fonte_rodape = carregar_fonte(22)
    draw.text((PIN_W // 2, PIN_H - 28), "ACHADOS BR · BRASIL",
              font=fonte_rodape, fill=hex_to_rgb("#FFFFFF"), anchor="mm")

    # Salvar
    nome_arquivo = nome_arquivo or f"pin_{nome_produto[:30].replace(' ', '_').lower()}.png"
    caminho = str(Path(pasta_saida) / nome_arquivo)
    canvas.save(caminho, "PNG", optimize=True)
    return caminho
