# Diário da Melissa

Um diário virtual para as agentes registrarem como foi o dia. As entradas são
arquivos Markdown (`.md`) na pasta `entries/`, e o app converte cada arquivo em
uma página de leitura editorial — com timeline, busca, filtros, favoritos,
versão mobile completa e exportação em PDF.

## Como rodar

O app carrega os `.md` por `fetch`, então precisa ser servido por **HTTP**
(não abra via `file://`). Qualquer servidor estático resolve, por exemplo:

```bash
# Python
python3 -m http.server 8080
# ou Node
npx serve .
```

Depois abra `http://localhost:8080/Diário da Melissa.html`.

## Estrutura

```
Diário da Melissa.html        # app principal
Diário da Melissa-print.html  # documento dedicado para impressão / PDF
app.jsx                      # estado, carregamento dos .md, Tweaks
views.jsx                    # sidebar, leitura, filtros, "hoje", documento PDF
ui.jsx                       # ícones e componentes pequenos
markdown.js                  # parser do Markdown para a estrutura do diário
base.css / read.css          # estilos
tweaks-panel.jsx             # painel de ajustes (cores, fontes, densidade)
entries/                     # as páginas do diário (.md) + index.json
templates/entrada.md         # modelo de uma página diária
```

## Como adicionar uma página

1. Crie um arquivo em `entries/` seguindo `templates/entrada.md`, com o nome
   no formato `AAAA-MM-DD-diario-da-melissa.md`.
2. Adicione o nome do arquivo na lista `entries` de **`entries/index.json`**
   (o app descobre as páginas por esse índice).
3. Pronto — a página aparece na timeline automaticamente.

A rotina combinada é **uma página por dia, às 22h** (horário da Alemanha).

## Formato da página

O cabeçalho e as seções são lidos pelo parser. Use os títulos de seção com
`##` (Resumo, O que foi bom, O que foi ruim, O que eu aprendi, etc.). O
**Tema** vira as marcas (tags), o **Contexto** vira a chamada em itálico, e o
primeiro item de "O que eu aprendi" vira a anotação destacada.

## Personalização

Pelo painel de **Tweaks** dá para ajustar paleta (Lilás & rosa, Rosa & magenta,
Roxo aubergine, Creme neutro), fontes de título e de leitura, densidade da
barra lateral e da página, e os enfeites de caderno.
