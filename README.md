# Mapa de Funcionalidades — UX + CX

Ferramenta interna de governança UX + CX + Produto da CAIXA Consórcio.

## Fase atual: 1 + 2 + 3 + 4

Frontend + Supabase + CRUD + governança + inteligência analítica.

### Telas

- `/` — Dashboard avançada com insights
- `/inteligencia` — Diagnóstico automático (cobertura, gaps, migração, paridade)
- `/mapa` — Mapa + matriz + filtros
- `/funcionalidades/[id]` — Hub de governança
- `/inteligencia` — Insights | Comparações | Transformações
- `/inteligencia/comparacoes` — Canal × Canal (paridade + Health canônico)
- `/inteligencia/transformacoes` — CURRENT × FUTURE (cobertura)
- `/comparacao`, `/transformacao` — redirects legados → Intelligence
- `/gaps` — Melhorias (Lacunas · Problemas · Oportunidades)
- `/gaps/[id]` — Detalhe de problema
- `/cadastros` — CRUD completo

### Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui + Lucide
- Supabase (PostgreSQL)

### Configuração

Copie `.env.example` para `.env.local` e preencha as chaves do projeto Supabase.

```bash
npm install
npm run dev
```

### Qualidade

```bash
npm run lint
npm run build
```
