# Revisão de código — fase de fechamento

Revisão do que já foi dado como pronto (etapas 0–10). Relatórios (etapa 11)
ficou **fora** por ainda estar em andamento.

- **Data:** 07/09/2026
- **Branch:** `fase-3`
- **Base do projeto:** 17 commits, ~12.700 linhas de TS/TSX próprias
  (fora `src/generated/prisma`), 123 arquivos.

## Como a revisão foi dividida

| Onda | Alvo | Quem | Status |
|---|---|---|---|
| 0 | typecheck, lint, testes | local | ✅ |
| 1 | dinheiro, medições, rerratificações, obras, auditoria, schema | local | ✅ (com lacunas) |
| 2 | sessão, permissões, login, storage | local | ✅ |
| 3 | documental, rerratificações, auditoria, relatórios, farol | `/code-review ultra` | ✅ |

A divisão não é arbitrária: o merge-base de `fase-3` com `main` é `665252a`,
então o bundle do branch que o ultra revisa cobre só as etapas 7–11. Auth,
cadastros, obras, medições e tramitação já estavam em `main` e ficaram com a
revisão local.

## Onda 0 — verificação automática

```
npm run typecheck   ✅ limpo
npm run lint        ✅ limpo
npm test            ✅ 236 testes, 55 suítes, 0 falhas
```

## Achados

### Alta

#### 1. Excluir movimento de tramitação apaga documentos em cascata ✅

`src/app/(app)/obras/[id]/tramitacao/acoes.ts:369-390`

`excluirMovimento` não verifica documentos vinculados antes do `delete`. Como
`Documento.movimento` tem `onDelete: Cascade` (`prisma/schema.prisma:472`), a
linha do documento é apagada de verdade — o que contraria o design de exclusão
lógica (`Documento.excluidoEm`), deixa o arquivo órfão em `STORAGE_DIR` e não
gera registro de auditoria para os documentos perdidos.

O contraste confirma que é descuido, não decisão: `excluirMedicao`
(`medicoes/acoes.ts:239`) e `excluirObra` (`obras/acoes.ts:221`) **ambos**
bloqueiam com `_count.documentos > 0`. Só a tramitação ficou sem a trava.

> **Ressalva (onda 3), já resolvida.** Essas duas travas não serviam como
> padrão a copiar: o achado 12 mostra que a contagem delas não filtrava
> `excluidoEm`. Os três guards foram corrigidos em 07/09/2026, então replicar
> o padrão na tramitação agora é seguro.
>
> **Decidido (07/09/2026) e implementado.** A correção é *bloquear* a exclusão
> do movimento enquanto houver documento vivo anexado, espelhando
> `excluirMedicao`/`excluirObra` — não apagar os documentos em cascata. Mantém
> um só modelo de exclusão no sistema. O `onDelete: Cascade` do schema fica
> como está: agora ninguém chega nele. Conferido que a trava não vira beco sem
> saída — o card "Documentos da etapa" da aba Tramitação lista os anexos dos
> movimentos com botão de excluir, e todo perfil que pode apagar movimento
> (`tramitacao:excluir`) também pode apagar documento.

**Como reproduzir:** anexar um documento a um movimento de tramitação, excluir
o movimento, conferir que a linha em `Documento` sumiu e o arquivo continua em
disco.

#### 2. `x-forwarded-for` é confiado sem proxy reverso na frente ✅

`src/lib/sessao.ts:41-42`, `src/app/(auth)/acoes.ts:44`

Duas consequências:

- **Auditoria falsificável.** Qualquer cliente escolhe o IP que fica gravado no
  log — é dado forense controlado por um header.
- **Freio de login contornável.** A chave do throttle é `` `${email}|${ip}` ``.
  Rotacionando o header, o atacante tem 5 tentativas *por IP forjado*, e IPs
  forjados são infinitos. A proteção contra força bruta cai com uma linha de
  `curl`.

O comentário no código reconhece que numa rede local não há CDN, mas tira a
conclusão invertida: se não há proxy reverso, o header não deveria ser lido.

> **Decidido (07/09/2026) e implementado.** Ignorar o header e
> passar a chave do freio a ser só o e-mail; o `ip` fica nulo. Verificado que
> não há alternativa melhor: o projeto roda `next start`, sem custom server nem
> middleware, e o app router do Next 16 não expõe o IP da conexão — `headers()`
> é tudo o que existe. Ou seja, o IP nunca foi confiável, não é o que
> identifica o autor (toda linha grava `usuarioId` autenticado por sessão), e
> só aparece em tela num ponto, que já trata o nulo com "origem desconhecida"
> (`usuarios/[id]/page.tsx:72`). Efeito colateral aceito: com a chave só por
> e-mail, dá para travar o login de um colega por 5 minutos errando a senha.
> Reabrir se a visita técnica disser que haverá proxy reverso — ver ponto #11.
>
> Efeito colateral da implementação: `throttle.ts` saiu de `lib/` para
> `modules/auth/`. Tinha `import "server-only"`, que estoura no runner, e por
> isso o freio nunca teve teste — agora tem quatro, incluindo o de que travar
> uma conta não trava as outras. É a observação estrutural desta revisão
> resolvida num ponto: o que não dá para testar onde está, muda de lugar.

### Média

#### 3. Limite legal não detecta supressão ✅

`src/modules/rerratificacoes/calculos.ts:100`

```ts
excedeLimite: pct.gt(LIMITE_ACRESCIMO_PERCENTUAL)
```

O comentário acima da constante diz corretamente que a Lei 14.133/2021 art. 125
permite *"acréscimos e supressões de até 25%"*, e o tipo documenta
`valorAprovado` como "Pode ser negativo (supressão)". Mas uma supressão de −40%
produz `pct = -40`, e `-40 > 25` é falso: nenhum alerta é emitido.

**Corrigido (07/09/2026)** com `pct.abs().gt(LIMITE_ACRESCIMO_PERCENTUAL)`.

A tela precisou acompanhar: o alerta dizia "os aditivos aprovados somam X%", o
que com supressão sairia como "somam -40%, acima do limite". Agora o texto
troca conforme o sinal e mostra o módulo, e o indicador "Acréscimo acumulado"
virou "Variação acumulada" — ele já exibia negativo antes, contradizendo o
próprio rótulo.

Fica registrada uma premissa: o sistema passa a tratar o teto de 25% como
válido para os dois lados, que é o que a lei diz. A pergunta 3 do
[ponto #17](pontos-para-reuniao.md) ("supressão também tem limite de 25% na
prática do cliente?") continua sem resposta — se a resposta for não, é remover
o `abs`.

#### 4. Status da medição não tem máquina de estados ⏭️ etapa 12

`src/app/(app)/obras/[id]/medicoes/acoes.ts:234`

`excluirMedicao` corretamente recusa apagar o que não é `RASCUNHO`, com a
justificativa de que medição protocolada virou processo no órgão. Mas
`salvarMedicao` aceita qualquer transição de status, inclusive
`PAGA → RASCUNHO`. Dois passos (editar para rascunho, depois excluir) contornam
a trava inteira. A auditoria registra os dois passos, o que atenua, mas a regra
que o código diz proteger não está protegida.

**Adiado para a etapa 12 por decisão (07/09/2026).** Não é conserto pontual:
exige desenhar quais transições de status são válidas, e isso encosta na
pergunta de quem pode reabrir uma medição já protocolada. Cabe junto do item 2
da etapa 12 (testes de integração ponta a ponta), que é onde o percurso
completo da medição vai ser exercitado.

### Baixa

Todos corrigidos em 07/09/2026, numa passada só.

5. ✅ **`dinheiroOpcional` aceita valor negativo.** `notaFiscalValor` e
   `issValor` não tinham o `refine(gt(0))` que `valorMedido` e
   `valorContratado` têm. **Corrigido** com `dinheiroOpcionalPositivo`, novo em
   `campos.ts`. O `dinheiro` comum continua aceitando negativo: a
   rerratificação depende disso para supressão (ver achado 3).
6. ✅ **`diasEntre` usa o fuso do servidor.** Metade espelhada do achado 14.
   **Corrigido** reduzindo cada ponta ao dia civil em Brasília com o
   `dataParaIso` criado lá. Fecha o par: nenhum código de data depende mais do
   `TZ` do processo.
7. ✅ **Data inválida vira `null` em silêncio.** **Corrigido** — agora é erro
   de validação. Ao escrever o teste apareceu um caso pior que o relatado:
   `new Date("2026-02-30")` não estoura, rola para 02/03. Ou seja, data
   impossível não virava `null`, virava *outro dia*, calada. `dataDoCampo`
   agora confere se o que voltou é o que foi digitado.
8. ✅ **Sem limite de dígitos para `Decimal(15,2)`.** **Corrigido** em
   `normalizarDinheiro`, com `DIGITOS_INTEIROS_DINHEIRO = 13` — o valor absurdo
   agora vira "Valor inválido." no formulário, não erro 500.
9. ✅ **`revalidatePath` inconsistente nas medições.** **Corrigido** nos três
   pontos, com `(`/obras/${obraId}`, "layout")`, que é o que as
   rerratificações já faziam. Medição mexe no cabeçalho e no farol da obra, não
   só na aba.
10. ✅ **O `Map` do throttle nunca é limpo.** **Corrigido** com janela
    deslizante (`JANELA_MS`) e limpeza dos vencidos a cada falha registrada. O
    vazamento de memória era o menor dos problemas: sem decaimento, quatro
    senhas erradas em janeiro somavam com a quinta em março e bloqueavam quem
    não tinha errado nada. O arquivo agora é `src/modules/auth/throttle.ts`.

## Observação estrutural

Os 236 testes eram todos unitários puros, sobre funções de `src/modules/`. Nada
exercita rota, Server Action, RBAC ou banco. Não é coincidência que **os
achados 1, 2 e 4 estejam todos em `src/app/`** — é exatamente a faixa que os
testes não alcançam. A etapa 12 ("ajustes, integração e testes") é o lugar
natural para fechar isso.

## O que está bem

Vale registrar, porque foi verificado e não é pouco:

- Camada de sessão sólida: token opaco com HMAC, verificação no banco a cada
  requisição, revogação imediata ao desativar usuário ou trocar perfil.
- `storage.ts` trata path traversal e nunca usa o nome de arquivo enviado pelo
  navegador; a pasta fica fora de `public/`.
- Auditoria sem FK, com trigger append-only — bem pensada, e a razão está
  escrita no schema.
- Todos os `onDelete: Cascade` do schema estão no lugar.
- O login compara hash mesmo sem usuário, para a tela não virar verificador de
  e-mails.

## Lacunas desta revisão

Não foi coberto, e continua em aberto:

- **Tramitação, parcial.** `fluxo.ts` e `excluirMovimento` foram lidos;
  `movimentos.ts` e o restante de `acoes.ts` (~420 linhas) não.
- **Cadastros, zero.** 68 linhas, menor risco do projeto, mas não foi olhado.
- **`/security-review` não foi executado.** A leitura de segurança foi manual.
- **Relatórios, fora de escopo** por decisão — etapa 11 ainda em andamento.
  (O ultra vai cobri-lo de qualquer forma, já que `0b826a9` está em `fase-3`;
  triar e descartar se ainda for mudar.)

## Achados do `/code-review ultra`

Onda 3, concluída em 07/09/2026. Cinco achados, nenhum duplicando os acima; a
numeração continua a da lista local. Todos foram conferidos no código antes de
entrar aqui.

**Situação:** 11 a 14 corrigidos em 07/09/2026, com `typecheck`, `lint` e os
239 testes passando em `TZ=UTC`, `America/Sao_Paulo`, `Asia/Tokyo` e
`America/Los_Angeles`. O 15 segue aberto por decisão (área da etapa 11).

Numa segunda rodada, no mesmo dia, foram corrigidos os dois achados **Alta**
da revisão local (1 e 2) — cada um com a decisão registrada na sua seção.
A suíte foi a 243 testes.

Numa terceira rodada, ainda em 07/09/2026, foi corrigido o achado 3 e o 4 foi
adiado para a etapa 12, por decisão. Suíte em 245 testes. **Continuam
abertos:** 5 a 10 (Baixa), o 15 (nit) e o 4 (agendado).

Numa quarta rodada, ainda em 07/09/2026, foram corrigidos os seis achados de
**Baixa** (5 a 10). Suíte em 251 testes, verde em `TZ=UTC`,
`America/Sao_Paulo` e `Asia/Tokyo`. **Continuam abertos:** só o 15 (nit, à
espera da etapa 11) e o 4 (agendado para a etapa 12).

### Média

#### 11. Aba Histórico visível para perfis sem permissão de auditoria ✅

`src/app/(app)/obras/[id]/historico/page.tsx:36`, `src/app/(app)/obras/[id]/abas.tsx:11-19`

A página exige `auditoria:ver`, mas a matriz só concede `auditoria: LEITURA` a
ADMINISTRADOR e GESTOR (`permissoes.ts:56-73`), e a barra de abas renderiza as
sete para qualquer um que abra a obra. OPERACIONAL e VISUALIZADOR clicam em
Histórico e caem em `/sem-permissao`.

É regressão da etapa 10: enquanto a página era placeholder ela pedia
`obra:ver`, que todo perfil tem. O docstring na linha 29 afirma que a matriz dá
leitura de auditoria "a todos os perfis" — descreve uma matriz que nunca foi
implementada.

**Duas decisões separadas.** Filtrar as abas por `pode()`, como
`(app)/layout.tsx:36` já faz com `NAVEGACAO`, é correção de navegação e vale
sob qualquer matriz. Se auditoria deve ser legível por todos os perfis é
questão de produto — pertence ao [ponto #3](pontos-para-reuniao.md) da reunião.

**Corrigido.** Cada aba passou a declarar seu recurso e a barra esconde o que o
perfil não abre; o layout repassa o perfil que `exigirPermissao` já devolvia.
O docstring que descrevia a matriz errada foi reescrito. A pergunta de produto
foi para o ponto #3 — hoje OPERACIONAL e VISUALIZADOR não veem a aba.

#### 12. Contagem de documentos não filtra exclusão lógica ✅

`src/app/(app)/obras/[id]/rerratificacoes/acoes.ts:223`,
`src/app/(app)/obras/[id]/medicoes/acoes.ts`

O guard usa `_count: { select: { documentos: true } }`, sem `where`. Documento
soft-deleted continua bloqueando a exclusão, mas não aparece em lista nenhuma
(`carregarDocumentos` filtra `excluidoEm: null`) e `excluirDocumento` recusa
re-excluir. O registro fica impossível de apagar pela interface, com uma
mensagem que aponta para anexos que o usuário não consegue ver.

O padrão certo já existe no próprio projeto: `dados.ts:92` e `dados.ts:185`
usam `documentos: { where: { excluidoEm: null } }`. Ver a ressalva no achado 1 —
a mesma correção cobre medição, obra e rerratificação, e é pré-requisito para
fechar a tramitação.

**Corrigido** nos três guards de uma vez. `excluirObra` tinha o mesmo defeito,
não citado pelo ultra: contava `documentos` sem filtro junto com medições e
rerratificações. Com isso, a trava que o achado 1 vai replicar na tramitação
já está correta.

#### 13. Rollback do upload em lote apaga arquivos já comitados ✅

`src/app/(app)/obras/[id]/documentos/acoes.ts:127-169`

Cada arquivo grava em disco e cria sua linha em sua **própria** `$transaction`,
mas todos os caminhos se acumulam em `salvos`. Se a terceira iteração falhar
(ENOSPC, queda do banco), o `catch` apaga os arquivos das duas primeiras, cujas
transações já comitaram: sobram linhas em `Documento` apontando para arquivos
que não existem, e o download responde 410 permanente.

É exatamente o modo de falha que o comentário das linhas 88-90 diz evitar —
"linha órfã no banco vira botão de download quebrado na tela".

**Corrigido**, mas não como o relatório sugeria. Envolver o loop inteiro numa
transação colocaria a gravação em disco dentro dela, e o timeout padrão do
Prisma é de 5 s — com o limite de corpo em 320 MB, um lote grande passaria a
falhar por timeout. A ordem ficou: grava todos os arquivos, depois abre uma
transação só para todas as linhas. O `catch` continua apagando tudo que foi
gravado, e agora isso está certo — se a transação falha, nenhuma linha existe.

### Baixa

14. ✅ **Paginação alarga o filtro de data em um dia.**
    `src/modules/auditoria/filtros.ts:112-113` serializa com `toISOString()`
    (UTC) o que a linha 35 leu como `23:59:59` local. Em `TZ=America/Sao_Paulo`,
    `ate=07/09` vira `ate=08/09` no link "Mais antigos" — e mais um dia a cada
    clique, silenciosamente, em `/auditoria` e na aba Histórico. Ver a nota
    sobre fuso abaixo. **Corrigido** com `dataParaIso`/`isoParaInstante` em
    `lib/date-br.ts`, usados nas duas pontas — o parse também estava preso ao
    `TZ` do processo, não só a serialização. `campoData` saiu de
    `filtros-auditoria.tsx` e virou chamada ao mesmo helper. Três testes novos
    cobrem a ida e volta pela URL, e a suíte roda em quatro fusos.
15. **Indicador "Autores" conta usuários cadastrados.**
    `src/app/(app)/auditoria/page.tsx:67` usa `usuarios.length`
    (`findMany` sem `where`), ao lado de "Registros no filtro", que é sensível
    ao filtro. Ou renomear o rótulo, ou trocar por `groupBy` em `usuarioId`.
    Fica em área da etapa 11, ainda em andamento — triar depois que ela fechar.
    **Aberto por decisão.**

### Como isso muda a lista local

- **Achado 1.** A ressalva registrada lá: as travas de medição e obra, citadas
  como o comportamento correto, carregam o defeito do achado 12.
- **Achado 6, espelhado.** O 6 erra se o servidor rodar em UTC; o 14 erra se
  rodar em `America/Sao_Paulo`. São o mesmo defeito de dois lados — qualquer
  que seja o fuso da instalação, um dos dois dispara. Tratar como um item só:
  nenhum código de data deve depender do `TZ` do processo. `campoData()`
  (`components/ui/filtros-auditoria.tsx:128`) já tem a técnica correta e
  merece virar helper em `lib/date-br.ts` — feito na correção do 14, que
  criou `dataParaIso`. **O achado 6 continua aberto:** `diasEntre` ainda usa
  `getFullYear/getMonth/getDate`, e agora tem o helper pronto ao lado para
  usar.
- **Observação estrutural, reforçada.** Os achados 11, 12 e 13 também estão em
  `src/app/`. Somando os locais 1, 2 e 4, são seis de seis fora do alcance dos
  236 testes unitários — o argumento para o item 2 da etapa 12 (testes de
  integração) ficou mais forte, não menos.
