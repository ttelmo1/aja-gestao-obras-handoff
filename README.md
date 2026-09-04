# Sistema de Gestão de Obras — AJA Grupo Empresarial

Next.js + Prisma + PostgreSQL. Deploy on-premise, acesso restrito à rede local.

Documentação de escopo em [`docs/`](docs/):

| Arquivo | Conteúdo |
|---|---|
| [`docs/requisitos.md`](docs/requisitos.md) | Requisitos validados com o cliente |
| [`docs/escopo-e-orcamento.md`](docs/escopo-e-orcamento.md) | Horas por módulo e restrições contratuais |
| [`docs/etapas-e-status.md`](docs/etapas-e-status.md) | Andamento da implementação |
| [`docs/pontos-para-reuniao.md`](docs/pontos-para-reuniao.md) | Decisões assumidas a validar com o cliente |

Convenções e restrições fixas: [`CLAUDE.md`](CLAUDE.md).

## Requisitos

- Node.js 20+ (desenvolvido em 24)
- PostgreSQL 16+

## Como rodar

```bash
cp .env.example .env          # ajuste DATABASE_URL e SESSION_SECRET
docker compose up -d          # ou um Postgres local, ver abaixo
npm install
npm run db:migrate            # cria o schema
npm run db:seed               # admin + setores
npm run dev                   # http://localhost:3000
```

Sem Docker, um Postgres local serve igual:

```bash
brew install postgresql@16 && brew services start postgresql@16
createuser -s aja && createdb -O aja aja_obras
```

Para as reuniões de validação, dados fictícios:

```bash
npm run db:seed -- --demo
```

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `start` | Build e execução em produção |
| `npm test` | Testes das regras de negócio (runner do Node) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Cria/aplica migration em desenvolvimento |
| `npm run db:deploy` | Aplica migrations em produção |
| `npm run db:seed` | Provisionamento inicial (`-- --demo` para dados fictícios) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | Recria o banco do zero |

## Organização

```
prisma/          schema, migrations e seed
storage/         documentos enviados — FORA de public/, nunca versionados
src/app/         rotas (App Router); (app)/ é a área autenticada
src/modules/     regra de negócio, sem React — é onde ficam as decisões
src/components/  UI
src/lib/         prisma, env, dinheiro, datas pt-BR
tests/           testes das regras de negócio
```

`src/modules/` não importa React de propósito: cálculo financeiro, farol,
fluxo de tramitação e permissões são funções puras, testáveis sem subir o Next.

## Pontos de atenção

- **Dinheiro nunca é `number`.** `Decimal` do Prisma até a formatação final,
  via helpers em `src/lib/money.ts`.
- **O fluxo de tramitação é fixo** (`src/modules/tramitacao/fluxo.ts`). Etapas
  podem ser marcadas "não se aplica"; a ordem não muda e não é configurável.
- **DWG/RVT estão bloqueados** (`src/modules/documentos/formatos.ts`) até
  confirmação do cliente. Liberar é trocar uma constante, sem migration.
- **A auditoria é imutável**: trigger no banco bloqueia UPDATE e DELETE.
- **Nada depende de internet em runtime** — sem fontes do Google, sem CDN,
  telemetria do Next desligada. O servidor do cliente pode estar offline.

## Instalação no cliente

Fora do escopo das 140h contratadas, a definir após visita técnica.
Backup, energia e disponibilidade do servidor são responsabilidade do cliente.
