# 02 — Obras e cadastros base

Valida [requisitos.md 1.2](../requisitos.md). Regras em
[`src/modules/obras/`](../../src/modules/obras/) e
[`src/modules/cadastros/`](../../src/modules/cadastros/).

**Pré-requisito:** [01-acesso.md](01-acesso.md) concluído. Logado como
administrador.

## Cadastros base

### Contratante

- [ ] **OBR-01** Criar contratante com CNPJ numérico válido → salva, e o CNPJ
  aparece com máscara na listagem.
- [ ] **OBR-02** CNPJ com dígito verificador errado → recusa.
- [ ] **OBR-03** CNPJ com 13 dígitos → recusa.
- [ ] **OBR-04** CNPJ `11.111.111/1111-11` (sequência repetida) → recusa. Passa
  no módulo 11, mas não existe na Receita.
- [ ] **OBR-05** CNPJ **alfanumérico** válido (formato obrigatório desde
  jul/2026, ex.: 12 primeiros caracteres com letras + 2 dígitos) → aceita. É
  novidade recente; se o cliente ainda digita só numérico, confirmar se a
  máscara do campo atrapalha. 🎯
- [ ] **OBR-06** Digitar o CNPJ com pontuação e sem pontuação → os dois entram e
  ficam gravados no mesmo formato.
- [ ] **OBR-07** Editar contratante → a mudança aparece na obra que o usa.
- [ ] **OBR-08** Excluir contratante **em uso** por uma obra → recusa
  explicando que ele está em uso e sugerindo desativar.
- [ ] **OBR-09** Desativar contratante em uso → some da lista de seleção da
  obra nova, mas a obra existente continua mostrando o nome dele.
- [ ] **OBR-10** Excluir contratante **sem vínculo** → apaga.

### Setor

> O **cadastro de responsáveis saiu** em 21/09/2026, a pedido da Fernanda: o
> nome de quem assina a medição é digitado na própria medição (MED-43). Os
> antigos OBR-11 e OBR-12 deixaram de existir.

- [ ] **OBR-11** `/cadastros` abre com duas abas — Contratantes e Setores — e
  `/cadastros/responsaveis` não existe mais.
- [ ] **OBR-13** Criar setor com sigla → aparece nas opções de tramitação
  (verificar em [04-tramitacao.md](04-tramitacao.md)).
- [ ] **OBR-14** Excluir setor que já recebeu um movimento → recusa.
- [ ] **OBR-15** Desativar setor → some do seletor de destino da tramitação,
  mas os movimentos antigos continuam nomeando-o.

## CRUD de obras

### Criação

- [ ] **OBR-20** Abrir `/obras/nova` com o campo de código vazio → o sistema
  **sugere** `OBR-2026-001` (ou o próximo do ano).
- [ ] **OBR-21** Salvar a obra e abrir uma nova → a sugestão avançou para `-002`.
- [ ] **OBR-22** Apagar a obra `-002` e abrir outra nova → a sugestão é `-003`,
  **não** volta para `-002`. Código que já circulou em papel não se repete.
- [ ] **OBR-23** Digitar um código próprio (`CONTRATO-99/2026`) → aceita. O
  padrão é sugestão, não imposição.
- [ ] **OBR-24** Criar obra com um código que já existe → "Já existe uma obra
  com esse código."
- [ ] **OBR-25** Valor contratado `0` → "O valor contratado precisa ser maior
  que zero."
- [ ] **OBR-26** Valor contratado negativo → recusa.
- [ ] **OBR-27** Valor com centavos (`1.234.567,89`) → salva e exibe idêntico,
  sem arredondar e sem virar `1234567.89` na tela.
- [ ] **OBR-28** Ordem de início **anterior** à assinatura do contrato → "A
  ordem de início não pode ser anterior à assinatura do contrato."
- [ ] **OBR-29** Periodicidade "Personalizada" sem preencher o intervalo em
  dias → recusa com a mensagem sobre não saber quando a próxima medição vence.
- [ ] **OBR-30** Periodicidade "Personalizada" com intervalo `0` ou negativo →
  recusa.
- [ ] **OBR-31** Salvar sem contratante → recusa com mensagem de campo
  obrigatório (não erro genérico).
- [ ] **OBR-32** Criar obra em Planejamento, sem ordem de início → salva, e o
  farol dela fica **cinza** no painel.

### Prazo

- [ ] **OBR-33** Preencher ordem de início + prazo em dias, deixando a data
  prevista de término vazia → o sistema deriva o término
  (`ordem de início + prazo`). Conferir a data na mão.
- [ ] **OBR-34** Corrigir a data prevista de término à mão → o valor digitado
  prevalece. Suspensão de prazo **não** deve mais ser feita assim — tem
  registro próprio (OBR-37a em diante).
- [ ] **OBR-35** Obra com prazo em dias mas **sem** ordem de início → a tela não
  inventa uma data de término nem mostra 0% de prazo transcorrido.
- [ ] **OBR-36** Obra com término previsto **anterior** à ordem de início →
  observar o que a tela faz. Não pode mostrar percentual negativo nem quebrar. ⚠️
- [ ] **OBR-37** Na obra `OBR-DEMO-003` (prazo vencido), a barra/percentual de
  prazo passa de 100% e é rotulada como vencida, sem travar em 100%.

### Suspensão de prazo (24/09/2026)

- [ ] **OBR-37a** Aba Contrato → "Suspensões de prazo": lançar uma suspensão
  com início e **sem** data final → aparece "em aberto", com os dias em curso.
  O cartão do painel e a aba Resumo mostram "Prazo suspenso desde dd/mm".
- [ ] **OBR-37b** Voltar no dia seguinte (ou mudar a data do sistema) → dias
  restantes, percentual de prazo e dias para a próxima medição **não mudam**;
  o término vigente e a próxima medição andam um dia.
- [ ] **OBR-37c** Preencher a data final → o prazo volta a contar a partir
  dela, de onde parou. O término vigente mostra "+N dia(s) de suspensão".
- [ ] **OBR-37d** Obra com medição quase vencendo, suspensa → ela **não** fica
  vermelha por medição vencida enquanto estiver suspensa, nem entra em
  "Medições atrasadas".
- [ ] **OBR-37e** Lançar uma segunda suspensão que cruza a primeira → recusa
  por sobreposição. Uma que começa no dia em que a outra termina → aceita.
- [ ] **OBR-37f** Suspensão antes da ordem de início, ou com data final igual
  ou anterior ao início → recusa com a mensagem certa.
- [ ] **OBR-37g** Editar e excluir uma suspensão → os dias saem do término; os
  três passos aparecem na aba Histórico.

### Edição e exclusão

- [ ] **OBR-38** Editar o objeto da obra → muda no painel e no cabeçalho da obra.
- [ ] **OBR-39** Editar o valor contratado de uma obra que já tem medições → os
  agregados (saldo a medir, % medido) recalculam na hora.
- [ ] **OBR-40** Excluir obra **com** medições/documentos/rerratificações →
  recusa citando a quantidade de registros vinculados e sugerindo cancelar
  pelo campo de situação.
- [ ] **OBR-41** Cancelar a obra pelo campo de situação → o farol vira **cinza**
  e ela sai dos indicadores de "em andamento".
- [ ] **OBR-42** Criar obra nova, sem nada vinculado, e excluí-la → apaga, e o
  evento aparece na auditoria ([07](07-painel-e-relatorios.md)).
- [ ] **OBR-43** Marcar obra como Finalizada → farol **verde**, mesmo que o
  prazo tenha vencido.
- [ ] **OBR-44** Marcar obra como Paralisada → farol **vermelho**, com o motivo
  "Obra paralisada."

## Tela da obra

- [ ] **OBR-45** As abas aparecem na ordem do mockup: Resumo · Contrato ·
  Medições · Tramitação · Rerratificações · Documentos · Histórico.
- [ ] **OBR-45b** As abas somem conforme o perfil (cada uma é gateada pelo seu
  recurso): o Operacional não vê Histórico, por exemplo — ver
  [ACS-43](01-acesso.md).
- [ ] **OBR-46** Trocar de aba mantém o contexto da obra (código e objeto no
  cabeçalho, sem recarregar tudo).
- [ ] **OBR-47** Recarregar direto numa aba interna (colar a URL) → abre na aba
  certa.
- [ ] **OBR-48** Abrir uma obra com ID inexistente → "Obra não encontrada.",
  não erro 500.
- [ ] **OBR-49** Em ~768px de largura, as abas não estouram a tela (rolagem
  horizontal só dentro da faixa de abas, nunca no corpo da página).
- [ ] **OBR-50** Datas e dinheiro em pt-BR em toda a tela — `07/09/2026`,
  `R$ 1.234.567,89`. Nenhum `2026-09-07` ou `1234567.89` escapando.
