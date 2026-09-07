# Etapas e Status da Implementação

Andamento do desenvolvimento. Atualizar ao concluir cada etapa.

- **Contrato:** R$ 10.000,00 / 140h (R$70/h), 4 parcelas.
- **Orçado por módulo:** 143h (folga negativa de 3h — ver
  [`escopo-e-orcamento.md`](escopo-e-orcamento.md)).
- **Última atualização:** 07/09/2026 — etapas 7, 8 e 10 concluídas e a
  mecânica dos relatórios pronta. As respostas do engenheiro em 07/09
  (ponto #1 e #10 de [`pontos-para-reuniao.md`](pontos-para-reuniao.md))
  **destravaram as etapas 9 e 11**.

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
   momentos diferentes.
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
