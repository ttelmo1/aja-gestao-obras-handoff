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
| 0.2 | Identidade visual herdada do mockup | — | ✅ | — |
| 1 | Auth + RBAC | 12h | ✅ | 0 |
| 2 | Cadastros base (contratante, responsável, setor) | ~3h | ✅ | 1 |
| 3 | Auditoria — camada de gravação | ~3h | 🔵 | 0 |
| 4 | CRUD de obras + dashboard/filtros | 15h | ✅ | 2, 3 |
| 5 | Medições + cálculos financeiros | 18h | ✅ | 4 |
| 6 | Tramitação (fluxo fixo) | 30h | ⬜ | 4 |
| 7 | Gestão documental | 24h | ⬜ | 4, 5, 6 |
| 8 | Rerratificações | 8h | ⬜ | 7 |
| 9 | Motor do farol | 6h | 🔵 | 5, 6 |
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

## Etapa 6 — Tramitação ⬜

**Escopo:** registro de entrada e saída por setor no fluxo fixo dos
requisitos (1.5), com etapas marcáveis como "não se aplica" e cálculo do
tempo de permanência. Preenche a aba Tramitação e destrava dois pendentes:

- o indicador **"Processos parados"** do painel, hoje exibindo `—`;
- o critério **dias parado** do farol, que já existe em
  `modules/farol/regras.ts` mas recebe `null` de todos os chamadores.

**Pré-requisitos já resolvidos:** enum `TipoEtapa` com as onze etapas na
ordem, modelo `EtapaObra` e os 7 setores criados pelo seed base.

