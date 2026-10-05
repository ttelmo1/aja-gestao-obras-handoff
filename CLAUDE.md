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
- **Mudança de hospedagem (05/10/2026): o sistema vai para a nuvem; a instalação
  on-premise foi abandonada.** Pedido da diretoria ("joga pra internet"), repassado
  pelo engenheiro do cliente. A HostGator do cliente está descartada (conta pessoal,
  hospedagem compartilhada só PHP). O provedor ainda não foi escolhido: VPS
  (Hostinger ou StayCloud) ou Vercel + Neon com arquivos num storage S3-compatível
  (Cloudflare R2). Histórico e pendências no ponto #11 de `docs/pontos-para-reuniao.md`.
  O kit de instalação Windows (etapa 14, branch `prod`, `scripts/instalacao/`,
  `docs/instalacao-on-premise.md`) fica no repositório só como referência — não
  investir mais nele.

## Stack

- **Next.js** (React + API Routes/Server Actions no mesmo projeto — TypeScript ponta a ponta)
- **Prisma** como ORM (migrations + client tipado)
- **PostgreSQL** como banco de dados
- Escolhida por: familiaridade do desenvolvedor com React/Postgres, um único processo Node
  sem runtime .NET separado nem serviços extras (pensado para o on-premise, e que segue
  valendo para um VPS), e menos peças móveis para revisar em código gerado por IA.

## Restrições fixas (não abrir para discussão sem confirmar com o cliente)

- Deploy **na nuvem**, acessível pela internet (link a partir do site da AJA, provável
  subdomínio de `ajaempresarial.com.br`). Substitui o on-premise em rede local desde
  05/10/2026. Contas de hospedagem no nome da AJA, não no de pessoas.
- Por estar exposto na internet: HTTPS obrigatório (`COOKIE_SEGURO=true`), e qualquer
  decisão que se apoiava em "rede local fechada" precisa ser revista — ex.: o freio de
  login em memória (`src/modules/auth/throttle.ts`) não funciona em serverless.
- Banco de dados novo, sem migração de dados legados. A base da homologação (Neon) está
  em uso pelo cliente; se ela vira a base de produção ainda é a confirmar (ponto #11).
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
- Serviço externo em runtime agora é possível (o servidor tem internet), mas cada um é
  uma peça a mais e uma conta a mais para o cliente: só com motivo, e registrado.
- Antes de escrever código de rota, ler os guias do Next 16 em
  `node_modules/next/dist/docs/` — a versão tem mudanças de convenção.

@AGENTS.md
