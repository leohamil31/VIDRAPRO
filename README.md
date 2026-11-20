# VidraPro — SaaS de orçamentos para vidraçarias e serralherias de alumínio

**🔗 Demo ao vivo:** https://leohamil31.github.io/VIDRAPRO/ (modo demonstração — dados salvos só no seu navegador; clique em *Entrar*)

![Painel](docs/screenshots/dashboard.png)

MVP multi-tenant: medidas do vão → **preço para o cliente** + **lista de corte para a oficina** + **PDF com a logo** + **envio por WhatsApp** + **kanban de pedidos**.

```
vidrapro/
├── database/schema.sql          PostgreSQL / Supabase: tabelas, RLS, triggers, função pública, seed de preços
├── packages/engine/             Motor de cálculo (TypeScript puro, zero dependências, browser + Node)
│   ├── src/catalog.ts           Tipologias, perfis (kg/m), vidros, parâmetros de desconto
│   ├── src/cutting/             OFICINA: deduções → perfis, vidros, kits, otimização de barras 6 m
│   ├── src/pricing/             CLIENTE: BOM + tabela de preços → custo, markup, totais
│   ├── src/quote.ts             Junta os dois + mensagem WhatsApp / link wa.me
│   └── test/engine.test.js      11 testes (node --test)
├── backend/                     Express + TypeScript + pg + zod
│   └── src/{server,db,env}.ts, middleware/{auth,subscription}.ts, routes/{auth,settings,quotes,public,webhooks}.ts
└── frontend/                    React 19 + Tailwind v4 (Vite)
    └── src/pages/{Dashboard,QuoteBuilder,QuoteView,CuttingListPage,Settings,Login}.tsx
        src/components/schematic/Schematic.tsx   desenho técnico SVG em escala
        src/lib/demo.ts                          backend offline (localStorage) para demonstrações
```

## Rodando

```bash
npm install
npm test                                   # testes do motor

# Banco (Postgres local ou Supabase SQL editor)
psql "$DATABASE_URL_ADMIN" -f database/schema.sql
# troque a senha do role app_api: ALTER ROLE app_api PASSWORD '...';

cp backend/.env.example backend/.env       # ajuste as URLs/segredos
cp frontend/.env.example frontend/.env
npm run dev:api                            # http://localhost:4000
npm run dev:web                            # http://localhost:5173
```

Sem `VITE_API_URL` o frontend roda em **modo demonstração** (dados de exemplo no navegador) — útil para mostrar a clientes.

## Isolamento multi-tenant (defesa em camadas)

1. Toda tabela de negócio tem `tenant_id NOT NULL`.
2. **RLS forçado** em todas elas, com política `tenant_id = current_tenant_id()`.
3. A API roda como role `app_api` (**sem BYPASSRLS**) e cada request acontece dentro de `withTenant()`, que faz `set_config('app.tenant_id', …, true)` local à transação. Se alguém esquecer um `WHERE tenant_id`, o banco bloqueia mesmo assim.
4. Com Supabase direto no cliente, `current_tenant_id()` resolve pelo `auth.uid()`.
5. Colunas de assinatura (`subscription_status` etc.) **não têm GRANT de UPDATE** para o tenant — só o webhook (service role) altera.
6. Trigger impede `quote_items` apontando para orçamento de outro tenant.
7. Link público usa `public_quote(token)` (SECURITY DEFINER) que devolve **só** campos para o cliente — nunca custo, margem ou lista de corte. Rascunhos não são públicos.

Testado em Postgres 16: inserção cruzada bloqueada por RLS, edição de assinatura negada, sem tenant = 0 linhas, numeração por tenant (#1, #2… independente).

## Motor de cálculo (v2)

📋 **[CHECKLIST.md](CHECKLIST.md)**: cada modelo, linha, acessório e etapa do fluxo, com o status de cada um.

- **27 modelos** em duas seções: *Esquadrias de alumínio* (janelas de correr 2F/4F, veneziana 3F, maxim-ar, basculante, abrir 2F, fixo; portas de correr 2F/4F, veneziana 3F, giro com vidro 1F/2F, giro lambri, giro veneziana; painel lambri, fachada pele de vidro, guarda-corpo de alumínio) e *Vidro temperado (Blindex)* (box frontal e de canto, pivotante, porta de abrir, porta de correr aparente, janelas 2F/4F, fixo, sacada retrátil, guarda-corpo com perfil U).
- **Linhas como dados** (`packages/engine/src/lines.ts`): Suprema, Gold, Linha 30, Inova e Linha 16, mais fachada e guarda-corpo. Cada empresa copia uma linha e edita códigos, kg/m e descontos, sem mexer no código.
- **45 acessórios itemizados** (roldanas, fechos, fechaduras, puxadores, dobradiças, pivôs, vedações por metro…), cada um com preço próprio.
- **Desenho técnico gerado pelo motor** (`cutting.drawing`): um único componente SVG desenha qualquer modelo.
- A separação continua a mesma: `cutting/` não conhece dinheiro e `pricing/` não conhece descontos.

> ⚠️ **Valide antes de produzir.** Códigos, pesos e descontos são valores de referência. Copie a linha e ajuste pelo catálogo do seu fornecedor.

## API

| Método | Rota | |
|---|---|---|
| POST | `/auth/signup`, `/auth/login` | modo local (scrypt + JWT) |
| POST | `/auth/onboard` | modo Supabase Auth: cria a empresa do usuário |
| GET/PUT | `/settings`, `/settings/prices` · POST `/settings/logo` | logo → Supabase Storage |
| GET/POST/PUT/DELETE | `/settings/lines`, `/settings/lines/:id` | linhas padrão + linhas próprias |
| GET | `/quotes`, `/quotes/stats`, `/quotes/pricing-context` | |
| POST | `/quotes/preview` | cálculo sem salvar |
| POST/GET/PUT/DELETE | `/quotes`, `/quotes/:id` | edição só em Rascunho/Enviado |
| PATCH | `/quotes/:id/status` | kanban (oficina só move para Produção/Concluído) |
| GET | `/quotes/:id/cutting-list` | lista consolidada + barras de 6 m por acabamento |
| POST | `/quotes/:id/share` | marca Enviado, devolve link `wa.me` + URL pública (sem o número interno) |
| GET | `/public/quotes/:token` | página do cliente final (rate limited) |
| POST | `/webhooks/billing` | HMAC `X-Signature: sha256=…`, idempotente por `id` |

**Assinatura:** `trial`/`active` = acesso total. `past_due`, `canceled` ou trial vencido = **somente leitura** (escritas retornam 402). O status vai no header `X-Subscription-Status` e o frontend mostra um banner. O webhook recebe um evento normalizado (`subscription.activated`, `invoice.paid`, `invoice.payment_failed`, `subscription.canceled`) — escreva um adaptador curto por provedor (Stripe, Asaas, Pagar.me).

## Próximos passos sugeridos

- Tela "Fórmulas" para cada vidraçaria sobrescrever `SLIDING_PARAMS` / pesos de perfil (guardar em `tenants.settings jsonb`).
- Mais tipologias (maxim-ar, basculante, porta de giro alumínio, guarda-corpo).
- Bandeira/fixo superior nas portas; travessa intermediária em portas altas.
- Geração de PDF no servidor (hoje é `window.print()` com CSS de impressão A4).
