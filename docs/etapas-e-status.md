# Etapas e Status da Implementação

Andamento do desenvolvimento. Atualizar ao concluir cada etapa.

- **Contrato:** R$ 10.000,00 / 140h (R$70/h), 4 parcelas.
- **Orçado por módulo:** 143h (folga negativa de 3h — ver
  [`escopo-e-orcamento.md`](escopo-e-orcamento.md)).
- **Última atualização:** 04/09/2026

## Legenda

`✅ concluída` · `🔵 em andamento` · `⬜ não iniciada` · `⛔ bloqueada`

## Quadro geral

| # | Etapa | Horas | Status | Depende de |
|---|---|---|---|---|
| 0 | Fundação (setup, schema, módulos base) | ~4h | ✅ | — |
| 0.1 | Ambiente de desenvolvimento (PostgreSQL local) | — | ✅ | — |
| 1 | Auth + RBAC | 12h | ✅ | 0 |
| 2 | Cadastros base (contratante, responsável, setor) | ~3h | ⬜ | 1 |
| 3 | Auditoria — camada de gravação | ~3h | 🔵 | 0 |
| 4 | CRUD de obras + dashboard/filtros | 15h | ⬜ | 2, 3 |
| 5 | Medições + cálculos financeiros | 18h | ⬜ | 4 |
| 6 | Tramitação (fluxo fixo) | 30h | ⬜ | 4 |
| 7 | Gestão documental | 24h | ⬜ | 4, 5, 6 |
| 8 | Rerratificações | 8h | ⬜ | 7 |
| 9 | Motor do farol | 6h | ⬜ | 5, 6 |
| 10 | Auditoria — telas de histórico | 5h | ⬜ | 3, 4 |
| 11 | Relatórios XLS/PDF | 12h | ⬜ | 5, 6, 8 |
| 12 | Ajustes, integração e testes | ~3h | ⬜ | todas |

**Marcos de validação com o cliente** (2 reuniões previstas em contrato,
com dados fictícios — `npm run db:seed -- --demo`):

- **1ª reunião:** após a etapa 6 — núcleo demonstrável (auth, obras,
  medições, tramitação).
- **2ª reunião:** após a etapa 11 — sistema completo, antes da instalação.

## Etapa 0 — Fundação ✅

Concluída em 04/09/2026.

**Entregue:**

- Next.js 16 + React 19 + TypeScript + Tailwind 4, App Router, `src/`.
- Prisma 7.10.0 + PostgreSQL, com `@prisma/adapter-pg` (a v7 exige driver
  adapter).
- Schema completo com as 12 tabelas das entidades principais e 2 migrations
  geradas (`init` e `documento_origem_unica`).
- Módulos de regra de negócio, com testes:
  - `modules/tramitacao/fluxo.ts` — sequência fixa das 11 etapas
  - `modules/medicoes/calculos.ts` — % executado, % medido, saldo, ISS
  - `modules/farol/regras.ts` — motor do farol (critérios provisórios)
  - `modules/documentos/formatos.ts` — allowlist; DWG/RVT bloqueados
  - `modules/auth/permissoes.ts` — matriz perfil × recurso × ação
  - `modules/auditoria/registrar.ts` — gravação append-only
- `lib/` — `prisma`, `env` (validado por zod), `money` (Decimal),
  `date-br` (pt-BR, fuso de São Paulo).
- Shell da aplicação, componentes base e painel lendo do banco.
- Seed idempotente: admin + 7 setores; `--demo` para dados fictícios.
- Testes: **33 passando** (`npm test`).
- `npm run typecheck`, `npm run lint` e `npm run build` limpos.

**Decisões técnicas tomadas na etapa:**

1. **`Auditoria` sem foreign keys.** A trilha é imutável por trigger no banco;
   uma FK com `onDelete: SetNull` dispararia um UPDATE que o trigger bloqueia,
   travando a exclusão de qualquer obra. Os IDs ficam como snapshot, junto com
   `usuarioNome` — o log sobrevive à exclusão da entidade que descreve, que é
   o ponto de existir.
2. **Origem do documento por FKs explícitas** (`obraId`, `medicaoId`,
   `etapaObraId`, `rerratificacaoId`), com CHECK constraint garantindo que
   exatamente uma está preenchida. Preferido a um par genérico
   `entidadeTipo`/`entidadeId`, que perderia integridade referencial e cascata.
3. **Agregados financeiros não são colunas.** `% medido`, `saldo a medir` e
   `valor medido total` derivam das medições a cada leitura, para não existirem
   duas versões da verdade. Só o farol é cacheado, com `farolCalculadoEm`.
4. **Prisma fixado em 7.10.0**, não em `latest`: o tag `latest` do npm está
   apontando para `8.0.0-rc.13`, um release candidate.
5. **Nada depende de internet em runtime.** Fontes do Google trocadas por
   stack de sistema e telemetria do Next desligada — o servidor do cliente
   pode estar offline.
6. **Tema claro fixo.** Cor é informação neste sistema (farol); modo escuro só
   depois de validar contraste. O farol sempre traz o rótulo escrito junto da
   cor, por acessibilidade.

**Pendências conhecidas:**

- `npm audit` acusa 4 vulnerabilidades altas, todas em dependências do **CLI**
  `prisma` (devDependency) — `mysql2`, driver que o projeto não usa, e
  `deepmerge-ts`. Nada no runtime. Sem correção sem downgrade para a v6.
- O `AGENTS.md` na raiz é gerado e reescrito pelo `next dev`; não editar.

## Ambiente de desenvolvimento ✅

Montado em 04/09/2026, na máquina de desenvolvimento (macOS 26.6, Apple
Silicon).

- **PostgreSQL 18.6 via Postgres.app** (`/Applications/Postgres.app`), com o
  PATH das ferramentas de linha de comando em `~/.zshrc`.
- Banco `aja_obras`, dono `aja` — usuário da aplicação separado do usuário do
  macOS, como será no servidor do cliente.
- **As 2 migrations foram aplicadas contra um banco real** e as 12 tabelas
  existem. A pendência aberta ao fim da etapa 0 está resolvida.
- Seed executado: 1 administrador e 7 setores.
- Aplicação sobe e lê do banco (painel mostra 0 obras, 1 usuário, 7 setores).
- Prisma Studio funcionando. Na v7 ele escolhe uma porta livre e imprime a
  URL — não é fixa em 5555.

**Restrições do banco verificadas na prática**, não só no papel:

| Verificação | Resultado |
|---|---|
| Auditoria aceita INSERT | ✅ |
| Auditoria recusa UPDATE | ✅ bloqueado pela trigger |
| Auditoria recusa DELETE | ✅ bloqueado pela trigger |
| Documento sem origem | ✅ recusado pela CHECK |
| Documento com duas origens | ✅ recusado pela CHECK |

> Nota de método: esses testes foram feitos com INSERT direto e deixaram um
> registro na auditoria que, por design, não podia ser apagado — foi preciso
> desabilitar a trigger momentaneamente para limpar. Testes futuros que tocam
> a auditoria devem rodar dentro de `BEGIN ... ROLLBACK`.

Decisão sobre Docker: **não usado no desenvolvimento**. A forma de instalar no
servidor do cliente é ponto aberto (ver `pontos-para-reuniao.md`, #11) e não
precisa ser igual à do desenvolvimento — para o projeto, a diferença é só a
`DATABASE_URL`.

## Etapa 1 — Auth + RBAC ✅

Concluída em 04/09/2026.

**Entregue:**

- Login, logout e bloqueio por tentativas repetidas.
- Recuperação de senha mediada pelo administrador (não há servidor de e-mail —
  ver `pontos-para-reuniao.md`, ponto 12).
- CRUD de usuários: criar, editar, ativar/desativar, gerar link de senha e
  encerrar sessões abertas de alguém.
- Matriz de permissões aplicada nas páginas e nas Server Actions.
- Trilha de auditoria gravando login, logout e alterações de cadastro.
- Testes: **46 passando**. `typecheck`, `lint` e `build` limpos.

**Decisões técnicas tomadas na etapa:**

1. **Sessão própria em tabela, não Auth.js.** A etapa foi aberta com inclinação
   por Auth.js v5, e a inclinação não sobreviveu ao caso concreto. Três
   motivos: a v5 ainda é beta (`next-auth@5.0.0-beta`), e uma instalação
   on-premise sem manutenção inclusa não é lugar para depender de API instável;
   com provider de credenciais a biblioteca não usa o adaptador de banco para
   sessão, força JWT, e **perderíamos a revogação imediata** — desativar um
   usuário só teria efeito no vencimento do token; e o que sobra para escrever
   não é criptografia, é `randomBytes` + bcrypt (que já era dependência) + um
   cookie. Custo: uma tabela e ~120 linhas em `lib/sessao.ts`. Zero dependência
   nova além de `server-only`.
2. **Cookie guarda um token opaco; o banco guarda o HMAC dele.** Vazamento do
   banco não vira sessão ativa, e revogar é apagar uma linha.
3. **`COOKIE_SEGURO` desligado por padrão.** A flag `Secure` em servidor HTTP
   de rede local faz o navegador descartar o cookie — ninguém entra e o erro
   não aparece em log nenhum. Ligar quando houver HTTPS.
4. **Senha nunca é definida pelo administrador.** Conta nova nasce com hash
   impossível e um link de definição de senha. O administrador não conhece a
   senha de ninguém.
5. **Troca de perfil e desativação derrubam as sessões abertas na hora.** Sem
   isso, uma sessão já aberta continuaria carregando a permissão antiga até
   vencer.
6. **`proxy.ts` só olha se o cookie existe.** O proxy roda em todo prefetch;
   consulta ao banco ali multiplicaria carga sem ganhar segurança. A
   autorização real está em `lib/guarda.ts`, junto dos dados — cookie forjado
   passa pelo proxy e morre lá.
7. **Freio de tentativas em memória, não em tabela.** Um processo só numa rede
   local fechada: não há segundo servidor para sincronizar, e reiniciar o
   serviço zerar o contador é aceitável.
8. **`forbidden()`/`unauthorized()` do Next não foram usados.** Ainda exigem a
   flag experimental `authInterrupts`. Ficou `redirect` para `/sem-permissao`,
   que explica ao usuário qual é o perfil dele e a quem pedir acesso.

**Verificado com o servidor de pé**, não só por leitura de código:

| Verificação | Resultado |
|---|---|
| Rota interna sem cookie | ✅ vai para o login, guardando o destino |
| Cookie forjado | ✅ passa pelo proxy e é barrado na guarda |
| Login com senha errada | ✅ mensagem genérica, sem dizer se o e-mail existe |
| Login correto | ✅ cookie `HttpOnly`, `SameSite=lax`, 12h, sem `Secure` |
| 5 senhas erradas seguidas | ✅ bloqueia por 5 minutos |
| Logout | ✅ apaga o cookie e a linha; o mesmo token não volta a valer |
| Visualizador em `/usuarios` | ✅ link some do menu e a URL direta é barrada |
| Conta desativada | ✅ a sessão aberta para de valer na requisição seguinte |
| Auditoria | ✅ login registrado com nome e IP |

O login foi exercitado pelo formulário real, sem JavaScript — o mesmo caminho
que o navegador usa quando o script ainda não carregou.

**Pendências conhecidas:**

- `senhaSchema` exige 8 caracteres com letra e número. Regra deliberadamente
  modesta: exigência agressiva empurra usuário não técnico para senha anotada
  em papel, o que num escritório com acesso físico compartilhado piora a
  segurança. Confirmar com o cliente se há política interna diferente.
- Não há tela de "minha conta" para a pessoa trocar a própria senha estando
  logada — hoje passa pelo fluxo de redefinição. Entra na etapa 12 se o
  cliente sentir falta.

## Etapa 2 — Cadastros base ⬜

**Escopo:** contratante, responsável e setor — CRUD simples, sem regra de
negócio própria. Servem de dependência para o cadastro de obras.

**Pré-requisito já resolvido:** guarda de permissão pronta em `lib/guarda.ts`;
as telas de cadastro seguem o mesmo padrão de `usuarios/`.
