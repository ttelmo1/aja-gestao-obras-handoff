# Sistema de Gestão de Obras — AJA Grupo Empresarial

Sistema web para gestão de obras de construção civil (contratos públicos), incluindo
controle de medições, tramitação de processos, gestão documental e rerratificações
contratuais.

## Contexto do projeto

- Requisitos completos, já validados com o engenheiro do cliente: **`docs/requisitos.md`**
  — leia antes de implementar qualquer módulo novo. Pontos marcados `[AJUSTADO]` corrigem
  a leitura inicial do mockup — priorize o texto do requisito, não suposições sobre o que
  "sistemas desse tipo geralmente fazem".
- Escopo, horas orçadas por módulo e restrições contratuais: **`docs/escopo-e-orcamento.md`**
  — use como guia de prioridade e de "o que não vale a pena over-engineer" (ex.: o fluxo de
  tramitação é fixo, não precisa de um builder configurável).
- Mockup de tela original (HTML/CSS estático, referência visual e de estrutura de telas):
  `docs/raw/mockup.html`
- Notas da chamada de validação técnica com o engenheiro do cliente (só consultar se precisar
  entender o porquê de uma decisão de escopo): `docs/raw/validacao-engenheiro.md`
- Notas da apresentação do sistema à diretoria (09/09/2026), origem dos ajustes da etapa 13 —
  **o avanço físico saiu do sistema** e arquivos de projeto não entram:
  `docs/raw/apresentacao-diretoria.md`

## Stack

- **Next.js** (React + API Routes/Server Actions no mesmo projeto — TypeScript ponta a ponta)
- **Prisma** como ORM (migrations + client tipado)
- **PostgreSQL** como banco de dados
- Escolhida por: familiaridade do desenvolvedor com React/Postgres, menor complexidade de
  instalação on-premise (um único processo Node, sem runtime .NET separado nem serviços
  extras), e menos peças móveis para revisar em código gerado por IA.

## Restrições fixas (não abrir para discussão sem confirmar com o cliente)

- Deploy on-premise, servidor do cliente, acesso só via rede local — sem nuvem, sem domínio
  público.
- Banco de dados novo, sem migração de dados legados.
- Fluxo de tramitação de processos é fixo (mesma sequência sempre); etapas podem ser
  marcadas como "não se aplica" por contrato, mas a ordem não muda.
- Formatos de upload confirmados: PDF, XLSX, XLS, CSV, JPG, PNG. Formatos de engenharia
  (DWG, RVT) **não entram no sistema** — decidido pelo dono da empresa em 09/09/2026:
  projeto continua no compartilhamento de rede. A trava de formato não é provisória.
- **Avanço físico não existe no sistema** (09/09/2026): só financeiro. A obra não tem
  responsável fixo — tem **operador**, que se atribui na aba resumo enquanto a obra
  está em atenção ou crítico.
- Exportação de relatórios: XLS e PDF.
- Stack fixada: Next.js + Prisma + PostgreSQL — não trocar de framework/ORM/banco no meio
  do projeto sem alinhar antes.

## Convenções de código

- Estado do desenvolvimento: **`docs/etapas-e-status.md`** — atualizar ao concluir
  cada etapa.
- Decisões assumidas a validar com o cliente: **`docs/pontos-para-reuniao.md`** —
  ao assumir algo por falta de resposta do cliente, registrar lá em vez de
  decidir em silêncio.
- Identidade visual: paleta e componentes herdados de `docs/raw/mockup.html`
  (navio + dourado). Tokens em `src/app/globals.css`; não introduzir cor nova
  fora deles. A obra abre em abas na ordem do mockup.
- Regra de negócio mora em `src/modules/`, sem React, com teste. As rotas em
  `src/app/` só orquestram.
- Dinheiro e percentual nunca são `number` — `Decimal` até a formatação final
  (`src/lib/money.ts`).
- Nada pode depender de internet em runtime: o servidor do cliente é offline.
- Antes de escrever código de rota, ler os guias do Next 16 em
  `node_modules/next/dist/docs/` — a versão tem mudanças de convenção.

@AGENTS.md
