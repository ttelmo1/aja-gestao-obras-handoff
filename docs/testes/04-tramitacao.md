# 04 — Tramitação de processos

Valida [requisitos.md 1.5 `[AJUSTADO]`](../requisitos.md). Regras em
[`src/modules/tramitacao/`](../../src/modules/tramitacao/) — sequência fixa em
[fluxo.ts](../../src/modules/tramitacao/fluxo.ts), tempo de permanência em
[movimentos.ts](../../src/modules/tramitacao/movimentos.ts).

**Pré-requisito:** a obra `OBR-TESTE-001` de [03](03-medicoes.md), e os 7
setores do seed demo.

## Fluxo fixo

A sequência é sempre esta, para qualquer contratante:

1. Busca em plataforma de licitação
2. Habilitação / classificação / homologação
3. Assinatura de contrato
4. Garantia
5. Ordem de início
6. Execução da obra
7. Medições
8. Rerratificação
9. Finalização
10. Aceite
11. Atestado

- [ ] **TRA-01** Abrir a aba Tramitação de uma obra recém-criada → as **11
  etapas** já existem, na ordem acima, todas Pendentes.
- [ ] **TRA-02** A ordem é a mesma em uma obra de outro contratante. Não há
  configuração de fluxo por órgão, e **não deve haver** — é decisão de escopo.
- [ ] **TRA-03** Não existe nenhuma tela de "criar etapa" ou "reordenar etapas".
  Se existir, é escopo indevido.
- [ ] **TRA-04** A faixa do fluxo mostra visualmente o estado de cada etapa:
  concluída em verde, atual em navio, pendente apagada.

## Status da etapa

- [ ] **TRA-05** Marcar uma etapa como **Em andamento** → muda de cor na faixa.
- [ ] **TRA-06** Marcar como **Concluída** sem data de conclusão → "Etapa
  concluída precisa da data de conclusão."
- [ ] **TRA-07** Concluir com data **anterior** ao início da etapa → "A conclusão
  não pode ser anterior ao início da etapa."
- [ ] **TRA-08** Concluir com data válida → vira verde na faixa.
- [ ] **TRA-09** Marcar a etapa **Garantia** como **"Não se aplica"** → ela
  continua **visível** na faixa, riscada e em cinza — não some. O usuário
  precisa saber que foi dispensada, não esquecida.
- [ ] **TRA-10** Tentar registrar entrada numa etapa "Não se aplica" → "Esta
  etapa está marcada como não se aplica. Reative-a antes de tramitar o processo."
- [ ] **TRA-11** Reativar a etapa (voltar para Pendente) → volta a aceitar
  movimento.
- [ ] **TRA-12** Registrar um movimento numa etapa e **depois** tentar marcá-la
  como "Não se aplica" → recusa citando a quantidade de movimentos. O histórico
  não pode dizer que o processo passou por uma etapa que nunca existiu.
- [ ] **TRA-13** Apagar os movimentos e então marcar "Não se aplica" → aceita.

## Movimentos (entrada e saída por setor)

- [ ] **TRA-20** Registrar entrada na etapa "Assinatura de contrato", setor
  **Protocolo**, data de hoje → aparece na linha do tempo, em aberto.
- [ ] **TRA-21** A etapa mostra "há 0 dias no Protocolo" (ou equivalente), não
  um campo vazio.
- [ ] **TRA-22** Registrar entrada com data de **20 dias atrás** → a tela mostra
  "há 20 dias", e a obra passa a **amarela** no painel (limite de alerta: 15
  dias parado).
- [ ] **TRA-23** Registrar entrada com data de **35 dias atrás** → "há 35 dias",
  e a obra fica **vermelha** (limite crítico: 30 dias).
- [ ] **TRA-24** Registrar a saída do setor → o movimento fecha, os dias param
  de contar, e a obra **deixa de ser cobrada** por processo parado.
- [ ] **TRA-25** Tentar registrar saída num movimento já fechado → "Este
  movimento já tem saída registrada."
- [ ] **TRA-26** Saída com data **anterior** à entrada → observar. Dias de
  permanência negativos na tela são achado. ⚠️
- [ ] **TRA-27** Encadear três movimentos (Protocolo → Engenharia →
  Controladoria), cada um com entrada e saída → a linha do tempo mostra os três
  em ordem, com os dias de cada um.
- [ ] **TRA-28** O total de dias da etapa é a soma dos movimentos, e o "maior
  tempo parado" aponta o pior setor, não o último.
- [ ] **TRA-29** Excluir um movimento **com documento anexado** → recusa citando
  a quantidade de documentos.
- [ ] **TRA-30** Remover o documento e excluir o movimento → apaga, e o cálculo
  de dias recalcula.
- [ ] **TRA-31** Registrar entrada num setor **desativado** → ele não aparece no
  seletor.

## A etapa Medições é diferente

Cada medição tramita sozinha, com protocolo próprio.

- [ ] **TRA-40** Tentar registrar um movimento direto na etapa **Medições** pela
  aba Tramitação → recusa: "A tramitação da etapa de medições é feita medição a
  medição, pela aba Medições."
- [ ] **TRA-41** Tramitar duas medições diferentes por setores diferentes, ambas
  em aberto → a faixa do fluxo mostra a etapa Medições com **o pior caso** (a
  parada há mais tempo), e indica que há mais de um processo aberto.
- [ ] **TRA-42** Fechar a medição mais antiga → o "pior caso" passa a ser a
  outra, não some.
- [ ] **TRA-43** O `diasParado` que alimenta o farol da obra vem do pior caso
  entre **todos** os processos abertos, não só do último movimento.

## Percurso completo (integração)

O caso que a etapa 12 pede: uma obra do começo ao fim.

- [ ] **TRA-50** Numa obra nova, percorrer as 11 etapas em ordem — entrada,
  saída e conclusão em cada uma —, marcando Garantia e Rerratificação como
  "não se aplica".
- [ ] **TRA-51** Ao fim, todas as etapas estão concluídas ou dispensadas, e a
  faixa está inteira verde/cinza, sem etapa presa em "atual".
- [ ] **TRA-52** Marcar a obra como Finalizada → farol verde, sem cobrança de
  processo parado.
- [ ] **TRA-53** A aba Histórico ([07](07-painel-e-relatorios.md)) registrou cada
  um desses passos, com autor e data/hora.
- [ ] **TRA-54** Em ~768px, a faixa de 11 etapas continua navegável (rolagem
  horizontal só nela).
