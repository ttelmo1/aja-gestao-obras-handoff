# 07 — Painel, farol, auditoria e relatórios

Valida [requisitos.md 1.3, 1.8 e 1.9](../requisitos.md). Regras em
[`src/modules/farol/regras.ts`](../../src/modules/farol/regras.ts),
[`src/modules/obras/filtros.ts`](../../src/modules/obras/filtros.ts),
[`src/modules/auditoria/`](../../src/modules/auditoria/) e
[`src/modules/relatorios/`](../../src/modules/relatorios/).

**Pré-requisito:** os arquivos 01 a 06 concluídos — o painel só faz sentido com
dados dentro.

## Farol

O farol é sobre **a obra inteira**, e **basta um critério** para acender
(confirmado com o engenheiro em 07/09/2026). Três faixas mais o cinza.

Limites **provisórios** hoje:

| Critério | Amarelo | Vermelho |
|---|---|---|
| Prazo contratual | faltam ≤ 30 dias | vencido |
| Processo parado num setor | ≥ 15 dias | ≥ 30 dias |
| Execução atrás do prazo | ≥ 10 p.p. | ≥ 25 p.p. |

- [ ] **PNL-01** As 4 obras do seed demo acendem as 4 cores: `001` verde,
  `002` amarelo, `003` vermelho, `004` cinza.
- [ ] **PNL-02** Obra sem ordem de início, em Planejamento → **cinza**, motivo
  "Sem ordem de início."
- [ ] **PNL-03** Obra **Cancelada** → cinza, "Obra cancelada."
- [ ] **PNL-04** Obra **Finalizada** → verde, mesmo com prazo vencido.
- [ ] **PNL-05** Obra **Paralisada** → vermelho, "Obra paralisada."
- [ ] **PNL-06** Ajustar o término previsto para daqui a 20 dias → amarelo,
  "Faltam 20 dia(s) para o término previsto."
- [ ] **PNL-07** Término previsto para ontem → vermelho, "Prazo vencido há 1
  dia(s)."
- [ ] **PNL-08** Movimento aberto há 20 dias ([TRA-22](04-tramitacao.md)) →
  amarelo por processo parado.
- [ ] **PNL-09** Movimento aberto há 35 dias → vermelho.
- [ ] **PNL-10** Obra com metade do prazo decorrido e 20% de execução (30 p.p.
  atrás) → vermelho por execução atrasada.
- [ ] **PNL-11** Obra **amarela por prazo e vermelha por processo parado ao
  mesmo tempo** → o cartão mostra **vermelho**, e o motivo exibido é o do pior
  nível (o processo parado), não o primeiro da lista.
- [ ] **PNL-12** Abrir a obra → todos os motivos aparecem, não só o principal.
  O usuário precisa saber por que a luz está vermelha.
- [ ] **PNL-13** Obra sem nenhum problema → verde, "Dentro do prazo e sem
  pendências."
- [ ] **PNL-14** Fechar o movimento aberto de uma obra vermelha → ela muda de
  cor **sem** ninguém salvar farol nenhum (o farol é calculado, nunca
  persistido).
- [ ] **PNL-15** 🎯 **Calibração com o cliente na apresentação** (item 1 da
  etapa 12): com a tela aberta, perguntar os números reais —
  - dias de antecedência do término que já é atenção (hoje 30);
  - dias parado num setor até atenção / até crítico (hoje 15 / 30);
  - quantos pontos percentuais de atraso na execução (hoje 10 / 25).
  Anotar as respostas; ajustar é editar `LIMITES_PROVISORIOS`.
- [ ] **PNL-16** 🎯 Perguntar também: o rótulo "Não avaliada" para o cinza faz
  sentido para eles? Ele cobre dois casos (sem ordem de início e cancelada).

## Painel e indicadores

- [ ] **PNL-20** **Sem internet:** desconectar a máquina da rede externa (ou
  bloquear no firewall) e navegar por tudo — painel, obra, upload, download. O
  servidor do cliente é offline; nenhuma fonte, ícone ou script pode vir de
  CDN. Conferir a aba Network das DevTools: nenhuma requisição para fora.
- [ ] **PNL-21** Os indicadores do topo batem com a contagem manual: obras em
  andamento, valor contratado, valor medido, processos parados, medições
  atrasadas.
- [ ] **PNL-22** "Valor contratado" agregado considera os aditivos aprovados
  ([RER-22](06-rerratificacoes.md)).
- [ ] **PNL-23** Obras canceladas e finalizadas **não** contam como "em
  andamento".
- [ ] **PNL-24** "Processos parados" conta os movimentos em aberto — bate com o
  que foi criado em [04](04-tramitacao.md).
- [ ] **PNL-25** "Medições atrasadas" bate com [MED-32](03-medicoes.md).
- [ ] **PNL-26** Cada cartão mostra última e próxima medição, farol e o motivo
  em uma linha.

### Filtros

- [ ] **PNL-30** Buscar pelo **código** da obra → encontra.
- [ ] **PNL-31** Buscar pelo **objeto** (texto parcial, com acento) → encontra.
- [ ] **PNL-32** Buscar por **número do contrato** → encontra.
- [ ] **PNL-33** Buscar por **protocolo** → encontra.
- [ ] **PNL-34** Filtrar por **operador** → reduz corretamente.
- [ ] **PNL-35** Filtrar por **contratante** → idem.
- [ ] **PNL-36** Filtrar por **situação** (status da obra) → idem.
- [ ] **PNL-37** Filtrar por **farol vermelho** → só as vermelhas. Como o farol
  é calculado e não é coluna, conferir na mão que nenhuma escapou.
- [ ] **PNL-38** Combinar farol + operador → os dois aplicam juntos.
- [ ] **PNL-39** Editar a URL com valor inválido (`?farol=ROXO`) → vira "sem
  filtro", nunca erro de tela.
- [ ] **PNL-40** Limpar os filtros → volta a lista completa, e a URL limpa.
- [ ] **PNL-41** Busca sem resultado → estado vazio com mensagem.
- [ ] **PNL-42** Painel em ~768px → os cartões empilham, os indicadores
  continuam legíveis, sem rolagem horizontal na página.

## Auditoria e histórico

A trilha é **append-only**: ninguém edita, ninguém apaga.

- [ ] **PNL-50** `/auditoria` lista os eventos das sessões anteriores deste
  roteiro, do mais recente para o mais antigo.
- [ ] **PNL-51** Cada linha tem **autor, data/hora e descrição** (requisito 1.8).
- [ ] **PNL-52** Criar, editar e excluir uma obra → os três eventos aparecem,
  com o tipo de ação distinto.
- [ ] **PNL-53** Uma edição mostra **o que mudou** (valor antes/depois), não só
  "obra editada".
- [ ] **PNL-54** Trocar o valor contratado de `R$ 1.000.000,00` para
  `R$ 1.200.000,00` → o log mostra os dois valores formatados em pt-BR, não
  `1000000` e `1200000`.
- [ ] **PNL-55** Ações de medição, tramitação, documento, rerratificação,
  usuário e cadastro **todas** geram registro. Percorrer uma de cada.
- [ ] **PNL-56** Login e falha de login aparecem na trilha? Registrar — se não
  aparecem, é achado de LGPD/rastreabilidade para discutir. 🎯
- [ ] **PNL-57** Filtrar por **ação** → reduz corretamente.
- [ ] **PNL-58** Filtrar por **entidade** → idem.
- [ ] **PNL-59** Filtrar por **usuário** → idem.
- [ ] **PNL-60** Filtrar por **período** (de/até) → o dia escolhido entra
  inteiro. Um evento das 23h de hoje aparece no filtro "até hoje" — é a
  armadilha de fuso, conferir com atenção.
- [ ] **PNL-61** Aplicar um filtro e ir para a **página 2** → o filtro
  sobrevive à paginação e o intervalo de datas **não desliza um dia**.
- [ ] **PNL-62** Com mais de 50 eventos, a paginação aparece e funciona nos dois
  sentidos.
- [ ] **PNL-63** Não existe nenhum botão de editar ou apagar evento de
  auditoria, em nenhum perfil — nem para o administrador.
- [ ] **PNL-64** ⚠️ Tentar apagar um registro direto pelo `npm run db:studio` →
  o trigger do banco recusa. Se passar, é achado grave.
- [ ] **PNL-65** A aba **Histórico** dentro da obra mostra só os eventos daquela
  obra, com o mesmo nível de detalhe.
- [ ] **PNL-66** Excluir um documento e conferir que ele sumiu da tela mas
  **continua** no histórico ([DOC-46](05-documentos.md)).

## Relatórios

> **Estado:** a **mecânica** de exportação (XLSX e PDF) está pronta e testada;
> **o conteúdo dos relatórios e a tela `/relatorios` ainda não existem** —
> dependem da 1ª reunião (ponto #10 de
> [`../pontos-para-reuniao.md`](../pontos-para-reuniao.md), etapa 11 🟡).
> Os casos abaixo validam a mecânica e preparam a conversa.

- [ ] **PNL-70** `npm test` passa inteiro (os 36 casos de relatório inclusos).
- [ ] **PNL-71** Gerar um XLSX de exemplo pelo módulo e abrir **no Excel real**
  (não só num visualizador) → abre limpo, sem aviso de formato.
- [ ] **PNL-72** Na planilha, uma célula de dinheiro é **número com formato de
  moeda**, não texto — clicar nela e conferir que o Excel soma.
- [ ] **PNL-73** Uma célula de data é data de verdade (ordena por data, não por
  texto).
- [ ] **PNL-74** Somar a coluna de valores no Excel → bate com a linha de
  totais do relatório.
- [ ] **PNL-75** Gerar o PDF equivalente e abrir → acentuação correta
  ("Adequação Elétrica – Unidade Norte"), cabeçalho repetido a cada página,
  paginação no rodapé, totais uma vez só.
- [ ] **PNL-76** Os **filtros aplicados** aparecem impressos no cabeçalho do PDF
  e da planilha — relatório de obra pública circula fora do sistema.
- [ ] **PNL-77** Relatório **sem nenhuma linha** → arquivo válido com aviso, não
  arquivo corrompido.
- [ ] **PNL-78** PDF e XLSX do mesmo relatório mostram **os mesmos números**.
- [ ] **PNL-79** 🎯 **Levar à reunião** (ponto #10): quais relatórios o cliente
  precisa? Sugestões para ancorar a conversa —
  - obras por situação/farol, com valor contratado × medido;
  - medições de um período, com protocolo, NF e ISS;
  - processos parados por setor, com dias de permanência;
  - rerratificações por obra, com percentual acumulado.
- [ ] **PNL-80** 🎯 Perguntar também: quem pode exportar? (hoje todos os perfis
  — ver [ACS-48](01-acesso.md))

## Fechamento da sessão

- [ ] **PNL-90** Nenhuma tela mostrou stack trace, erro 500 ou tela em branco.
- [ ] **PNL-91** Vocabulário consistente entre as telas — a mesma situação tem o
  mesmo nome em todo lugar (item 3 da etapa 12).
- [ ] **PNL-92** Nenhum `console.error` no navegador ao percorrer o caminho
  principal.
- [ ] **PNL-93** `npm run typecheck` e `npm run lint` limpos.
- [ ] **PNL-94** Achados transcritos no [README](README.md#registro-de-achados),
  com gravidade.
- [ ] **PNL-95** Perguntas 🎯 transcritas para
  [`../pontos-para-reuniao.md`](../pontos-para-reuniao.md).
- [ ] **PNL-96** [`../etapas-e-status.md`](../etapas-e-status.md) atualizado com
  o resultado da sessão (etapa 12, item 2).
