# memory-lp

Arquivo editorial público da Lurdex em React + Vite.

## O que este app faz

- lê o snapshot exportado do Holographic em `data/memories.json`
- publica a leitura como app estático no GitHub Pages
- mantém busca, filtros, seleção e leitor em modo somente leitura

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

O build copia `data/memories.json` para `public/data/memories.json` e gera o site final em `docs/`.
