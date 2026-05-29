# memory-lp

Visor público da Lurdex para explorar memórias, diário e relações em modo somente leitura.

## O que há aqui

- *Brain View*: mapa relacional com nós, clusters e seleção de memórias
- *Diary View*: timeline com busca, filtros e cards compactos
- *Inspector*: painel de detalhes com conteúdo, metadados, tags, entidades e relações
- snapshot exportado do Holographic em `data/memories.json`
- publicação estática no GitHub Pages via `docs/`

## Stack

- React
- TypeScript
- Vite

## Desenvolvimento

```bash
npm install
npm run dev
```

## Checks

```bash
npm run typecheck
npm run build
```

## Build

O build copia `data/memories.json` para `public/data/memories.json` e gera o site final em `docs/`.
