# 06 — Rerratificações (aditivos contratuais)

Valida [requisitos.md 1.7 `[AJUSTADO]`](../requisitos.md). Regras em
[`src/modules/rerratificacoes/calculos.ts`](../../src/modules/rerratificacoes/calculos.ts).

**Pré-requisito:** obra `OBR-TESTE-001` com **valor contratado original de
R$ 1.000.000,00** e as medições de [03](03-medicoes.md).

## Escopo: impacto agregado, não item a item

- [ ] **RER-01** O formulário pede **percentual alcançado e valor impactado**,
  não uma lista de itens alterados. O detalhamento vive na planilha Excel que
  vai ao órgão — decisão `[AJUSTADO]` do requisito 1.7.
- [ ] **RER-02** Não existe tela de "adicionar item da rerratificação". Se
  existir, é escopo indevido.
- [ ] **RER-03** É possível anexar a planilha Excel de origem à rerratificação,
  e ela aparece na central de documentos com origem "Rerratificação 01"
  ([DOC-24](05-documentos.md)).

## Cadastro e validações

- [ ] **RER-10** Criar rerratificação 1: valor impactado `R$ 100.000,00`,
  status **Em elaboração** → salva.
- [ ] **RER-11** Salvar com valor impactado zerado **e** sem prazo adicional →
  recusa: "uma rerratificação que não muda nem valor nem prazo não altera o
  contrato."
- [ ] **RER-12** Salvar com valor zerado **mas** com 60 dias de prazo adicional
  → **aceita**. Prorrogação sem custo é aditivo comum e legítimo.
- [ ] **RER-13** Status **Protocolada** sem número de protocolo → "A partir de
  Protocolada, a rerratificação precisa do número do protocolo."
- [ ] **RER-14** Numeração: a segunda rerratificação sugere `2`; excluir a `2` e
  criar outra sugere `3`.
- [ ] **RER-15** Forçar um número já usado na mesma obra → "Já existe uma
  rerratificação com esse número nesta obra."
- [ ] **RER-16** Excluir rerratificação **Em elaboração** → apaga.
- [ ] **RER-17** Excluir rerratificação **Protocolada** → recusa, orientando a
  marcar como Rejeitada.
- [ ] **RER-18** Excluir uma que tem documento anexado → recusa citando a
  quantidade.
- [ ] **RER-19** Abrir pela URL uma rerratificação de outra obra → "Rerratificação
  não encontrada nesta obra."

## Efeito no contrato — só a aprovada conta

- [ ] **RER-20** Com a rerratificação de `R$ 100.000,00` **Em elaboração**, o
  valor contratado atual continua `R$ 1.000.000,00`. Ela aparece à parte, como
  expectativa ("em andamento"), **não** somada.
- [ ] **RER-21** Passar para **Protocolada** → ainda não soma. Continua
  expectativa.
- [ ] **RER-22** Passar para **Aprovada** → o valor contratado atual vira
  `R$ 1.100.000,00`, o saldo a medir cresce em `R$ 100.000,00` e o % medido
  recalcula sobre a nova base.
- [ ] **RER-23** Passar para **Rejeitada** → o valor volta para
  `R$ 1.000.000,00`. Nada fica preso.
- [ ] **RER-24** Aprovada com **prazo adicional de 60 dias** → o término
  previsto da obra considera os 60 dias, e o farol reage (obra que estava
  amarela por prazo pode voltar ao verde).
- [ ] **RER-25** Duas aprovadas (`R$ 100.000,00` + `R$ 50.000,00`) → valor atual
  `R$ 1.150.000,00`, e o prazo adicional soma as duas.
- [ ] **RER-26** **Supressão**: rerratificação aprovada de `-R$ 200.000,00` →
  o valor atual **cai** para `R$ 800.000,00`. Valor negativo é aceito de
  propósito.
- [ ] **RER-27** Supressão que deixa o valor atual **abaixo do já medido** →
  observar o saldo a medir. Negativo na tela precisa de rótulo, não de um
  número vermelho sem explicação. ⚠️
- [ ] **RER-28** Conferir no banco (`npm run db:studio`) que `Obra.valorAditivado`
  bate com a soma das aprovadas — é cache, e cache que desanda é achado grave.
- [ ] **RER-29** Editar o valor de uma rerratificação **já aprovada** → o cache
  acompanha na hora.

## Limite legal de 25%

Lei 14.133/2021, art. 125. O sistema usa **alerta, não trava** — quem decide
se o caso é de 50% (reforma de edifício) é o jurídico do cliente.

- [ ] **RER-30** Aprovar acréscimo de `R$ 200.000,00` sobre o original de
  `R$ 1.000.000,00` (20%) → **sem alerta**.
- [ ] **RER-31** Aprovar mais `R$ 60.000,00` (26% acumulado) → **alerta
  visível**, e o registro salva assim mesmo.
- [ ] **RER-32** O percentual acumulado é calculado sobre o valor **original**
  (`R$ 1.000.000,00`), não sobre o já aditivado. Conferir na mão: 26%, não
  algo menor.
- [ ] **RER-33** **Supressão de 40%** (`-R$ 400.000,00`) → **também alerta**. A
  lei fala em acréscimos *e* supressões; o alerta compara em módulo.
- [ ] **RER-34** Acréscimo de 30% e supressão de 10% na mesma obra, ambos
  aprovados → o acumulado é **20%**, sem alerta. É a variação líquida que conta.
- [ ] **RER-35** 🎯 Mostrar o alerta ao cliente na apresentação e perguntar: o
  limite deve virar **trava** para algum perfil? E o caso de 50% deve ser um
  campo por obra? (ponto #17 de [`../pontos-para-reuniao.md`](../pontos-para-reuniao.md))
- [ ] **RER-36** 🎯 Com o cliente: o alerta deve aparecer também no painel, ou
  só dentro da obra?

## Integração com a tramitação

- [ ] **RER-40** A etapa **Rerratificação** do fluxo fixo existe em toda obra e
  pode ser marcada "não se aplica" quando não houver aditivo ([TRA-09](04-tramitacao.md)).
- [ ] **RER-41** Numa obra com rerratificação aprovada, a etapa correspondente
  aceita movimentos normalmente.
- [ ] **RER-42** Cada mudança de status da rerratificação aparece na aba
  Histórico, com autor e data/hora.
