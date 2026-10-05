# Etapas e Status da Implementação

Andamento do desenvolvimento. Atualizar ao concluir cada etapa.

- **Contrato:** R$ 10.000,00 / 140h (R$70/h), 4 parcelas.
- **Orçado por módulo:** 143h (folga negativa de 3h — ver
  [`escopo-e-orcamento.md`](escopo-e-orcamento.md)).
- **Última atualização:** 22/09/2026 — bug relatado pela Fernanda: o **prazo
  adicional da rerratificação aprovada passou a prorrogar a obra**, com o
  término do contrato intocado e um "Término vigente" derivado ao lado. Item 14
  da etapa 13. Antes disso, em 21/09/2026, outros dois pedidos dela no período
  de teste: o **cadastro de responsáveis saiu** (o nome de quem assina a medição
  virou texto na própria medição) e a **lista de documentos do contrato passou
  a ser a que o cliente mandou**, com dezessete itens. Itens 12 e 13.
  Antes disso, em 09/09/2026, a **apresentação do sistema à diretoria** e os
  quatro itens firmes da etapa 13 implementados no mesmo dia: o avanço físico
  saiu do sistema, o responsável técnico virou operador com atribuição
  momentânea, o farol passou a acender dez dias antes do vencimento da medição
  e o seed exercita o desenho novo. Notas da reunião em
  [`raw/apresentacao-diretoria.md`](raw/apresentacao-diretoria.md).

## Legenda

`✅ concluída` · `🔵 em andamento` · `⬜ não iniciada` · `⛔ bloqueada`

## Quadro geral

| # | Etapa | Horas | Status | Depende de |
|---|---|---|---|---|
| 0 | Fundação (setup, schema, módulos base) | ~4h | ✅ | — |
| 0.1 | Ambiente de desenvolvimento (PostgreSQL local) | — | ✅ | — |
| 0.2 | Identidade visual herdada do mockup | — | ✅ | — |
| 1 | Auth + RBAC | 12h | ✅ | 0 |
| 2 | Cadastros base (contratante, setor) | ~3h | ✅ | 1 |
| 3 | Auditoria — camada de gravação | ~3h | ✅ | 0 |
| 4 | CRUD de obras + dashboard/filtros | 15h | ✅ | 2, 3 |
| 5 | Medições + cálculos financeiros | 18h | ✅ | 4 |
| 6 | Tramitação (fluxo fixo) | 30h | ✅ | 4 |
| 7 | Gestão documental | 24h | ✅ | 4, 5, 6 |
| 8 | Rerratificações | 8h | ✅ | 7 |
| 9 | Motor do farol | 6h | ✅ | 5, 6 |
| 10 | Auditoria — telas de histórico | 5h | ✅ | 3, 4 |
| 11 | Relatórios XLS/PDF | 12h | 🟡 | 5, 6, 8 |
| 12 | Ajustes, integração e testes | ~3h | ⬜ | todas |
| 13 | Ajustes pós-apresentação à diretoria | ~5,5h | 🟡 | 4, 5, 7, 9 |
| 14 | Empacotamento e instalação on-premise | fora das 140h | ⬜ | 12 |
| 15 | Documentos no R2 e preparo para a nuvem | ~21h, fora das 140h | ⬜ | 7 |

A **etapa 14 está fora das 140h contratadas** (`README.md`, "Instalação no
cliente"): é *"a definir após visita técnica"*. Está no quadro porque **nada
dela existe** e sem ela não há o que instalar — não é trabalho opcional, é
trabalho não orçado.

A **etapa 13 não estava no orçamento** — é retrabalho vindo da apresentação, e
está lançada aqui para ficar visível. As ~5,5h saem da folga da etapa 12 e da
folga negativa de 3h do orçamento; ver a nota de horas na própria seção. Fica
🟡 e não ✅ porque os quatro itens firmes estão prontos, mas três itens da
mesma rodada seguem **bloqueados por falta de resposta do cliente**.

**Marcos de validação com o cliente** (2 reuniões previstas em contrato,
com dados fictícios — `npm run db:seed -- --demo`):

- **1ª reunião:** após a etapa 6 — núcleo demonstrável (auth, obras,
  medições, tramitação).
- **2ª reunião:** após a etapa 11 — sistema completo, antes da instalação.

## O que destrava agora (07/09/2026)

O engenheiro confirmou que **o farol é sobre a obra inteira** — qualquer um dos
critérios acende — e que são **três faixas mais o cinza**. Com isso a **etapa 9
foi concluída** no mesmo dia; resta calibrar os limites numéricos
(`LIMITES_PROVISORIOS`) na apresentação, com a tela aberta.

Confirmou também que os relatórios são **internos, para a diretoria**, e que
**não há layout obrigatório de órgão**. Some o único risco de estouro das 12h
da etapa 11 — falta o conteúdo, que sai do exemplo que ele ficou de mandar.

**Segue bloqueado por falta de resposta:** as colunas dos relatórios e a decisão
de retenções além do ISS (ponto #9), que muda colunas de `Medicao` e dos
próprios relatórios — decidir depois de escrever os relatórios é retrabalho.

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
   **Revertido na etapa 9:** o cache do farol nunca chegou a ser escrito, e não
   deveria mesmo — obra fica amarela pela passagem do tempo, sem ninguém salvar
   nada. As colunas foram removidas.
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

## Identidade visual ✅

Definida em 04/09/2026, antes da etapa 2 — de propósito: quanto mais telas
existirem, mais caro fica trocar paleta.

O cliente espera uma versão **evoluída** do `docs/raw/mockup.html`, não uma
tela desconhecida. Então a identidade vem de lá:

- Paleta: navio `#17324d` → `#244a6b` em degradê na faixa superior, acento
  dourado `#c79a45`, fundo `#f3f6f9`, linhas `#dfe6ec`.
- Marca: quadrado com a sigla contornada em dourado (`components/ui/marca.tsx`).
- Cantos arredondados de 12–14px nos painéis, sombra discreta.
- Botões: navio para ação principal, dourado para ação de destaque, branco com
  borda para o resto.
- Estados: verde `#2e9b65`, amarelo `#d9a820`, vermelho `#cf3f4d`, azul
  `#3178c6` — os mesmos hex do mockup.

**O que foi deliberadamente mudado:**

1. **Fonte.** O mockup usa Arial por ser um HTML solto. Ficou a stack nativa
   do sistema: renderiza melhor em cada máquina e não baixa nada — o servidor
   é offline.
2. **Estrutura da navegação.** O mockup troca de tela por JavaScript numa
   página só. Aqui são rotas de verdade, com faixa da marca em cima e barra de
   navegação abaixo.
3. **Laranja do farol reservado.** O mockup pinta o farol com verde, laranja e
   vermelho; o enum tem verde, amarelo, vermelho e cinza. Ficou o amarelo, e o
   laranja segue disponível como token caso o cliente confirme quatro faixas
   (ver `pontos-para-reuniao.md`, ponto 1).

**Estrutura de telas a seguir a partir da etapa 4** — a obra abre em abas, na
ordem do mockup: Resumo · Contrato · Medições · Rerratificações · Documentos ·
Histórico.

**Cada tela do mockup tem etapa dona.** Levantado para nada do que o cliente
já viu ficar sem endereço no plano:

| Tela / bloco do mockup | Etapa |
|---|---|
| Painel de obras: filtros, 5 KPIs, cards com farol e barra de progresso | 4 |
| Cabeçalho da obra com status e as 6 abas | 4 |
| Aba Resumo: indicadores da obra, informações gerais | 4 |
| Aba Contrato: dados contratuais e anexos | 4 (anexos na 7) |
| Aba Medições: tabela, faixa financeira, medição em detalhe | 5 |
| Tramitação do processo: fluxo em passos com estado por etapa | 6 |
| Central de Documentos da Obra: upload, chips por tipo | 7 |
| Aba Rerratificações | 8 |
| Aba Histórico: linha do tempo com marcadores dourados | 10 |

O mockup **não tem** tela de login nem de usuários — ele começa já
autenticado. As telas da etapa 1 não tinham referência visual e seguiram a
mesma paleta.

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

## Etapa 2 — Cadastros base ✅

Concluída em 04/09/2026.

**Entregue:**

- CRUD de **contratantes**, **responsáveis técnicos** e **setores**, sob
  `/cadastros` com abas.
- Validação de CNPJ com dígito verificador, em `modules/cadastros/cnpj.ts`.
- Exclusão com trava de vínculo e desativação como alternativa.
- Auditoria em criação, alteração (só os campos que mudaram) e exclusão.
- Componentes de tabela reaproveitáveis (`components/ui/tabela.tsx`).
- Testes: **58 passando** (12 novos, todos de CNPJ).

**Decisões técnicas tomadas na etapa:**

1. **CNPJ alfanumérico.** Desde julho de 2026 o CNPJ admite letras nos 12
   primeiros caracteres (Nota Técnica Cofis/SERPRO 2024.001) — e obras
   públicas envolvem justamente órgãos com inscrições novas. O validador usa
   o cálculo alfanumérico, que trata número como caso particular: cada
   caractere entra como ASCII−48, o que devolve o próprio valor para dígitos.
   Um validador só numérico começaria a recusar CNPJ legítimo este ano.
2. **Uma ação para criar e outra para editar seria duas.** `salvar` decide
   pelo `id` no formulário. Os campos e as validações são os mesmos; separar
   só criaria a chance de divergirem.
3. **Ações dos três cadastros num arquivo só.** O que muda entre eles é o
   schema de campos; permissão, auditoria e revalidação são idênticas.
   Triplicar isso triplicaria o lugar onde esquecer de auditar.
4. **Erro de índice único traduzido.** `P2002` vira "Já existe um contratante
   com esse CNPJ", não "Unique constraint failed". O campo culpado aparece ora
   em `meta.target`, ora em `meta.constraint`, dependendo do adaptador — por
   isso a busca é no `meta` inteiro.
5. **Excluir só o que ninguém referencia.** Cadastro em uso não é apagado: a
   tela explica quantos registros dependem dele e oferece desativar, que o
   tira das listas de seleção sem reescrever histórico de contrato.
6. **Responsável técnico não é usuário do sistema.** Cadastros separados, como
   manda o requisito 1.2 — o engenheiro responsável por uma obra não precisa
   de login, e quem tem login não é responsável por nada por isso.

**Verificado com o servidor de pé:**

| Verificação | Resultado |
|---|---|
| CNPJ com dígito errado | ✅ recusado antes de tocar o banco |
| CNPJ alfanumérico (`12ABC34501DE35`) | ✅ aceito e mascarado |
| CNPJ repetido | ✅ "Já existe um contratante com esse CNPJ" |
| Setor com nome repetido | ✅ mensagem própria |
| Editar alterando um campo | ✅ salvo; auditoria guarda só o campo mudado |
| Salvar sem mudar nada | ✅ "Nada mudou", sem gravar auditoria |
| Excluir cadastro sem vínculo | ✅ apagado e auditado |
| Visualizador em `/cadastros` | ✅ vê a lista; botões somem; URL direta barrada |

**Pendências conhecidas:**

- Sem paginação nas listas. Contratantes e setores são dezenas, não milhares;
  se o cliente trouxer volume maior, entra na etapa 12.
- Telefone e registro profissional são texto livre, sem máscara. Formato varia
  (CREA, CAU, ramal, celular) e máscara errada atrapalha mais que ajuda.

## Etapa 3 — Auditoria (gravação) 🔵

A camada existe desde a etapa 0 e já grava em login, logout, usuários,
cadastros e obras. Segue 🔵 porque cada módulo novo precisa chamá-la; fecha
quando a tramitação e as medições estiverem instrumentadas. As telas de
consulta são a etapa 10.

## Etapa 4 — CRUD de obras + painel ✅

Concluída em 04/09/2026.

**Entregue:**

- **Painel de Obras** na estrutura do mockup: filtros, indicadores e cartões
  com farol, barras de progresso e faixa financeira.
- Busca por código, objeto, contrato, protocolo, contratante e responsável;
  filtros por situação, farol, responsável e contratante.
- Cadastro e edição de obra, com código gerado automaticamente e término
  previsto derivado da ordem de início mais o prazo.
- Tela da obra com as **6 abas do mockup**; Resumo e Contrato prontos, as
  outras quatro com o lugar reservado e a etapa dona anunciada.
- Exclusão com trava de dependentes.
- Seed `--demo` com 4 obras que acendem faróis diferentes.
- Testes: **81 passando** (23 novos).

**Decisões técnicas tomadas na etapa:**

1. **O farol é calculado na leitura, não lido da coluna.** A coluna `farol`
   envelhece sozinha: nada acontece no banco quando o prazo vira, e um painel
   que existe para avisar de atraso não pode mostrar luz vencida. Por isso o
   **filtro de farol também é aplicado depois da consulta**, em memória — o
   banco filtra fato registrado, o farol filtra situação calculada. Custo:
   a consulta traz todas as obras que passaram nos outros filtros. Aceitável
   para as dezenas de obras desta instalação; se o volume crescer, a etapa 9
   revisita com recálculo agendado.
2. **Painel e dashboard viraram uma tela só.** No mockup são a mesma coisa —
   filtros, indicadores e cartões juntos. Duas telas de visão geral criariam
   dois lugares para o mesmo número aparecer, com a chance de divergirem.
   `/dashboard` continua existindo, redirecionando para `/obras`.
3. **Abas da obra são rotas de verdade**, não troca de `display` como no
   mockup: cada aba tem URL própria, abre em outra janela e o botão voltar
   funciona. Cada etapa futura preenche a sua sem tocar nas demais.
4. **Término previsto é derivado, mas o digitado vence.** O padrão é ordem de
   início + prazo em dias; se o usuário escreveu uma data, ela manda. Há
   suspensão de prazo que o sistema ainda não modela e que só existe na
   cabeça do fiscal — recalcular por cima seria apagar informação.
5. **Datas lidas ao meio-dia.** `new Date("2026-03-10")` é meia-noite UTC, que
   em Brasília ainda é dia 9 — o clássico "a data voltou um dia". Todo campo
   de data do formulário entra como `T12:00:00` local.
6. **Valor aceita o formato que o usuário digita.** "1.200.000,00" e
   "1200000.00" chegam ao mesmo `Decimal`. Exigir formato certo num campo de
   dinheiro é transferir trabalho de máquina para pessoa.
7. **Sem medição, o avanço físico é `null`, não zero.** Zero acenderia alerta
   de execução atrasada em obra recém-iniciada, que é exatamente a obra sobre
   a qual não se sabe nada ainda.
8. **Obra com medição, documento ou rerratificação não é apagada.** A saída é
   a situação *Cancelada*, que preserva o histórico do contrato.

**Verificado com o servidor de pé:**

| Verificação | Resultado |
|---|---|
| Painel com as 4 obras de demonstração | ✅ faróis Em dia, Atenção, Crítico e Sem dados |
| Motivo do farol | ✅ "Prazo vencido há 80 dia(s)", "Faltam 20 dia(s)" |
| Prazo transcorrido | ✅ 50%, 88% e 127% (vencido passa de 100) |
| Busca por contrato, protocolo e texto do objeto | ✅ |
| Filtro por situação e por farol | ✅ |
| Farol inválido na URL (`?farol=ROXO`) | ✅ ignorado, sem erro de tela |
| Código em branco | ✅ gerou `OBR-2026-001` |
| Valor "100.000,00" | ✅ gravado como 100000 |
| Término em branco com prazo de 90 dias | ✅ derivou 30/08 a partir de 01/06 |
| Valor zero | ✅ recusado |
| Ordem de início antes da assinatura | ✅ recusada |
| Obra inexistente | ✅ 404 |
| As 6 abas | ✅ todas respondem |
| Operacional (obra = leitura) | ✅ botão some, `/obras/nova` barrada, aba Contrato em modo leitura |
| Auditoria | ✅ criação e exclusão registradas com `obraId` |

**Pendências conhecidas:**

- Indicador "Processos parados" mostra `—` até a tramitação existir (etapa 6).
  Preferi o traço a um zero que pareceria informação.
- Sem paginação no painel. Mesmo raciocínio dos cadastros; se o volume
  crescer, entra na etapa 12 junto com o recálculo de farol.
- `valorAditivado` existe no schema e entra na conta, mas só é alimentado
  pelas rerratificações (etapa 8). Hoje é sempre zero.

## Etapa 5 — Medições ✅

Concluída em 04/09/2026.

**Entregue:**

- **Aba Medições** na estrutura do mockup: faixa com valor contratado, total
  medido, % medido e saldo a medir, seguida do histórico em tabela com as
  doze colunas do mockup.
- Lançamento, edição e exclusão de medição, com competência, período, valor,
  avanço físico, protocolo, nota fiscal, ISS, responsável e situação.
- **ISS calculado quando não é digitado**, pela alíquota sobre o valor da
  nota (ou da medição, se a nota ainda não saiu).
- **Ciclo de medição**: periodicidade na obra (mensal, quinzenal, semanal ou
  personalizada) e cálculo de quando a próxima medição vence.
- Painel ganhou o indicador **"Medições atrasadas"** e os cartões passaram a
  mostrar última e próxima medição — os dois campos do mockup que faltavam.
- Seed `--demo` com 11 medições, uma obra com ciclo vencido.
- Testes: **102 passando** (21 novos).

**Decisões técnicas tomadas na etapa:**

1. **Periodicidade da medição virou campo da obra.** O mockup pede "Última
   medição", "Próxima medição" e o indicador "Medições atrasadas", e os
   requisitos (1.9) pedem esse indicador — nenhum dos três é calculável sem
   saber de quanto em quanto tempo se mede. O padrão é mensal; é suposição,
   registrada no ponto #13 de `pontos-para-reuniao.md`.
2. **O ciclo conta da última medição, ou da ordem de início quando não há
   nenhuma.** Sem ordem de início, e em obra finalizada, cancelada ou
   paralisada, não há prazo a cobrar e o sistema devolve "sem dado" em vez de
   uma data inventada. O mesmo vale para periodicidade personalizada sem
   intervalo preenchido.
3. **Nenhum agregado virou coluna.** Total medido, % medido e saldo saem de
   `resumoDaObra`, a mesma função do painel. Guardar o total numa coluna
   criaria a chance de a soma da faixa discordar da lista logo abaixo dela.
4. **O ISS digitado vence o calculado.** A guia de recolhimento tem
   arredondamento próprio, e o que vale é o papel. O cálculo só entra quando
   o campo fica vazio e há alíquota.
5. **Número da medição é o maior já usado mais um, não a contagem.** Se a
   medição 3 for excluída, a próxima ainda é a 5 — repetir um número que já
   circulou em protocolo no órgão é confusão garantida na conferência.
6. **Só medição em rascunho pode ser apagada.** Depois de protocolada existe
   processo no órgão, e o caminho é marcá-la como *Rejeitada*. Mesma lógica
   já aplicada à obra na etapa 4.
7. **Situação exige o que ela implica.** A partir de *Protocolada* o número
   do protocolo passa a ser obrigatório; *Paga* exige a data do pagamento.
   Impedir o estado incoerente na entrada sai mais barato que descobrir
   depois, no relatório.
8. **Total medido acima do contratado não é bloqueado — é avisado.** O
   aditivo pode não ter sido registrado ainda, e recusar o lançamento
   impediria o usuário de anotar o que já aconteceu. A tela mostra o excesso
   e aponta a aba Rerratificações.
9. **Validadores de campo saíram para `src/lib/campos.ts`.** Data, dinheiro,
   percentual e competência eram código embutido nas ações de obra. Na
   segunda tela com os mesmos campos viraram arquivo: o jeito de ler uma data
   digitada não pode variar de tela para tela.

**Verificado com o servidor de pé, sem JavaScript:**

| Verificação | Resultado |
|---|---|
| Faixa financeira da aba (contratado, medido, %, saldo) | ✅ 260.000 / 180.000 / 69,23% / 80.000 |
| Histórico com as 12 colunas e ISS de cada medição | ✅ |
| Protocolada sem protocolo | ✅ recusada |
| Paga sem data de pagamento | ✅ recusada |
| Percentual acima de 100, valor zerado, período invertido | ✅ recusados |
| Número de medição repetido na mesma obra | ✅ recusado |
| ISS deduzido da alíquota (5% sobre a nota) | ✅ R$ 625,00 |
| Exclusão de medição em rascunho | ✅ permitida |
| Exclusão de medição já protocolada | ✅ recusada |
| Periodicidade personalizada sem intervalo | ✅ recusada |
| Troca para quinzenal move a próxima medição | ✅ 06/06 → 22/05 |
| Indicador "Medições atrasadas" no painel | ✅ 2 de 4 obras |
| Trilha de auditoria da medição | ✅ CRIAR e EXCLUIR registrados |

## Etapa 6 — Tramitação ✅

Concluída em 05/09/2026.

**Entregue:**

- **Aba Tramitação** com o fluxo fixo das 11 etapas na faixa de passos do
  mockup, cada uma abrindo embaixo com seu percurso pelos setores.
- Registro de **entrada e saída por setor**, com cálculo automático do tempo
  de permanência e da cadeia "veio de".
- Etapa marcável como **"não se aplica"** — a única flexibilidade que o fluxo
  admite (requisitos 1.5).
- **Tramitação por medição**: cada medição caminha sozinha pelos setores, com
  o bloco "Tramitação do processo" dentro dela, como no mockup. A tabela de
  medições ganhou as colunas **Setor atual** e **Tempo**, que faltavam.
- Painel: o indicador **"Processos parados"** saiu do traço e conta obras
  paradas há 10 dias ou mais.
- **O critério `diasParado` do farol entrou em operação.** Existia desde a
  etapa 0 recebendo `null` de todos os chamadores; agora acende de verdade.
- Aba Resumo ganhou o indicador **"Maior tempo parado"** do mockup.
- Seed `--demo` com 10 movimentos e 3 processos em aberto, um deles parado há
  60 dias.
- Testes: **124 passando** (22 novos).

**Decisões técnicas tomadas na etapa:**

1. **Movimento sem data de saída é processo parado.** É a regra central do
   módulo, e dela saem o "há N dias na Controladoria", o indicador do painel
   e o critério do farol. O índice `@@index([dataSaida])` do schema existe
   para essa consulta.
2. **Tempo parado é calculado na leitura, nunca lido da coluna.**
   `diasPermanencia` só é gravado quando a saída acontece. Um processo parado
   há 8 dias precisa dizer 9 amanhã sem ninguém tocar em nada — mesmo
   raciocínio do farol na etapa 4.
3. **Cada medição tramita sozinha.** O mockup mostra tramitação dentro da
   medição, com protocolo próprio, e a tabela de medições tem "Setor atual"
   por linha. Com os movimentos presos só à etapa, isso seria impossível:
   todas as medições da obra cairiam no mesmo percurso. Resolvido com
   `TramitacaoMovimento.medicaoId` — uma coluna anulável, sem tocar no fluxo
   fixo. Registrado como ponto #16 da reunião.
4. **Na etapa MEDICOES, movimento sem medição é recusado.** Descoberto
   testando: um movimento solto ali criaria um percurso paralelo sem dono, e
   a etapa passaria a ter dois "setor atual" ao mesmo tempo. A aba não oferece
   o formulário, e a ação recusa mesmo se o POST vier na mão.
5. **Com vários processos abertos, o "atual" é o parado há mais tempo**, não o
   mais recente. Quem olha a faixa do fluxo quer ver o pior caso, que é o que
   o painel vai cobrar. A tela diz quantos outros estão em aberto.
6. **"Dias parado" da obra é o maior, não a soma nem a média.** Se um processo
   está há 40 dias na Controladoria e outro entrou ontem, a obra tem um
   problema de 40 dias — a média esconderia exatamente o caso que o painel
   existe para mostrar.
7. **Entrada e saída são atos separados.** No mundo real o processo sai de um
   setor num dia e chega no outro dias depois; colapsar os dois esconderia o
   tempo perdido no caminho, que é o que o cliente quer medir.
8. **Um processo está num setor de cada vez.** Nova entrada exige que a
   anterior tenha saída, e não pode ser anterior a ela.
9. **Etapa com movimentos não vira "não se aplica".** O histórico diria que o
   processo passou por uma etapa que nunca existiu. É preciso apagar os
   movimentos antes.
10. **As 11 etapas nascem com a obra**, e `carregarEtapas` cria as que
    faltarem. Obras cadastradas antes desta etapa não têm nenhuma, e uma
    etapa nova no enum precisaria aparecer nas obras existentes sem script de
    migração de dados.
11. **Uma etapa aberta por vez, escolhida por `?etapa=`.** Onze formulários
    empilhados seriam ilegíveis, e a seleção por link mantém a tela
    funcionando sem JavaScript, como o resto do sistema.
12. **A aba Tramitação é um desvio consciente do mockup.** O mockup tem seis
    abas e nenhuma de tramitação — ele é anterior ao requisito 1.5
    `[AJUSTADO]`, que o engenheiro confirmou na chamada de validação. O fluxo
    fixo das 11 etapas não tinha onde morar, e enfiá-lo no Resumo esconderia
    o módulo de 30h. Registrado no ponto #16.

**Verificado com o servidor de pé, sem JavaScript:**

| Verificação | Resultado |
|---|---|
| Faixa do fluxo com as 11 etapas e seus status | ✅ |
| Percurso somando o tempo por setor | ✅ 6+9+35+60 = 110 dias |
| Cadeia "veio de" entre setores | ✅ |
| Segunda entrada com a anterior em aberto | ✅ recusada |
| Entrada anterior à saída do setor anterior | ✅ recusada |
| Saída anterior à entrada | ✅ recusada |
| Movimento solto na etapa de medições | ✅ recusado |
| Etapa concluída sem data de conclusão | ✅ recusada |
| Conclusão anterior ao início | ✅ recusada |
| "Não se aplica" em etapa com movimentos | ✅ recusada |
| "Não se aplica" em etapa vazia, e reativação | ✅ |
| Colunas "Setor atual" e "Tempo" na tabela de medições | ✅ Financeiro, 60 dias |
| Bloco de tramitação dentro da medição | ✅ 4 setores, 110 dias |
| Indicador "Processos parados" no painel | ✅ 2 de 4 obras |
| Farol acendendo por processo parado | ✅ "Processo parado há 60 dias." |
| Trilha de auditoria dos movimentos e das etapas | ✅ |

## Etapa 7 — Gestão documental ✅

Concluída em 07/09/2026.

**Entregue:**

- **Central de Documentos da Obra** como no mockup: busca por nome e
  descrição, filtro por tipo e por origem, e as colunas Tipo, Documento,
  Vinculado a, Setor / Etapa, Data, Incluído por, Observação, Ação.
- **Upload múltiplo por contexto** (requisitos.md 1.6): contrato, medição,
  etapa de tramitação e passagem por setor. Vários arquivos de uma vez.
- **Download autenticado** em `/documentos/[id]`, com o nome original de volta.
- Anexos aparecem onde o mockup os coloca: chips por setor na tabela de
  tramitação, bloco próprio dentro da medição, contagem na coluna "Docs".
- Exclusão lógica: some da tela e do download, permanece para a auditoria.
- Seed `--demo` com 23 documentos e arquivos de verdade no disco.
- Testes: **161 passando** (27 novos).

**Decisões técnicas tomadas na etapa:**

1. **O arquivo mora fora de `public/`.** Qualquer coisa em `public/` é servida
   sem passar por autenticação — bastaria adivinhar o nome para baixar o
   contrato de qualquer obra. Todo download passa pela rota que confere
   sessão e permissão.
2. **O nome no disco é gerado por nós, nunca o do navegador.** Nome de upload
   é entrada de usuário: pode trazer `../`, barra, caractere que o sistema de
   arquivos interpreta. No disco fica `obras/<obraId>/<uuid>.<ext>`; o nome
   original vive no banco, para exibir e para nomear o download.
3. **A defesa de travessia de caminho resolve e compara, não procura `..`.**
   `resolverDentroDe` está em `modules/documentos/caminho.ts`, fora do
   `server-only`, justamente para ter teste — é a regra mais crítica do
   módulo. Cobre `..`, caminho absoluto e o prefixo parecido com a raiz, que
   um `startsWith` ingênuo deixaria passar.
4. **Uma pasta por obra.** O servidor é do cliente e um dia alguém vai abrir
   essa pasta para fazer backup ou buscar um arquivo sem o sistema.
5. **O CHECK de origem da etapa 0 foi reescrito.** Ele exigia exatamente um
   vínculo entre obra, medição, etapa e rerratificação. Isso não descreve o
   sistema: a central precisa listar o acervo de uma obra numa consulta só, e
   só consegue com `obraId` sempre preenchido. A regra nova separa as três
   perguntas — de que obra é, sobre o que é (no máximo um entre medição e
   rerratificação), e onde entrou no fluxo.
6. **Documento pode apontar para a passagem de setor, não só para a etapa.**
   No mockup cada passo do fluxo tem seus próprios anexos, e a central mostra
   em que setor o arquivo entrou. Custou uma coluna (`movimentoId`).
7. **DWG e RVT seguem bloqueados**, com mensagem que diz o porquê em vez de
   "formato não aceito" — o cliente ainda não decidiu (ponto #2).
8. **Validação do lote inteiro antes de gravar qualquer arquivo.** Melhor
   recusar tudo do que deixar metade no disco e reclamar da outra metade.
9. **Exclusão é lógica, e o arquivo permanece no disco.** Auditoria que aponta
   para arquivo inexistente não serve para nada (ponto #8).
10. **`bodySizeLimit` subiu para 320MB.** O padrão do Next é 1MB e os
    requisitos falam em ~300MB. Vale para toda Server Action, o que é
    aceitável numa instalação em rede local atrás de login. Custo conhecido:
    a ação carrega o corpo em memória — se algum dia entrarem arquivos
    realmente grandes, o caminho é uma rota de upload com streaming.

**Verificado com o servidor de pé, sem JavaScript:**

| Verificação | Resultado |
|---|---|
| Upload de PDF no contrato | ✅ |
| Upload de vários arquivos de uma vez | ✅ "2 documentos enviados" |
| DWG | ✅ recusado, citando pendência do cliente |
| Executável, arquivo vazio, nenhum arquivo | ✅ recusados |
| Upload dentro da medição | ✅ origem "Medição 03" |
| Upload no setor atual da tramitação | ✅ origem "Medições / Financeiro" |
| Download autenticado | ✅ nome original, `inline`, `private, no-store` |
| Download sem sessão | ✅ redireciona ao login |
| Download de id inexistente | ✅ 404 |
| Filtro por tipo, por origem e busca textual | ✅ |
| Seletor de origem montado do acervo inteiro | ✅ Contrato, Medição 03, Medições |
| Chips de anexo por setor na tramitação | ✅ |
| Coluna "Docs" na tabela de medições | ✅ |
| Exclusão lógica | ✅ acervo 5→4, download 404, arquivo no disco |
| Trigger append-only da auditoria | ✅ recusou DELETE |
| Travessia de caminho | ✅ 6 casos cobertos por teste |

## Etapa 8 — Rerratificações ✅

Concluída em 07/09/2026.

**Entregue:**

- **Aba Rerratificações** com o resumo agregado do requisito 1.7: valor
  original, aditivado aprovado, valor atual do contrato e acréscimo
  acumulado, mais a tabela do mockup (Nº, Data, Descrição, Itens alterados,
  Documentos, Observações) acrescida de valor, percentual, prazo e situação.
- Cadastro, edição e exclusão, com anexo da **planilha Excel** apresentada ao
  órgão pelo módulo documental da etapa 7 — origem "Rerratificação 01" na
  central.
- **`Obra.valorAditivado` deixou de ser sempre zero**: passa a ser reescrito a
  cada alteração e alimenta saldo a medir, % medido e os indicadores do
  painel.
- **Alerta do limite legal** de 25% da Lei 14.133/2021 (art. 125).
- Seed `--demo` com duas rerratificações: uma aprovada e uma em tramitação.
- Testes: **178 passando** (17 novos).

**Decisões técnicas tomadas na etapa:**

1. **Só rerratificação aprovada mexe no valor do contrato.** Em elaboração e
   protocolada ainda podem ser negadas; somá-las inflaria o saldo a medir com
   dinheiro que talvez nunca exista. Elas aparecem à parte, como expectativa.
2. **`valorAditivado` é cache, recalculado na escrita — não na leitura.**
   Diferente do farol, que envelhece sozinho com o tempo e por isso é sempre
   recomputado, o valor aditivado só muda quando alguém mexe numa
   rerratificação. Recalcular na mesma transação da escrita mantém a coluna
   correta e evita uma consulta a mais em cada cartão do painel. A regra mora
   em `modules/rerratificacoes/calculos.ts`; a coluna é onde o resultado fica.
3. **O acréscimo acumulado é medido sobre o valor ORIGINAL.** Sobre o já
   aditivado, cada novo aditivo pareceria menor que o anterior e o teto legal
   nunca chegaria.
4. **O limite de 25% é alerta, não trava.** Reforma de edifício admite 50%, e
   quem decide o enquadramento é o jurídico do cliente, não este código.
   Registrado como ponto #17.
5. **Nenhum campo de item alterado**, por decisão de escopo — só a contagem
   ("8 itens"), que é o que o mockup mostra. O detalhamento vive na planilha
   anexada.
6. **Supressão é aditivo negativo**, não uma entidade separada: o campo aceita
   valor negativo e a soma diminui o contrato.
7. **Aditivo só de prazo é válido; aditivo de nada não é.** Prorrogação sem
   custo existe e é comum. O que o formulário recusa é valor zero *e* prazo
   vazio — combinação que o campo em branco produzia silenciosamente.
8. **Mesma regra de exclusão da medição:** só em elaboração se apaga; depois
   de protocolada, o caminho é Rejeitada.

**Verificado com o servidor de pé, sem JavaScript:**

| Verificação | Resultado |
|---|---|
| Aprovada entra no contrato; protocolada não | ✅ 1.200.000 → 1.320.000 |
| Aditivo propaga para painel, Resumo e Medições | ✅ % medido 50% → 45,45% |
| Aprovar recalcula o cache do valor aditivado | ✅ |
| Voltar a "em elaboração" desfaz o acréscimo | ✅ volta a R$ 0,00 |
| Protocolada sem protocolo | ✅ recusada |
| Percentual acima de 100 | ✅ recusado |
| Sem valor e sem prazo | ✅ recusada |
| Só prazo, sem valor | ✅ aceita |
| Número repetido na mesma obra | ✅ recusado |
| Alerta do limite de 25% | ✅ acendeu em 26,92% |
| Excluir aprovada | ✅ recusada |
| Excluir em elaboração | ✅ permitida, cache volta a zero |
| Planilha anexada aparece na central | ✅ origem "Rerratificação 01" |

## Etapa 9 — Motor do farol ✅

Concluída em 07/09/2026, depois de o engenheiro confirmar o escopo (ponto #1 de
[`pontos-para-reuniao.md`](pontos-para-reuniao.md)): o farol é sobre a obra
inteira, **basta um critério** para acender, e são três faixas mais o cinza.

O motor existia desde a etapa 0 à espera dessa resposta. Ela confirmou o
desenho, então a etapa virou o que sobrou: tirar o cache que nunca existiu de
fato e fazer o painel dizer **por que** a luz está acesa.

**Entregue:**

- `modules/farol/regras.ts` — escopo confirmado registrado no topo do arquivo,
  com aviso de que os **limites numéricos continuam provisórios**. O resultado
  ganhou `motivoPrincipal`: o motivo do pior nível, não o primeiro da lista.
- Cartão do painel — o motivo do alerta agora é **texto no cartão**, com o
  contador de quantos outros motivos existem (`+2`). Antes só aparecia no
  `title`, que não existe em tablet, e o cliente pediu o farol justamente para
  "chamar a atenção e o responsável trabalhar em cima".
- Migration `farol_deixa_de_ser_coluna` — remove `Obra.farol` e
  `Obra.farolCalculadoEm`, troca o índice `(status, farol)` por `(status)`.
- Testes: **5 novos** (236 no total), incluindo o caso que o cliente descreveu
  — um critério sozinho acende — e a garantia de que o motivo mostrado é o do
  pior nível.

**Decisões técnicas tomadas na etapa:**

1. **O farol não é coluna.** O cache existia desde a etapa 0 e nunca foi
   escrito por lugar nenhum; o painel, a tela da obra e os relatórios sempre
   chamaram o motor. Mantê-lo exigiria recalcular a cada escrita de obra,
   medição e movimento de tramitação — e ainda assim envelheceria sozinho, já
   que dois dos três critérios dependem só da data de hoje. O índice composto
   `(status, farol)` nunca serviu consulta alguma, porque o filtro por farol é
   aplicado depois do cálculo, em memória.
2. **`motivoPrincipal` é o do pior nível, não o primeiro.** Numa obra vermelha
   por processo parado que também está com o prazo perto, mostrar "faltam 12
   dias" seria mostrar o motivo errado — a ordem de avaliação dos critérios não
   é ordem de gravidade.
3. **Os limites continuam em `LIMITES_PROVISORIOS`.** O cliente confirmou a
   lógica, não os números. Calibrar é editar uma constante.

**Conferido com os dados de demonstração** (`npm run db:seed -- --demo`):

| Obra | Farol | Motivo mostrado |
|---|---|---|
| OBR-DEMO-001 | 🟢 Verde | Dentro do prazo e sem pendências |
| OBR-2026-001 | 🟡 Atenção | Faltam 30 dias para o término previsto |
| OBR-DEMO-002 | 🔴 Crítico | Execução 29 p.p. atrás do previsto (+2 motivos) |
| OBR-DEMO-003 | 🔴 Crítico | Prazo vencido há 83 dias (+2 motivos) |
| OBR-DEMO-004 | ⚪ Não avaliada | Sem ordem de início |

As quatro cores aparecem no painel, e duas obras acendem por mais de um
critério — é a tela para calibrar os limites com o cliente na frente.

## Etapa 10 — Auditoria: telas de histórico ✅

Concluída em 07/09/2026. Fecha também a etapa 3, cuja camada de gravação
existia desde a fundação mas nunca tinha sido exibida em lugar nenhum.

**Entregue:**

- **Aba Histórico da obra** — a linha do tempo do mockup: filete vertical,
  ponto colorido por ação, data e hora miúdas, autor em navio.
- **Tela geral de Auditoria** (`/auditoria`), no menu principal: responde
  "o que fulano andou fazendo" e alcança o que não pertence a obra nenhuma —
  cadastros, usuários e login.
- Filtros por texto, ação, tipo de registro, autor e período; paginação de 50.
- **Diferença campo a campo** em `<details>`: "de X para Y" do que mudou.
- Testes: **195 passando** (17 novos).

**Decisões técnicas tomadas na etapa:**

1. **Filtro e paginação nascem junto com a tela.** A trilha só cresce e nunca
   é apagada — sem os dois, a tela ficaria inutilizável no primeiro ano.
2. **O intervalo de datas pega o dia inteiro.** "Até hoje" com hora zero
   perderia tudo que aconteceu hoje; o fim do período vai às 23:59:59.
3. **Parâmetro inválido na URL é ignorado, não quebra a tela.** Ação
   inexistente, entidade fantasma e página negativa caem no padrão.
4. **O autor saiu de dentro da frase.** As descrições que os módulos gravam
   são passivas ("Obra X alterada"), e prefixar o nome produzia "Administrador
   Obra X alterada". Agora o autor vem antes, separado por ponto médio.
   Corrigida junto a descrição de login, que repetia o nome ("Administrador
   Administrador entrou no sistema").
5. **A diferença vem fechada.** Numa obra com muitas edições, abrir todos os
   diffs faria a linha do tempo perder a leitura corrida do mockup.
6. **Nome do model virou nome de gente.** A coluna guarda
   `TramitacaoMovimento`; a tela mostra "Tramitação".

**Corrigido de passagem:**

O menu principal apontava para `/documentos` e `/relatorios` desde a etapa 1
— **duas rotas que nunca existiram, dois 404 no menu**, presentes durante toda
a caminhada até aqui. O menu passa a listar só o que existe. A central de
documentos é por obra, como no mockup ("Central de Documentos da Obra"), e por
isso não volta ao topo; "Relatórios" retorna na etapa 11 junto com a tela.

**Verificado com o servidor de pé, sem JavaScript:**

| Verificação | Resultado |
|---|---|
| Linha do tempo da obra | ✅ 26 registros |
| Tela geral de auditoria | ✅ 54 registros, 1 autor |
| Filtro por ação e por tipo de registro | ✅ |
| Filtro por período | ✅ 23 + 31 = 54, partição correta |
| Busca sem resultado | ✅ estado vazio explicando o filtro |
| Página inválida, ação inventada, data malformada | ✅ ignorados, HTTP 200 |
| Diferença campo a campo | ✅ "numero: 1", "valorImpactado: 70000" |
| Links do menu principal | ✅ todos respondem |

## Etapa 11 — Relatórios XLS/PDF 🟡

Parcial: a **mecânica de exportação** está pronta e testada; o **conteúdo dos
relatórios e as telas** aguardam a 1ª reunião (ponto #10 —
`docs/pontos-para-reuniao.md`).

Feita nesta fase porque é a metade da etapa que não depende de resposta
nenhuma: seja qual for o relatório que o cliente pedir, ele sai por aqui.

**Entregue:**

- `modules/relatorios/modelo.ts` — o modelo neutro. Um relatório é título,
  filtros aplicados, colunas tipadas, linhas e uma linha de totais. Quem
  escrever um relatório novo devolve esta estrutura e ganha os dois formatos.
- `modules/relatorios/xlsx.ts` + `zip.ts` — gerador de XLSX. Escreve o pacote
  OOXML e o ZIP direto.
- `modules/relatorios/pdf.ts` + `fontes.ts` — gerador de PDF tabular: A4
  retrato ou paisagem, cabeçalho com os filtros aplicados, cabeçalho de tabela
  repetido a cada página, zebra, totais e paginação no rodapé.
- `modules/relatorios/exportar.ts` — fachada: modelo + formato → arquivo, nome
  de arquivo e resposta HTTP de download.
- Testes: **36 novos** (231 no total).

**Decisões técnicas tomadas na etapa:**

1. **Sem biblioteca de PDF nem de planilha.** O servidor do cliente é offline,
   então tudo teria que ser empacotado junto. As bibliotecas de PDF em Node ou
   embutem arquivos de fonte, ou rodam um navegador headless — um segundo
   processo para instalar e manter on-premise. Para relatório tabular, sai mais
   barato escrever o formato: `node:zlib` já faz o deflate do XLSX, e o PDF usa
   Helvetica, que todo leitor de PDF já tem.
   O preço é `fontes.ts`, com a tabela de larguras da Helvetica — sem ela não
   há como alinhar coluna de dinheiro à direita nem cortar o que não cabe.
2. **XLSX, não XLS.** O contrato diz "XLS", que na prática quer dizer "abre no
   Excel". O XLS binário é formato de 1997 e o Excel moderno abre com aviso;
   o XLSX abre limpo e é o que os próprios documentos anexados ao sistema já
   usam.
3. **Número é número na planilha.** Dinheiro, percentual e data saem como valor
   numérico com formato aplicado, nunca como texto formatado. Exportar em
   planilha só faz sentido se o cliente puder somar e filtrar — texto seria um
   PDF em outra roupa. A célula do Excel não tem tipo decimal, então este é o
   único ponto do sistema onde `Decimal` vira `number`, e é na formatação
   final, como manda a convenção.
4. **A célula carrega texto e número.** O PDF imprime o texto em pt-BR, a
   planilha grava o número: os dois geradores leem a mesma célula, e não há
   como o PDF e o Excel discordarem do mesmo relatório.
5. **"—" e vazio são coisas diferentes.** `texto(null)` vira "—" ("existe e não
   foi preenchido"); `branco()` fica vazio ("não se aplica"), para a linha de
   totais não encher de travessão. Célula com texto nunca leva formato de
   número — "—" sob um formato de data faz o Excel acusar conteúdo inválido.
6. **Os filtros aplicados vão impressos no cabeçalho.** Relatório de obra
   pública circula fora do sistema; sem os filtros na folha, ninguém sabe
   depois o que aquele número media.
7. **Download como `attachment`.** Diferente do documento anexado, que abre
   `inline`: relatório é arquivo para guardar e anexar, e abrir na aba
   descartaria o nome que o sistema acabou de montar.
8. **ZIP com data fixa.** Dois relatórios com o mesmo conteúdo geram bytes
   idênticos — o carimbo de hora do ZIP não pode ser a única diferença.

**Verificado com os arquivos gerados:**

| Verificação | Resultado |
|---|---|
| XLSX aberto por um leitor OOXML independente | ✅ 87 linhas, 8 colunas |
| Tipos das células | ✅ `int`, `datetime`, `str` — não string formatada |
| Formatos aplicados | ✅ `"R$" #,##0.00`, `dd/mm/yyyy`, `0.00%` |
| Painel congelado e autofiltro | ✅ `A10`, `A9:H96` |
| Soma da coluna de valor | ✅ confere com a linha de totais |
| PDF aberto pelo leitor do sistema operacional | ✅ 4 páginas, 87 linhas |
| Acentuação e travessão no PDF | ✅ "Adequação Elétrica – Unidade Norte" |
| Cabeçalho repetido e paginação nas páginas seguintes | ✅ "Página 4 de 4" |
| Linha de totais aparece uma vez só | ✅ |
| Relatório sem nenhuma linha | ✅ arquivo válido, com aviso na folha |

**Falta para fechar a etapa** (depende da 1ª reunião):

- Definir os relatórios (ponto #10) e escrever as consultas.
- Tela `/relatorios` com os filtros e os dois botões de exportação, e devolver
  "Relatórios" ao menu principal.
- Botão de exportar nas telas que já listam dados (obras, medições, auditoria).


## Etapa 12 — Ajustes, integração e testes ⬜

Não iniciada. É a etapa-colchão de fechamento: roda depois que a 11 fechar,
antes da 2ª reunião de validação e da instalação. Depende de todas as
anteriores, e é onde caem os itens que cada etapa adiou por não valer o custo
naquele momento.

**Nota de horas:** o quadro geral lança ~3h; o orçamento por módulo lança 7h
("Ajustes, integração e testes gerais"). A diferença é folga que só se resolve
quando a lista abaixo parar de ser condicional — a maior parte dela depende de
resposta do cliente ou de volume real de dados.

**Itens firmes:**

1. **Calibrar `LIMITES_PROVISORIOS`.** O cliente confirmou o desenho do farol
   (obra inteira, três faixas mais o cinza) mas não os números. Calibrar é
   editar constante, com a tela aberta na apresentação — por isso ficou aqui e
   não travou a etapa 9.
2. **Testes de integração ponta a ponta.** Os módulos têm teste próprio desde a
   etapa 0; falta o percurso completo — obra → medição → tramitação →
   documento → relatório — atravessando as etapas que foram escritas em
   momentos diferentes. O roteiro manual dessa varredura está em
   [`testes/`](testes/README.md), organizado por jornada de uso; o percurso
   completo é o bloco TRA-50..54.
3. **Varredura de consistência entre telas.** Rótulo, formato de data e dinheiro
   e vocabulário de situação nasceram etapa a etapa; a passada final é para
   eles não discordarem entre si.
4. **Máquina de estados da medição.** `salvarMedicao` aceita qualquer
   transição de status, inclusive `PAGA → RASCUNHO` — e dois passos (voltar a
   rascunho, depois excluir) contornam a trava que impede apagar medição
   protocolada. Vem da revisão de código (achado 4), adiada para cá em
   07/09/2026 porque exige desenhar as transições válidas, não um remendo.
   Casa com o item 2: é no percurso ponta a ponta que isso se exercita.
5. **Pendência restante da revisão de código.** Só o nit 15 (indicador
   "Autores" da tela de auditoria), à espera de a etapa 11 fechar — os de
   Baixa (5 a 10) foram corrigidos em 07/09/2026. Ver
   [`revisao-de-codigo.md`](revisao-de-codigo.md).

**Itens condicionais** (só entram se a condição se confirmar):

4. **Troca de senha pelo próprio usuário logado.** Hoje só existe o fluxo de
   redefinição (etapa 1). Entra se o cliente sentir falta — ver ponto #12 de
   [`pontos-para-reuniao.md`](pontos-para-reuniao.md), que decide o mecanismo
   sem servidor de e-mail.
5. **Paginação e busca nos cadastros base.** As listas de contratante,
   responsável técnico e setor trazem tudo (etapa 2). Entra se o cliente
   trouxer volume maior que as dezenas previstas.
6. **Desempenho do painel de obras.** O filtro de farol é aplicado em memória,
   depois da consulta, porque o farol é calculado na leitura (etapa 4). Se o
   volume crescer, entra aqui junto com o recálculo agendado de farol.

**Encerramento:** com a etapa 12 fechada o sistema vai para a 2ª reunião de
validação e, aceito, para a instalação — que é serviço fora das 140h
contratadas (ver [`escopo-e-orcamento.md`](escopo-e-orcamento.md) e o ponto #11).

## Etapa 13 — Ajustes pós-apresentação à diretoria 🟡

Aberta em 09/09/2026, depois da apresentação do sistema em homologação para o
Júnior (diretor), o Diego (gestor de engenharia) e o Henrique. Notas em
[`raw/apresentacao-diretoria.md`](raw/apresentacao-diretoria.md).

**O escopo desta rodada é deliberadamente curto: duas mudanças.** Remover o
avanço físico de onde ele aparece — inclusive a **barra de percentual do
cartão**, que fica sem dado — e trocar o responsável técnico pelo **operador com
atribuição momentânea**. O código **continua no cartão**: o espaço para o
operador vem da barra de físico que sai, então o cartão não perde informação
para ganhar a nova.

**Não estava no orçamento** — é retrabalho de requisito, e a maior parte dele é
*remoção*, não construção. O compromisso assumido na reunião foi subir os
ajustes no mesmo dia e avisar o cliente para retestar; a instalação foi falada
para sexta 11/09, com segunda 14/09 como cenário mais provável.

**Feito em 09/09/2026, no mesmo dia da reunião**, em três commits — um por
assunto: `7ff0eea` remove o avanço físico, `50f022c` troca o responsável
técnico pelo operador, `342ca05` liga o prazo de medição ao farol. O item 4
(seed) saiu distribuído nos dois últimos, porque cada um precisava do seu
cenário de demonstração. O que **cada decisão de implementação** custou está
descrito nos itens abaixo; o que **ficou diferente do planejado** está em
"Desvios do plano".

**Nota de horas:** ~5,5h estimadas, sem verba própria. Saem da folga da etapa 12
(que lança ~3h no quadro e 7h no orçamento por módulo) e comem a folga negativa
de 3h que já existia. Se o cliente trouxer mais ajustes depois do período de
teste — e vai trazer, porque foi para isso que o ambiente foi liberado — a
conversa passa a ser de escopo, não de folga.

### Itens firmes

1. ✅ **Remover o avanço físico do sistema** (~1,5h). Decisão do Júnior confirmada
   pelo Diego: *"tanto do card principal quanto dos detalhes da obra"*. Alcance
   real, porque o campo se espalhou por cinco lugares:
   - o campo *"Avanço físico acumulado (%)"* do formulário de medição
     (obrigatório hoje) e `percentualExecutado` no schema;
   - o resumo da obra e o cartão do painel, que mostram execução física — no
     cartão sai a **barra de percentual**, e é o espaço dela que recebe o
     operador do item 2;
   - **o farol perde um dos três critérios** — o de avanço físico atrás do
     tempo decorrido, em `src/modules/farol/regras.ts` e nos
     `LIMITES_PROVISORIOS`. Sobram proximidade do término e processo parado;
   - os relatórios que trazem a coluna (etapa 11);
   - o seed de demonstração, que hoje encena progressão física (25% → 40% →
     48%) para mostrar a tela.

   **Como ficou:** a coluna `percentualExecutado` **não** foi removida do
   banco. Ela era `NOT NULL`, e sem o campo no formulário a criação de medição
   quebraria, então a migration
   `20260909120000_avanco_fisico_sai_do_sistema` faz só um `DROP NOT NULL`:
   nenhum código lê ou escreve a coluna, o histórico das medições já lançadas
   continua lá e a base de demonstração não precisou ser zerada — que era o
   pedido do cliente. Apagar a coluna de vez continua sendo decisão para
   depois; ver ponto #5 de [`pontos-para-reuniao.md`](pontos-para-reuniao.md).

   **A coluna dos relatórios não existia.** O plano contava com ela vinda da
   etapa 11, mas `modules/relatorios/` só tem a mecânica neutra de exportação —
   as colunas concretas ainda dependem do ponto #10. Não havia o que remover.

2. ✅ **Responsável técnico vira operador, com atribuição momentânea** (~2,5h). O
   maior item, e o único que constrói algo novo. O desenho fechado com o Diego:
   - o campo passa a se chamar **Operador** — o problema era a nomenclatura:
     *"quando fala responsável técnico ele imagina o responsável da obra"*;
   - **sai a atribuição no cadastro do contrato**; entra a auto-atribuição pelo
     próprio operador, na **aba resumo** da obra;
   - ao concluir, **o nome permanece** como último que mexeu — registro, não
     fila de tarefas: *"pode estar lá como último responsável que modificou"*;
   - a atribuição vem com **observação em texto livre** — a justificativa do
     atraso, *"aguardando foto, relatório"*;
   - **só aparece em atenção ou crítico. Em verde, nada.**

   Por que não é responsável fixo por obra: 15 a 20 contratos para três
   pessoas, *"quem tiver, dependendo da urgência"* mexe, às vezes duas na mesma
   obra. Qualquer desenho que amarre uma pessoa a um contrato está errado.

   Já existe e **não precisa ser construído**: o responsável por medição na aba
   Medições e a trilha de auditoria — foram conferidos ao vivo e aceitos.

   **Como ficou:** regra em `modules/obras/operador.ts`, com 12 testes; telas
   em `obras/[id]/operador.tsx` e ações em `obras/[id]/operador-acoes.ts`, com
   auditoria em toda atribuição e liberação. Três pontos do desenho que a
   reunião não fechou e o código precisou fechar:

   - **`operadorId` aponta para `Usuario`, não para `Responsavel`.** Quem
     assume é quem está logado — auto-atribuição não funciona contra um
     cadastro de pessoas sem login. O cadastro de Responsáveis continua
     existindo, agora só ligado à medição ("Responsável AJA" do mockup), e a
     tela dele passou a contar medições em vez de obras. A migration
     `20260909130000_operador_com_atribuicao_momentanea` **remove
     `Obra.responsavelId`**: o conceito foi descartado pelo cliente e o
     ambiente ainda é de demonstração, sem dado real.
   - **Três estados em quatro campos.** `operadorAssumidoEm` preenchido =
     assumida; nulo com `operadorId` preenchido = liberada, e aí o nome aparece
     como *"Último operador"*; ambos nulos = nunca tocada. É assim que o
     *"pode estar lá como último responsável que modificou"* convive com o
     campo não ser fila de tarefas.
   - **A observação morre ao liberar, o nome não.** *"Aguardando foto"* era a
     justificativa daquela atribuição; mantê-la deixaria a obra parecendo presa
     a um motivo que já passou.

3. ✅ **Farol de medição: amarelo dez dias antes** (~0,5h). Confirmado duas vezes.
   Mensal são 30 dias corridos, e o amarelo acende a partir do 20º. Vermelho
   quando vencer, como já é. `modules/medicoes/periodicidade.ts` já calcula o
   vencimento; é ligar o resultado ao motor do farol como mais um critério —
   sem trocar o escopo do farol, que continua sendo da obra inteira.

   **Como ficou:** `diasAlertaMedicao: 10` nos limites do farol, marcado como
   **não provisório** — é o único número que o cliente deu. Medição que vence
   *hoje* ainda é amarela: o prazo é hoje, não foi perdido. Vermelho a partir
   do dia seguinte.

4. ✅ **Atualizar o seed de demonstração** (~0,5h) para que as obras fictícias
   exercitem o que passou a existir: obra em atenção com operador atribuído e
   observação, obra crítica sem ninguém atribuído. O cliente **pediu para não
   zerar** a base — ela é o parâmetro de preenchimento deles, então precisa
   mostrar o desenho novo.

   **Como ficou:** a DEMO-002 está assumida pelo próprio usuário da
   demonstração, com observação, para dar para liberar e reassumir na tela; a
   DEMO-003 está crítica e liberada, mostrando o *"último operador"*. As
   medições da DEMO-002 foram puxadas de 40 para 25 dias atrás: com o critério
   novo ela ficaria vermelha, e a demonstração perderia o único cartão amarelo
   — agora ela acende amarelo por **dois** motivos somados (medição vencendo e
   término próximo), o que também mostra o acúmulo de motivos no cartão.

### Desvios do plano — decididos na implementação, a confirmar

Três coisas que a reunião não fechou e o código não pôde deixar em aberto. Não
são mudanças de escopo; são escolhas de desenho tomadas com a régua do "o que
serve às três pessoas que usam isso todo dia", e cada uma pode ser revertida
barato se o cliente discordar.

1. **Assumir a obra exige `obra:ver`, não `obra:editar`.** O perfil Operacional
   só lê obra na matriz atual — se a atribuição exigisse `editar`, justamente as
   três pessoas para quem o campo existe ficariam de fora. Assumir não altera
   nenhum dado do contrato, só diz quem está cuidando dele agora. Está
   comentado no código e registrado no ponto #3, que é onde a matriz linha a
   linha vai ser fechada com o Diego e o Henrique.
2. **Ninguém toma a obra de quem está com ela.** Se outro operador já assumiu,
   o botão recusa e pede para a pessoa liberar. O cliente disse que às vezes
   duas pessoas mexem na mesma obra, mas não disse o que acontece no conflito —
   escolhemos o caminho que força o combinado em vez do silencioso. Quem
   assumiu pode reescrever a própria observação quantas vezes quiser.
3. **O filtro "Responsável" do painel virou "Operador"**, listando usuários do
   sistema. Era a única forma de "as minhas obras" continuar existindo depois
   que o campo mudou de natureza; o requisito 1.9 previa filtro por
   responsável, e a intenção segue servida. A busca livre do painel também
   passou a olhar o nome do operador em vez do responsável.

**Um teste passava por acidente e foi corrigido.** A fixture de tramitação
avaliava o farol em 20/08 numa obra com ordem de início em 10/01 e nenhuma
medição lançada — obra que, pelo critério novo, está com a medição vencida há
seis meses. Ela era "verde" só porque o sistema ainda não olhava para isso. A
avaliação passou para 20/01, dez dias depois da ordem de início, para o bloco
continuar testando processo parado isolado.

### Decidido em contrário — não fazer

- **O código não sai do cartão.** O Júnior pediu (*"esse código não tem
  necessidade"*), mas ele é a chave que liga a obra no sistema à pasta dela na
  rede, e o Diego vai padronizar as duas pontas: *"o que tiver aqui vai estar na
  rede também, é fundamental para a gente"*. Quem usa os dois lados todo dia é o
  setor de engenharia. O lugar do operador no cartão sai da barra de físico, que
  perde o dado de qualquer forma.
- **O nome da empresa no cartão fica em aberto**, não implementado: era o outro
  pedido do Júnior para esse espaço, e o desenho do Diego (operador) passou por
  cima dele sem que fosse retirado. Ver ponto #20 de
  [`pontos-para-reuniao.md`](pontos-para-reuniao.md) — é pergunta para a próxima
  conversa, com a tela aberta.

### Bloqueado por falta de resposta do cliente

5. ✅ **Checklist de documentos padrão** — desbloqueado. A tela foi feita em
   17/09 (itens 7 a 9 abaixo) e a **lista dos documentos chegou em 21/09**,
   com dezessete itens: item 13. Ver ponto #18 de
   [`pontos-para-reuniao.md`](pontos-para-reuniao.md), onde ficaram as três
   escolhas de implementação a confirmar.

6. **Matriz de permissões linha a linha.** Os quatro perfis ficam (fechado na
   reunião), mas a devolutiva da matriz ficou com o Diego e o Henrique, junto
   com o pedido do Júnior de que **só o administrador apague qualquer coisa**.
   Ver pontos #3 e #8.

7. **Cards de totais no topo do painel.** Pedido de remoção pelo Júnior e
   defendido por Diego e Henrique na mesma reunião; o Diego assumiu resolver
   internamente. **Nada a fazer até a devolutiva** — ver ponto #19.

### Fora de escopo, confirmado nesta reunião

- **Arquivos de projeto (DWG/RVT) não entram** — continuam na rede. Este
  sistema administra processo, não a obra: eles já têm outro sistema para isso.
  Encerra o ponto #2 e, com ele, o risco de pré-visualização e versionamento de
  projeto virarem escopo.
- **Sem aplicativo de campo.** O engenheiro em obra não acessa o sistema.
- **Sem carga de planilha de quantitativos nem de cronograma
  físico-financeiro** — levantados e descartados na conversa que removeu o
  físico.

### Ajustes do período de teste — 15/09/2026

Pedidos da Fernanda ao lançar as obras reais na homologação.

1. ✅ **Formulário de obra não apaga o que foi digitado quando dá erro.** Com
   `<form action>`, o React 19 limpa os campos ao fim de todo envio, inclusive
   quando a action devolve erro. `useEnvioSemReset` envia pelo `onSubmit`.
   Aplicado só no formulário de obra; medição, rerratificação, cadastros e
   tramitação têm o mesmo padrão e ficaram de fora.
2. ✅ **Exclusão: só documento ativo trava.** Medição sai em qualquer situação
   (caiu a regra de só apagar *Rascunho*), com link de exclusão em cada linha
   da tabela. Obra sai com medições, rerratificações e tramitação em cascata,
   desde que a aba Documentos esteja vazia. As duas passam por uma janela de
   confirmação (`ConfirmarExclusao`, `<dialog>` nativo) que mostra o que vai
   sair e, quando há documento, explica a trava em vez de oferecer o botão.
   Regras em `modules/medicoes/exclusao.ts` e `modules/obras/exclusao.ts`.

   **O documento da tramitação conta para a medição.** Arquivo enviado num
   movimento da medição fica com `movimentoId`, não `medicaoId`, mas o
   movimento sai em cascata com ela — sem contar esse caminho, a exclusão
   levaria documento ativo junto sem avisar.

   **Os arquivos saem junto.** Documento excluído na aba Documentos é só
   marcado (`excluidoEm`); o arquivo continua no armazenamento. Quando obra
   ou medição é apagada, a cascata leva as linhas desses documentos, e o
   arquivo ficaria sem nada que apontasse para ele. Por isso a action lê os
   caminhos na mesma transação e, depois do commit, apaga os arquivos
   (`apagarArquivos`, em `lib/storage`) — no disco ou na `ArquivoBlob`. Falha
   ao apagar vai para o log e não desfaz a exclusão. Na instalação local, a
   pasta vazia `storage/obras/<id>/` continua existindo.
   **Em aberto:** a senha do administrador na confirmação, que a Fernanda
   sugeriu — ver ponto #8.
3. ✅ **Código interno sai da tela.** A Fernanda: *"o código interno não é
   necessário pois já tem o número do contrato"*. Saiu do cartão do painel,
   do cabeçalho da obra e do formulário. **A lógica fica:** a coluna `codigo`
   continua, o cadastro gera `OBR-ano-seq` quando o campo vem vazio (que agora
   é sempre) e a edição mantém o atual; a busca do painel ainda encontra por
   ele. Voltar é devolver o input e os dois rótulos.

   **Histórico passa a citar o contrato.** As mensagens novas de auditoria
   dizem "obra do contrato 015/2026" em vez de "obra OBR-2026-001". As antigas
   ficam como foram gravadas — a trilha é append-only —, então a aba Histórico
   de uma obra antiga mostra os dois formatos.

   **Perde-se:** o código era citado como a chave entre a obra no sistema e a
   pasta dela na rede. Se a pasta for organizada pelo código, quem procura
   passa a depender da busca do painel para descobrir qual é.
4. ⏸️ **Upload de PDF grande falha na homologação.** A Vercel limita o corpo
   da requisição a ~4,5 MB; é limite da plataforma, e fica sem ação. **A
   verificar na instalação local:** o `proxy.ts` do Next 16 guarda em memória
   só os primeiros 10 MB do corpo (`proxyClientMaxBodySize`), abaixo dos 320 MB
   configurados para Server Actions.
5. ✅ **Tramitação sai da tela — 17/09/2026.** Pedido do Junior, pela Fernanda:
   *"com os documentos listados não vai precisar dessa aba"*, *"cada documento
   vai ser anexado e pela listagem vai dar pra saber o que falta e saber o
   fluxo do processo"*, *"ele quer o mais simples possível"*.

   **Saiu da interface:** a aba e a rota `/obras/[id]/tramitacao` inteira
   (página, actions e os dois componentes), o bloco "Tramitação do processo"
   da medição — com o encaminhamento a setor e a tabela de movimentos — e as
   colunas "Setor atual" e "Tempo" da lista de medições.

   **Continua no lugar:** as tabelas `EtapaObra` e `TramitacaoMovimento`, os
   módulos `modules/tramitacao/`, as 11 etapas criadas junto com a obra, o
   cadastro de Setores e os movimentos já registrados. A remoção é de tela, e
   volta com um `git revert` do commit — por isso foi feita antes da lista de
   documentos existir, e não depois.

   **O que ficou sem alimentação:** nenhum movimento novo pode ser registrado,
   então `diasParado` passa a ser sempre `null` numa base nova. O critério
   "processo parado" do farol continua no código e não acende mais — **em
   discussão, ver ponto #23**. O "Processo parado há N dias" do resumo e do
   painel mostra travessão, e o cadastro de Setores fica sem uso.

   **Só apagar schema e tabelas depois** que a lista de documentos estiver de
   pé e aprovada. Migration destrutiva é o último passo, nunca o primeiro.
6. ✅ **Farol com dois critérios — 17/09/2026.** Decisão do cliente depois de
   ver as três opções do ponto #23: em vez de inventar um substituto para
   "processo parado", o critério sai. Restam **término do contrato** (amarelo
   30 dias antes, vermelho depois de vencido) e **vencimento da medição**
   (amarelo dez dias antes, vermelho ao vencer).

   Saíram junto o indicador "Processos parados" do painel, o "Maior tempo
   parado" da aba Resumo, o campo `diasParado` de `resumoDaObra` e as consultas
   de movimento que só existiam para alimentá-lo. `modules/tramitacao/` fica de
   pé, com testes, marcado como em espera — nada em `src/app/` o chama.

   **Consequência a dizer ao cliente:** obra parada, dentro do prazo e com
   medição em dia, agora fica verde.
7. ✅ **Lista de conferência de documentos — 17/09/2026.** É a tela que
   substitui a leitura que a aba Tramitação dava. A aba Documentos ganhou o
   bloco "Conferência do contrato", com os 20 tipos do seletor na ordem do
   processo: em vermelho o que falta, em verde o anexado com data e contagem.
   A tela da medição ganhou o mesmo bloco, com os cinco tipos que o mockup já
   sugeria ali (ponto #18 — quais são os necessários da medição é suposição
   nossa).

   **"Não se aplica" é botão por linha**, com motivo opcional: o tipo fica
   cinza e desce para o fim, exatamente como foi pedido. Guardado em
   `DocumentoDispensado`, por par (obra, tipo) ou (medição, tipo) — a mesma
   obra dispensa ISS e a vizinha exige. A unicidade são **dois índices
   parciais** na migration, porque `medicaoId` é nulo na dispensa do contrato
   e no Postgres dois NULL nunca são iguais.

   **A regra fica em `modules/documentos/conferencia.ts`**, sem React e com
   teste: ordenação, dispensa vencendo anexo, tipo fora da lista caindo no fim
   e a contagem do cabeçalho.

   **A conferência do contrato ignora documento de medição** — e também o que
   está preso a um movimento de tramitação, que pertence ao percurso de uma
   medição. Sem isso, a nota fiscal da medição 3 marcaria "Nota fiscal
   anexada" no contrato.

   **O que a lista não diz, e convém não prometer:** a data é a do upload, não
   a do fato. Aceite assinado em março e anexado em junho aparece como junho.

   Validado no navegador com o banco local: marcar, ver descer para o fim em
   cinza, voltar a exigir, e as duas ações no histórico da obra.

8. ✅ **A aba Documentos vira uma lista só — 17/09/2026.** Pedido do Telmo no
   mesmo dia, olhando a tela pronta: os três blocos ("Conferência do
   contrato", "Documentos" e "Novo documento do contrato") diziam a mesma
   coisa em lugares diferentes, e o envio ficava num formulário no fim da
   página, solto de qualquer linha. Agora é **uma tabela**: cada linha é um
   tipo esperado, e a coluna "Ação" traz o que dá para fazer com ela —
   **Incluir**, Abrir, Excluir, "Não se aplica".

   **Um tipo, um arquivo.** A linha só fecha a conta se não se desdobrar, então
   o contrato aceita um arquivo por tipo; o segundo arquivo do mesmo assunto
   entra como **"Outro"**, o único tipo que aceita repetição — e por isso o
   único cuja linha continua oferecendo "Incluir" depois de preenchida. A
   recusa é da action (`recusaPorRepeticao`), não só da tela. Medição,
   rerratificação e tramitação continuam aceitando quantos arquivos
   precisarem: lá a lista é do anexo, não do tipo.

   **Incluir e "Não se aplica" viraram modais**, abertas pela própria linha —
   o tipo já está decidido por ela, então a janela não pergunta de novo, e o
   motivo da dispensa deixou de ser um campo solto embaixo da tabela que
   ninguém preenchia. `<dialog>` nativo, sem biblioteca.

   **Arquivos de outras telas aparecem na mesma lista**, no fim, marcados "de
   outra tela" e com a origem — sem botão de incluir, porque quem anexa é a
   tela de origem.

   Regra em `modules/documentos/acervo.ts`, com teste. Validado no navegador
   com o banco local: incluir a proposta pela linha, a janela fechar sozinha e
   a linha virar "Anexado".

9. ✅ **A medição segue a mesma lista, com atalhos no cabeçalho — 17/09/2026.**
   "Documentos necessários" e "Arquivos da medição" viraram um bloco só,
   **"Documentos da medição"**, com a mesma tabela da obra (`mostrarOrigem`
   desligado: ali toda linha é da própria medição).

   **A regra de repetição é diferente da do contrato, e de propósito:** na
   medição **todo tipo aceita quantos arquivos precisar** — duas planilhas de
   memória de cálculo na mesma medição são normais, e cobrar "uma nota fiscal
   por medição" seria inventar regra que o cliente não pediu. É o parâmetro
   `permiteRepeticao` de `montarAcervo`.

   Como a lista da medição é curta (os cinco do mockup), anexar um parecer ou
   uma foto ficaria impossível: para isso existe **"Incluir documento de outro
   tipo"**, a única janela que ainda pergunta o tipo, porque ali nenhuma linha
   o decidiu. Arquivo de tipo fora da lista aparece no fim, marcado "fora da
   lista", e não entra na conta do cabeçalho.

   **Atalhos "Documentação" e "Excluir medição" no cabeçalho**, ao lado do
   número da medição: a tela é comprida e quem entrava para anexar um arquivo
   rolava o formulário inteiro. São âncoras (`href="#documentos"`), não botões
   com JavaScript — funcionam com teclado e a rolagem suave vem do CSS, com
   `prefers-reduced-motion` respeitado.

   **Código morto removido junto:** `modules/documentos/conferencia.ts`, o
   componente `documentos/conferencia.tsx` e `tests/conferencia.test.ts` saíram
   — eram a implementação paralela que o acervo substituiu. `ESPERADOS_DA_OBRA`
   e `ESPERADOS_DA_MEDICAO` mudaram de casa para `acervo.ts`, com a
   justificativa original.

10. ✅ **Filtro de pagamento pendente na aba Medições — 17/09/2026.** Pedido do
    Junior, pela Fernanda: *"que essa opção fique na aba de medições, pra poder
    marcar como pendente, aparecer quando for filtrar"*.

    **Sem campo novo.** A pendência é derivada do `status` que a medição já tem:
    não paga e não rejeitada é pagamento pendente. Um marcador manual em
    paralelo ao status poderia contradizê-lo — medição "Paga" marcada como
    pendente — e o sistema passaria a dar duas respostas para a mesma pergunta.
    Marcar como pendente, na prática, é o que já se faz ao deixar a medição em
    Protocolada ou Aprovada.

    A aba ganhou filtro por situação e a caixa "só pagamento pendente"
    (`<form method="get">`, o filtro vira query na URL como no painel e na
    central de documentos), o título do histórico passa a dizer "N de M" quando
    há filtro, e a faixa de indicadores ganhou **"Pagamento pendente"** com o
    valor somado em vermelho. Regra em `modules/medicoes/filtros.ts`, com teste.

    **A faixa de indicadores não responde ao filtro**, só a tabela: um total que
    mudasse junto com o filtro deixaria de ser o valor do contrato.

    **O que falta, e é o que importa — ponto #24:** *pendente* não é *atrasado*.
    Toda obra em andamento tem medição não paga, então o filtro sozinho não
    separa nada. Separar exige saber de onde sai o prazo de pagamento (protocolo?
    aprovação? prazo fixo de contrato? varia por órgão?), e o cliente ainda não
    respondeu. Também não foi respondido se pagamento parado deve acender o
    farol — hoje não acende.

11. ✅ **Os documentos necessários da medição, ditos pelo cliente — 17/09/2026.**
    A lista deixou de ser suposição: **medição, memória de cálculo, cronograma,
    relatório fotográfico, diário de obra e nota fiscal**, nessa ordem, mais a
    linha **"Outro"** ao fim.

    **Quatro tipos novos no enum** (`MEMORIA_CALCULO`, `CRONOGRAMA`,
    `RELATORIO_FOTOGRAFICO`, `DIARIO_OBRA`). A migration só faz `ALTER TYPE …
    ADD VALUE`: nada é renomeado nem removido, e documento já gravado como
    "Planilha" ou "Foto" continua válido.

    **Os quatro ficam fora da lista do contrato.** São documentos de medição;
    cobrá-los na obra abriria quatro linhas vermelhas eternas em toda obra.
    Anexados lá assim mesmo, aparecem como "fora da lista".

    **"Incluir documento de outro tipo" saiu.** Era a única janela que ainda
    perguntava o tipo, e existia porque a lista da medição era curta demais.
    Com a linha "Outro" na tabela — que se repete sem limite e aceita descrição,
    como na aba Documentos — ela deixou de ter função. O componente
    `IncluirDeOutroTipo` foi removido.

    **"Outro" tem linha mas não é cobrado.** Não conta no "N de M não
    anexado(s)", aparece como *Opcional* em cinza em vez de "Não anexado" em
    vermelho, e não oferece "não se aplica" — é a porta de entrada do que não
    tem tipo próprio, não um documento necessário. Vale para as duas telas: a
    aba da obra passou de 20 para 19 tipos cobrados.

    **Saíram da lista da medição** processo / protocolo, ISS e planilha, que
    estavam ali por leitura do mockup — o ISS convém confirmar, já que tem campo
    próprio no formulário (ponto #18).

    Verificado no navegador com o banco local, depois da migration: a medição
    lista os seis na ordem pedida com "6 de 6 não anexado(s)", "Outro" como
    opcional ao fim, e a aba da obra segue com os 20 tipos de antes.

12. ✅ **O cadastro de responsáveis sai; o nome fica na medição — 21/09/2026.**
    Pedido da Fernanda, em duas mensagens: *"retirar o cadastro de
    responsáveis"* e *"nas medições pode deixar só pra colocar o nome do
    responsável pela medição mesmo"*.

    **É remoção, não substituição.** Sai a aba `/cadastros/responsaveis` com as
    três telas (lista, novo, edição), o `FormResponsavel`, a ação
    `salvarResponsavel` e o model `Responsavel` inteiro. O campo da medição
    deixa de ser `<select>` com FK e passa a ser `<input>` de texto,
    **"Responsável pela medição"**.

    **Os nomes já lançados não se perdem.** A migration cria
    `Medicao.responsavelNome`, copia o nome da tabela antes de derrubá-la e só
    então apaga a coluna e o model. Quem tinha "João Silva" na medição 3
    continua com "João Silva" ali, agora como texto.

    **O rótulo "Responsavel" fica na auditoria.** A trilha é append-only e tem
    registros antigos de criação e edição de responsáveis; sem o rótulo eles
    apareceriam como o nome cru do model. Some do **filtro** de entidades, que
    é a lista do que ainda se pode auditar.

    **Por que não virou cadastro opcional:** o cliente tem três pessoas no
    setor e o nome era usado em um único campo. Cadastro cobra duas visitas —
    cadastrar antes, escolher depois — para guardar um texto que ninguém
    consulta por outro caminho. O preço é perder a padronização do nome
    ("João Silva" e "Joao silva" viram dois), e é um preço que o cliente
    escolheu.

13. ✅ **A lista de documentos do contrato é a do cliente — 21/09/2026.** A
    Fernanda mandou os dezessete, numerados, na mesma conversa. Fecha o que o
    ponto #18 chamava de *"a pergunta mais concreta que sobrou"*: ART,
    publicação e empenho não existiam como tipo.

    **A lista, na ordem em que veio:** termo de adjudicação, termo de
    homologação, empenho, contrato, publicação do extrato de contrato, apólice
    de seguro / risco engenharia, publicação de comissão de fiscalização, ordem
    de início, emissão de ART/RRT, emissão da CNO, medições contratuais, termo
    aditivo, apostilamento, termo de recebimento provisório, termo de
    recebimento definitivo, licenças e outros.

    **Dez tipos novos no enum, três renomeados.** Renomear preserva o que já
    foi anexado e evita dois nomes para a mesma coisa no seletor: `GARANTIA`
    virou `APOLICE_SEGURO`, `RERRATIFICACAO` virou `TERMO_ADITIVO` e `ACEITE`
    virou `RECEBIMENTO_PROVISORIO`. **Nada foi removido**: edital, proposta,
    atestado/CAT, despacho, parecer e os demais continuam no vocabulário das
    outras telas — fora da lista cobrada do contrato, e aparecendo como "fora
    da lista" onde já existirem.

    **"Em caso de necessidade" virou linha opcional.** Termo aditivo e
    apostilamento têm linha, mas não contam no "N de M não anexado(s)", não
    ficam vermelhos e não oferecem "não se aplica" — mesma regra que "Outros"
    já tinha. Cobrá-los abriria duas linhas vermelhas eternas na maioria das
    obras. São 14 tipos cobrados de 17 linhas.

    **Cinco tipos aceitam mais de um arquivo** (21/09, depois de a lista
    subir): "Outros" e medições contratuais, que já repetiam, mais **apólice /
    risco engenharia** (o nome junta dois seguros, e ainda há endosso e
    renovação), **licenças** (prefeitura, ambiental, bombeiros) e **ART/RRT**
    (uma por profissional, mais uma a cada aditivo). Nos outros doze continua
    valendo um arquivo por tipo — linha que se desdobra desfaz a leitura de "o
    que falta" —, e o segundo arquivo vai como "Outros". A contagem do
    cabeçalho não muda: ela conta tipo, não arquivo.

    **"Medições contratuais" é cumprida pela tela da medição.** Os boletins são
    anexados em cada medição; se a linha do contrato só olhasse os arquivos do
    próprio contrato, ficaria vermelha para sempre numa obra com tudo em dia.
    A linha aceita repetição — um contrato tem várias medições — e mostra
    "Medição NN" na coluna "Vinculado a".

    **O que isso não resolve:** a lista é igual para todo contratante. Nenhuma
    fala sugeriu o contrário, e a dispensa por obra ("não se aplica") cobre a
    variação caso a caso. Se um dia variar por órgão, vira cadastro — ponto #18.



14. ✅ **Prazo adicional da rerratificação prorroga a obra — 22/09/2026.** Bug
    relatado pela Fernanda no período de teste: rerratificação aprovada com 120
    dias de prazo adicional não prorrogava nada, e a obra de Nilópolis seguia
    "vencida há 60". O prazo era gravado na rerratificação e não chegava a
    lugar nenhum — o valor tinha cache e propagação, o prazo não tinha nenhum
    dos dois.

    **`Obra.prazoAditivadoDias` entrou como cache**, espelhando `valorAditivado`
    linha a linha: mesma função de recálculo, mesma transação, mesmo recorte de
    só contar rerratificação **aprovada** — confirmado por ela: *"Isso só
    quando estiver aprovada"*. A migration faz backfill das obras que já tinham
    aprovadas, senão elas só se corrigiriam quando alguém mexesse nelas de novo.

    **O término do contrato não é reescrito.** Pedido explícito dela: *"mas não
    alterar o contrato"*. `dataPrevistaTermino` continua sendo a data assinada e
    o **término vigente** é derivado dos dois (`terminoVigente`, em
    `modules/obras/prazo.ts`), o que faz a prorrogação sumir sozinha se a
    rerratificação sair de aprovada.

    **O prazo adicional entra no total, não só no que falta.** Se entrasse só em
    `diasRestantes`, obra prorrogada e em dia apareceria com o prazo
    transcorrido acima de 100% — o denominador tem que crescer junto.

    **"Término real" virou "Término efetivo".** Ela tinha preenchido o campo à
    mão com o término prorrogado, e ele não entrava em conta nenhuma: no banco
    `dataTerminoReal` é "a obra acabou neste dia", não "o término que vale
    hoje". Ganhou dica de quando preencher e some da aba Resumo enquanto a obra
    não terminou — a linha vazia era o convite a digitar ali o prorrogado.

    **A ordenação do painel saiu do banco.** Era `orderBy dataPrevistaTermino`;
    com a prorrogação, obra aditivada aparecia fora de ordem. O prazo aditivado
    é contador de dias, não dá para somá-lo na data pelo `orderBy` — e são
    quinze a vinte contratos, então a ordem por término vigente é feita em
    memória, depois do resumo.

    **O que isso não resolve:** suspensão de prazo continua sem modelagem. Ver
    ponto #25 de [`pontos-para-reuniao.md`](pontos-para-reuniao.md).

15. ✅ **Pagamento de medição e pedidos de 24/09/2026.** Pedidos do Junior
    pela Fernanda, com as escolhas de implementação no ponto #26 de
    [`pontos-para-reuniao.md`](pontos-para-reuniao.md).

    | Pedido | Estado |
    | --- | --- |
    | "Só pagamento pendente" vira "Pagamento pendente" | ✅ |
    | Marcar como paga na linha, com data; data sai do formulário | ✅ |
    | Quadro "Pagamento pendente" no painel (valor e quantidade) | ✅ |
    | O quadro abre a lista de pagamentos pendentes | ✅ `/obras/pagamentos-pendentes` |
    | Observação do contrato no cartão do painel | ✅ |
    | Suspensão de prazo na aba Contrato | ✅ 25/09/2026 |
    | Documentos da medição só na medição; "Medições contratuais" sai da lista do contrato | ✅ 25/09/2026 |

    **O pagamento tem um caminho só.** A regra mora em
    `modules/medicoes/pagamento.ts`: o botão aparece em Protocolada e
    Aprovada, "Desfazer" volta para Aprovada, e o formulário recusa virar ou
    deixar de ser Paga. Salvar pelo formulário uma medição já paga preserva a
    data — era o risco de tirar o campo da tela.

    **O quadro e a lista partem das mesmas obras.** A consulta do painel saiu
    da página para `app/(app)/obras/painel.ts`, e o filtro do painel vai na
    URL da lista (`filtrosParaQuery`). Sem isso, a soma da lista divergiria
    do quadro que levou o usuário até ela.

    **Suspensão de prazo é calculada na leitura.** Com a data final em branco
    ela cresce um dia por dia, então não cabe em coluna cache como o prazo
    aditivado. A regra mora em `modules/obras/suspensao.ts` e vale igual para
    o prazo e para o ciclo de medição: os dias suspensos empurram o
    vencimento, e os **dias restantes** passam a ser dias de prazo, não de
    calendário — senão preencher a data final no meio da suspensão faria o
    número pular. O farol recebe esse número (`diasParaTermino`).

    **Documento de medição fica na medição.** `ehDeMedicao`, em
    `modules/documentos/acervo.ts`, tira da aba Documentos o que foi anexado
    na medição ou no percurso dela, e a linha "Medições contratuais" saiu da
    lista do contrato. As mensagens de exclusão passaram a apontar as medições.

    **Em aberto:** a leitura de *"pode deixar só 'Medições'"* (renomeamos o
    tipo), o farol durante a suspensão e se suspensa é o mesmo que Paralisada
    — ponto #26.

## Etapa 14 — Empacotamento e instalação on-premise ⬜

**Fora das 140h contratadas.** Plano completo, com o desenho físico e o
raciocínio de cada decisão, em
[`instalacao-on-premise.md`](instalacao-on-premise.md). Aqui fica só o estado.

**Nada disto existe no repositório hoje.** Não há `.github/`, não há
`scripts/`, não há nenhuma rota em `src/app/api/`, e o `next.config.ts` não
tem `output: "standalone"`.

> ### O ambiente mudou em 09/09/2026 — releia o plano antes de codar
>
> As premissas anteriores estavam erradas. O Júnior confirmou:
>
> | Assumíamos | Realidade |
> | --- | --- |
> | Servidor | **Estação de trabalho.** Sem disco/fonte redundante |
> | Windows Server ou Linux | **Windows comercial (10/11)** |
> | Com saída para a internet | **Isolada, por decisão.** *"Tudo aqui é estanque"* |
>
> O que isso muda em código, e é fácil errar por hábito: o workflow do Actions
> roda em **`windows-latest`**, não `ubuntu-latest`. O binário do CLI do Prisma
> é por plataforma; `ubuntu-latest` produziria o binário errado tão certamente
> quanto um build feito no Mac.

### Itens a construir, em ordem de dependência

| # | Item | Onde | Estado |
| --- | --- | --- | --- |
| 1 | `output: "standalone"` | `next.config.ts` | ⬜ |
| 2 | Endpoint de saúde `/api/health` | `src/app/api/health/` | ⬜ |
| 3 | Workflow de release (`windows-latest`) | `.github/workflows/release.yml` | ⬜ |
| 4 | Script de empacotamento | `scripts/empacotar.ps1` | ⬜ |
| 5 | Script de atualização | dentro do pacote, `.ps1` | ⬜ |
| 6 | Script de instalação inicial | `.ps1` + roteiro | ⬜ |
| 7 | Serviço do Windows via NSSM | fora do repo | ⬜ |
| 8 | Procedimento de backup + tarefa agendada | doc + `.ps1` | ⬜ |
| 9 | Versão do Node fixada (Actions e máquina) | workflow + doc | ⬜ |

Os itens **1 e 2 bloqueiam todo o resto**: sem `standalone` o pacote não é
autocontido — e a máquina não tem internet para rodar `npm install`; sem
`/api/health` o passo de verificação do script de atualização não existe, e
"subiu" vira palpite.

### Riscos registrados

- **Não existe atualização automática.** Sem internet, toda atualização depende
  de alguém levando um arquivo até a máquina. Correção urgente de bug fica
  presa à disponibilidade do cliente — consequência a declarar, não a esconder.
- **Migration destrutiva não tem rollback barato.** A junction devolve a
  aplicação em segundos, o banco não volta junto. Migrations que removem ou
  renomeiam coluna precisam ser quebradas em duas versões.
- 🔴 **`storage\` não pode virar pasta compartilhada.** O cliente organiza a
  rede inteira por compartilhamento com permissão por departamento, e aplicar
  a mesma lógica aos documentos do sistema faria qualquer pessoa daquele
  compartilhamento abrir qualquer contrato pelo Explorer, sem passar por
  nenhuma verificação de permissão. Precisa ser dito na instalação.
- **Sem redundância de hardware.** É uma estação de trabalho: o backup deixa de
  ser boa prática e passa a ser a única rede de segurança.

### Bloqueado por falta de resposta do cliente

O checklist da máquina foi enviado ao Júnior em **09/09/2026** e está na
**seção 9** de [`instalacao-on-premise.md`](instalacao-on-premise.md).
Aguardando: edição do Windows, **IP fixo ou DHCP**, espaço em disco,
PostgreSQL preexistente, antivírus, nobreak, e se a máquina é usada para
trabalhar. Ver ponto #11 de
[`pontos-para-reuniao.md`](pontos-para-reuniao.md).

**Data falada para a instalação:** sexta, 11/09/2026, com segunda, 14/09, como
cenário mais provável. Como os nove itens acima não existem, o prazo depende
de eles serem construídos antes — e do retorno do checklist.

## Etapa 15 — Documentos no R2 e preparo para a nuvem ⬜

**Fora das 140h contratadas.** Nasce da mudança de 05/10/2026: o sistema vai
para a nuvem (Vercel + Neon) e a etapa 14 fica só como referência. Plano
completo, com decisões de desenho e fases, em
[`plano-armazenamento-r2.md`](plano-armazenamento-r2.md).

Resolve o limite de ~4,5 MB por requisição da Vercel (envio e download direto
entre navegador e bucket), move o freio de login para o banco e monta backup
fora do provedor.

| # | Fase | Horas | Estado |
| --- | --- | --- | --- |
| 1 | Driver `s3` e configuração | ~3h | ✅ |
| 2 | Envio em três passos (preparar → enviar → confirmar) | ~6h | ✅ |
| 3 | Download por redirecionamento | ~1h | ✅ |
| 4 | Limpeza de envios abandonados (cron) | ~1h | ✅ |
| 5 | Freio de login no banco | ~2h | ✅ |
| 6 | Migração de `ArquivoBlob` para o bucket | ~2h | ✅ script pronto; roda na homologação depois da fase 7 |
| 7 | Infraestrutura (contas da AJA, buckets, CORS, domínio) | ~2h | ⬜ |
| 8 | Backup diário para outro provedor | ~2h | ✅ pronto; liga quando houver as contas da AJA |
| 9 | Validação em homolog e documentação | ~2h | ⬜ |

### Feito em 05/10/2026 (fases 1 a 5)

- **Driver `s3`** (`src/lib/storage/s3.ts`): URL assinada de envio com tipo e
  tamanho na assinatura, link de download de 5 minutos com nome e tipo
  forçados, `HEAD` para conferir o que chegou. Checksum automático do SDK
  desligado (`WHEN_REQUIRED`) — ligado, a URL assinada exige um CRC32 que o
  navegador não manda.
- **Envio em três passos**: `prepararEnvio` → `PUT` → `confirmarEnvio`, com
  `cancelarEnvio` quando a tela desiste. Tabela `EnvioPendente` sem chave
  estrangeira, de propósito (a limpeza precisa achar os arquivos mesmo com a
  obra apagada). Barra de progresso no botão.
- **Um fluxo só para os três drivers**: sem bucket, a tela envia para
  `PUT /envios/[id]`, que grava aos pedaços. A rota fica **fora do `matcher`
  do proxy** — o proxy guarda só os primeiros 10 MB do corpo, sem erro.
- **Download**: com bucket, `302` para o link assinado, depois de conferir
  que o arquivo existe; sem bucket, como antes.
- **Limpeza**: `GET /api/cron/limpar-envios`, diária às 03h (Brasília) pelo
  `vercel.json`, exige `CRON_SECRET`.
- **Freio de login** na tabela `FreioLogin`, com a linha travada
  (`FOR UPDATE`) a cada falha. A regra continua pura em `throttle.ts`.
- **`serverActions.bodySizeLimit` saiu** (voltou ao 1 MB padrão): nenhuma
  action recebe arquivo, e 320 MB para toda action era porta aberta na
  internet.
- Trazidos da `prod`, com o mesmo texto, para o merge não conflitar: caminho
  do documento com barra normal, `dist` fora do `tsconfig` e
  `turbopackIgnore` no driver de disco.

**Verificado:** 350 testes, tipagem, lint e `next build`. Contra o banco
local: arquivo de 40 MB gravado aos pedaços pela rota com hash igual ao do
`shasum` e o processo em ~180 MB; corpo maior que o autorizado interrompido
sem deixar arquivo parcial; 20 senhas erradas em paralelo terminam
bloqueadas (sem a trava, o contador ficaria em 1); `/envios/` e
`/api/cron/` respondem 401 sem passar pelo proxy.

**Verificado pela tela, logado, com o driver `disco` (05/10/2026):** PDF de
49 KB; PDF de 40 MB com a porcentagem subindo no botão (6% → 96%, com o
envio limitado a 8 MB/s) e o hash no banco igual ao do arquivo original;
dois arquivos de uma vez; `.dwg` recusado com a mensagem de engenharia;
download do arquivo de 40 MB íntegro, com o tipo e o nome certos; envio
derrubado no meio e confirmação derrubada, as duas com mensagem na janela e
sem sobrar autorização nem arquivo; limpeza diária apagando um envio vencido
e o arquivo dele (e recusando chamada sem segredo ou com segredo errado);
freio barrando a 6ª senha errada.

**Corrigido no teste:** se a conexão caísse durante uma das Server Actions do
envio (preparo ou confirmação), a exceção escapava e a página inteira
quebrava ("This page couldn't load"). Agora vira mensagem na janela, e a
confirmação que falha tenta cancelar o envio.

**Verificado contra o Cloudflare R2 (05/10/2026, bucket `aja-obras-dev`):**
o R2 **aplica o `Content-Length` e o `Content-Type` assinados** — corpo
maior que o autorizado e tipo diferente voltam 403 sem gravar nada; o
objeto sem assinatura não abre (bucket privado). Pela tela: PDF de 49 KB e
de 40 MB enviados direto ao bucket (o servidor só vê as duas actions, nenhum
`PUT`), porcentagem subindo no botão, sem erro de CORS; o download responde
com redirecionamento para o R2 e o arquivo chega íntegro (hash igual ao
original), com tipo e nome — inclusive acentuado — corretos.

**Nota para a fase 6:** documentos gravados antes com outro driver (disco ou
`ArquivoBlob`) passam a responder 410 quando o ambiente troca para `s3`,
até a migração copiar os arquivos para o bucket.

### Fase 6 — feito em 05/10/2026

`npm run storage:migrar` copia `ArquivoBlob` para o bucket com a mesma chave,
sem apagar nem sobrescrever nada; simula por padrão. Roteiro da virada em
[`plano-armazenamento-r2.md`](plano-armazenamento-r2.md), fase 6.

**Ensaiado contra o R2** (bucket `aja-obras-dev`), com o banco local montado
como a homologação — 30 documentos em `ArquivoBlob`, um já no bucket, um
conflito e um órfão: a simulação classificou os quatro casos sem gravar; a
execução copiou os 30 (38,6 MB) conferindo MD5 contra ETag, recusou o
conflito sem sobrescrever (saída com código 1) e pulou o órfão; a segunda
execução não copiou nada. Com o sistema em `STORAGE_DRIVER=s3`, documentos
antigos abriram pelo bucket com hash igual ao gravado no banco, inclusive o
de 40 MB.

### Fase 8 — feito em 05/10/2026

Backup diário em [`backup.md`](backup.md): `scripts/backup/backup.sh`
(dump cifrado + cópia dos documentos para o Backblaze B2) chamado pelo
workflow `backup.yml` às 04h, e `scripts/backup/restaurar-banco.sh`.
**Ensaiado de ponta a ponta** contra o bucket de desenvolvimento no lugar do
B2 — backup, restauração num banco vazio com as mesmas contagens, documentos
idênticos (`rclone check`), trava da auditoria restaurada, senha errada
recusada. Para ligar: contas da AJA (B2, token só de leitura do R2, usuário
só de leitura no Neon), segredos no GitHub e o workflow na branch padrão —
o GitHub só agenda a partir dela.
