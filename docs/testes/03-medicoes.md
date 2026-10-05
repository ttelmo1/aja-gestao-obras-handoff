# 03 — Medições e financeiro

Valida [requisitos.md 1.4](../requisitos.md). Regras em
[`src/modules/medicoes/`](../../src/modules/medicoes/) — cálculos em
[calculos.ts](../../src/modules/medicoes/calculos.ts), ritmo em
[periodicidade.ts](../../src/modules/medicoes/periodicidade.ts).

**Pré-requisito:** uma obra de valor conhecido. Sugestão: criar
`OBR-TESTE-001` com **valor contratado R$ 1.000.000,00**, mensal, ordem de
início há 100 dias, prazo de 200 dias. Os números abaixo assumem isso.

## Cálculos financeiros

- [ ] **MED-01** Obra sem nenhuma medição → medido `R$ 0,00`, saldo a medir
  `R$ 1.000.000,00`, % medido `0,00%`, % executado `0,00%`.
- [ ] **MED-02** Lançar medição 1: valor `R$ 250.000,00`, executado `25%` →
  medido `R$ 250.000,00`, saldo `R$ 750.000,00`, % medido `25,00%`.
- [ ] **MED-03** Lançar medição 2: valor `R$ 150.000,00`, executado `40%` →
  medido `R$ 400.000,00`, saldo `R$ 600.000,00`, % medido `40,00%`,
  **% executado `40%`** — o executado é acumulado, então vale o maior
  informado, não a soma (não pode dar 65%).
- [ ] **MED-04** Lançar medição 3 com executado `35%` (menor que a anterior,
  simulando erro de digitação) → o % executado da obra **continua 40%**.
  Confirmar com o cliente se é isso, ou se o sistema deve recusar retrocesso. 🎯
- [ ] **MED-05** Excluir a medição 2 → todos os agregados recalculam na hora.
  Nenhum número fica preso no valor antigo.
- [ ] **MED-06** Valor com centavos quebrados (`R$ 33.333,33` três vezes) →
  o total é `R$ 99.999,99`, não `R$ 100.000,00` nem `99999,990000001`.
- [ ] **MED-07** Medir **acima do saldo** (medição de `R$ 900.000,00` numa obra
  com `R$ 600.000,00` de saldo) → observar. O sistema barra, avisa ou aceita
  em silêncio? Saldo a medir negativo na tela é achado. 🎯
- [ ] **MED-08** Valor medido `0` → "O valor medido precisa ser maior que zero."
- [ ] **MED-09** Valor medido negativo → recusa.
- [ ] **MED-10** Percentual executado `150` → recusa (fora de 0–100).
- [ ] **MED-11** Percentual executado `-5` → recusa.

## ISS e nota fiscal

- [ ] **MED-12** Preencher nota fiscal (número, data, valor) e alíquota de ISS
  `5%` sobre base `R$ 100.000,00` → ISS calculado `R$ 5.000,00`.
- [ ] **MED-13** Deixar a alíquota vazia → ISS `R$ 0,00`, sem erro. Sem
  alíquota, sem imposto.
- [ ] **MED-14** Alíquota `2,5%` → `R$ 2.500,00`. Decimal na alíquota funciona.
- [ ] **MED-15** Valor da nota fiscal negativo → recusa.
- [ ] **MED-16** Salvar medição **sem** nota fiscal → aceita (a NF chega depois
  do protocolo, na prática).

## Numeração e período

- [ ] **MED-17** Criar a primeira medição → número sugerido `1`.
- [ ] **MED-18** Criar mais duas → `2` e `3`.
- [ ] **MED-19** Excluir a medição `3` e criar outra → o número sugerido é `4`,
  **não** `3`. Número que já circulou em protocolo não volta.
- [ ] **MED-20** Forçar o número `1` numa segunda medição da mesma obra → "Já
  existe uma medição com esse número nesta obra."
- [ ] **MED-21** Duas obras diferentes podem ter, cada uma, a medição `1`.
- [ ] **MED-22** Período com início depois do fim → "O início do período não
  pode ser depois do fim."
- [ ] **MED-23** Deixar a data do boletim vazia → a competência faz as vezes
  dela na ordenação da lista.

## Status da medição

Sequência prevista: Rascunho → Protocolada → Aprovada → Paga (ou Rejeitada).

- [ ] **MED-24** Salvar como **Protocolada** sem número de protocolo → recusa
  com a mensagem sobre o processo precisar ser encontrado no órgão.
- [ ] **MED-25** O formulário não oferece **Paga** na situação, nem o campo de
  data do pagamento. Medição já paga mostra "Paga em dd/mm/aaaa", fixo.
- [ ] **MED-25a** Na lista, medição **Protocolada** ou **Aprovada** mostra
  "Marcar como paga"; clicar abre a data (hoje), confirmar → situação **Paga**
  e a data na coluna Pagamento. Rascunho e Rejeitada não mostram o botão.
- [ ] **MED-25b** Data do pagamento depois de hoje → "A data do pagamento não
  pode ser depois de hoje."
- [ ] **MED-25c** "Desfazer" numa medição paga → volta para **Aprovada**, sem
  data. Os dois passos aparecem na aba Histórico.
- [ ] **MED-25d** Editar e salvar uma medição **Paga** (mudar a observação,
  por exemplo) → a data do pagamento continua lá.
- [ ] **MED-25e** A caixa do filtro diz **"Pagamento pendente"** e a faixa de
  indicadores mostra o valor e a quantidade de medições pendentes.
- [ ] **MED-26** Excluir medição em **Rascunho** → apaga.
- [ ] **MED-27** Excluir medição **Protocolada** → recusa, orientando a marcar
  como Rejeitada.
- [ ] **MED-28** Excluir medição que tem documento anexado → recusa citando a
  quantidade de documentos.
- [ ] **MED-29** ⚠️ **Achado conhecido (etapa 12, item 4):** pegar uma medição
  **Paga**, editá-la de volta para **Rascunho**, e então excluí-la. Hoje isso
  passa — dois passos contornam a trava do MED-27. Registrar o que acontece: é
  a máquina de estados que a etapa 12 vai desenhar.
- [ ] **MED-30** Pular direto de **Rascunho** para **Paga** → não é mais
  possível: o botão só aparece a partir de Protocolada (24/09/2026).

## Periodicidade e "próxima medição"

- [ ] **MED-31** Obra mensal, última medição há 10 dias → a tela mostra a
  próxima vencendo em ~20 dias, dentro do prazo.
- [ ] **MED-32** Obra mensal, última medição há 45 dias → aparece como
  **atrasada**, e ela entra no indicador "Medições atrasadas" do painel
  ([07](07-painel-e-relatorios.md)).
- [ ] **MED-33** Trocar a obra para **Quinzenal** → a próxima medição recalcula
  para 15 dias, sem precisar mexer nas medições.
- [ ] **MED-34** Trocar para **Semanal** → 7 dias.
- [ ] **MED-35** Obra **sem nenhuma medição** e com ordem de início → a tela diz
  o que vai acontecer (primeira medição pendente), não mostra "próxima" em
  branco nem uma data de 1970.
- [ ] **MED-36** Obra em Planejamento, sem ordem de início → não cobra medição
  atrasada. O relógio ainda não começou.
- [ ] **MED-37** Obra Personalizada com intervalo de 45 dias → a próxima medição
  respeita os 45 dias.

## Lista e apresentação

- [ ] **MED-38** A lista de medições ordena por número/data de forma estável e
  legível.
- [ ] **MED-39** Cada linha mostra protocolo, NF e status — o requisito 1.4 pede
  os três associados.
- [ ] **MED-40** Abrir uma medição de outra obra pela URL (trocar o `id` da obra
  mantendo o `medicaoId`) → "Medição não encontrada nesta obra."
- [ ] **MED-41** Todo dinheiro na tela em `R$ 0.000,00` e todo percentual com
  vírgula. Nenhum ponto decimal escapando.
- [ ] **MED-42** Em ~768px, a tabela de medições rola dentro dela mesma, sem
  empurrar a página inteira para o lado.
- [ ] **MED-43** **Responsável pela medição** é campo de texto, digitado na
  própria medição — não há mais seletor nem cadastro por trás (21/09/2026). O
  nome digitado aparece na coluna "Responsável" da lista.
