# Pontos para a Reunião de Validação

Decisões que assumimos para não travar o desenvolvimento, a confirmar com o
cliente junto da demonstração do MVP. Cada ponto traz **o que assumimos**, **o
que custa mudar** e **onde mexer** — para a resposta do cliente virar ajuste
imediato, não retrabalho.

Ordenados por custo de mudar, do mais caro para o mais barato.

- **Status:** `🔴 aberto` · `🟡 assumido, a confirmar` · `🟢 confirmado`
- **Última atualização:** 07/09/2026

## Índice

| # | Ponto | Status | Custo de mudar |
|---|---|---|---|
| 1 | Critérios de cor do farol — escopo e cores confirmados, limites em aberto | 🟡 | Baixo |
| 2 | Upload de DWG/RVT | 🔴 | Baixo a alto |
| 3 | Permissões por perfil | 🟡 | Baixo |
| 4 | Obra ↔ contrato é 1:1 | 🟢 | ~~Alto~~ — resolvido |
| 5 | Percentual executado é digitado | 🟡 | Médio |
| 6 | Setores de tramitação | 🟡 | Baixo |
| 7 | Numeração de medições e rerratificações | 🟡 | Médio |
| 8 | Exclusão de registros | 🟡 | Médio |
| 9 | Retenções além do ISS | 🔴 | Médio |
| 10 | Conteúdo dos relatórios — público e layout confirmados | 🟡 | Médio |
| 11 | Forma de instalação no servidor | 🔴 | Médio |
| 12 | Recuperação de senha sem servidor de e-mail | 🟡 | Baixo |
| 13 | Periodicidade da medição e o que conta como atrasada | 🟡 | Baixo |
| 14 | Consórcio: contrato com duas empresas | 🟡 | Baixo |
| 15 | Contratos de manutenção não são obras — parcela fixa em Nilópolis | 🟡 | Baixo |
| 16 | Onde a tramitação mora: por medição ou por etapa | 🟡 | Médio |
| 17 | Limite legal de acréscimo contratual | 🟡 | Baixo |

---

## 1. Critérios exatos de cada cor do farol 🟡

Declarado em aberto nos próprios requisitos (seção 3).

> **Confirmado pelo engenheiro em 07/09/2026 — escopo e cores.**
>
> **O farol é sobre a obra inteira**, não sobre prazo de medição: *"o indicador
> em vermelho é pra ter qualquer problema, qualquer um destes — porque aí chama
> a atenção e o responsável trabalha em cima"*. A leitura do mockup fica
> descartada, e o motor de três critérios combinados, com o pior valendo, está
> certo como foi construído.
>
> **Três faixas mais o cinza**, com os papéis que já usávamos: amarelo é
> atenção, vermelho é gravidade e urgência, cinza é status neutro para obra
> ainda não iniciada. O laranja sai de cena.
>
> **O que ele não respondeu foram os números.** "Qualquer problema" define a
> lógica — basta um critério acender —, não os limites. Os 30 dias de
> proximidade do término, os 15/30 dias parado e os 10/25 p.p. de atraso
> físico continuam sendo suposição nossa.

**Assumimos** — três critérios combinados, valendo sempre o pior:

| Critério | 🟡 Atenção | 🔴 Crítico |
|---|---|---|
| Proximidade do término previsto | faltam ≤ 30 dias | prazo vencido |
| Processo parado no mesmo setor | ≥ 15 dias | ≥ 30 dias |
| Avanço físico atrás do tempo decorrido | ≥ 10 p.p. | ≥ 25 p.p. |

Mais: obra paralisada é sempre 🔴; finalizada é 🟢; sem ordem de início fica
⚪ cinza (sem dados), não verde.

**O mockup sugeria outra coisa — descartado em 07/09/2026**, registrado aqui
porque explica por que o motor não foi simplificado. Os três faróis de
`docs/raw/mockup.html` são legendados *"Próxima medição dentro do prazo"*,
*"Medição próxima"* e *"Medição vencida"* — ali o farol mede **prazo de
medição**, um critério só, e não a saúde geral da obra. O cliente quis o
oposto do que o mockup sugeria — e o mockup, aqui, é o documento velho.

O mockup também usa **verde, laranja e vermelho**; nosso enum tem verde,
amarelo, vermelho e cinza. O amarelo fica, e o laranja pode ser aposentado:
são três faixas mais o cinza, confirmadas.

**Ainda perguntar — na apresentação, com a tela aberta:**

1. Os limites da tabela acima fazem sentido na prática? Não se responde no
   abstrato: mostrar uma obra vermelha na demo e perguntar *"esta está
   vermelha porque faltam 20 dias para o término — está certo?"*.
2. Faltou algum critério — garantia vencendo, por exemplo?
3. **Risco a levantar em voz alta:** com "qualquer problema acende vermelho" e
   limites frouxos, o painel vira uma parede de vermelho e perde exatamente a
   função que ele descreveu, a de chamar atenção. É argumento para calibrar os
   números olhando dados reais, não para mudar a regra.

**Custo de mudar:** baixo — os limites estão isolados em
`LIMITES_PROVISORIOS`, e calibrar é editar constante. A hipótese cara (trocar
o escopo do farol) está descartada.

**Atualização (etapa 9, 07/09/2026):** o motor foi fechado com o escopo
confirmado, e o painel passou a **escrever no cartão** o motivo do alerta, não
só no hover. Nos dados de demonstração as quatro cores aparecem, e duas obras
acendem por mais de um critério — é a tela para calibrar os números na frente
do cliente.

**Atualização (etapa 6):** o critério **dias parado** entrou em operação. Ele
existia desde a etapa 0 mas recebia `null` de todos os chamadores, porque não
havia tramitação para alimentá-lo. Agora acende de verdade — e é o primeiro
critério do farol que se pode discutir com número real na tela.

**Atualização (etapa 5):** o dado que a leitura do mockup exige já existe.
`modules/medicoes/periodicidade.ts` calcula quando a próxima medição vence e
se ela está atrasada, e o painel já mostra isso em cada cartão e no indicador
"Medições atrasadas". Se o cliente confirmar que o farol é sobre prazo de
medição, virar a chave é ligar esse resultado ao motor — trabalho de minutos,
não de reescrita.
**Onde:** `src/modules/farol/regras.ts` e `src/components/ui/badge-farol.tsx`.

## 2. Upload de arquivos de engenharia (DWG/RVT) 🔴

> **Atualização (etapa 7, 07/09/2026):** o módulo documental está pronto e a
> trava continua de pé. Quem tenta enviar um `.dwg` recebe *"Formato .dwg
> ainda não liberado pelo cliente (arquivos de engenharia)"* — a mensagem diz
> o motivo em vez de fingir que o formato não existe. Liberar é trocar
> `ENGENHARIA_HABILITADA` para `true` em
> `src/modules/documentos/formatos.ts`: uma constante, sem migration.

Pendência do próprio cliente: ele ainda não decidiu se os arquivos de projeto
moram no sistema ou em outro lugar. **Não implementado**, conforme instrução.

**Assumimos:** bloqueado. A allowlist só aceita PDF, XLSX, XLS, CSV, JPG, PNG.
Quem tentar enviar um `.dwg` recebe mensagem explicando que o formato ainda não
foi liberado — em vez de um erro genérico.

**Perguntar:** os arquivos de projeto entram no sistema? Se sim, quais
extensões e qual o tamanho típico e máximo?

**Custo de mudar:** liberar o *upload* é trocar `ENGENHARIA_HABILITADA` para
`true` — uma linha, sem migration. O que pode custar caro é o que vem junto:
pré-visualização, versionamento de projeto ou controle de revisão não estão
orçados e viram escopo novo.
**Onde:** `src/modules/documentos/formatos.ts`.

## 3. Detalhamento das permissões por perfil 🟡

Declarado em aberto nos requisitos (seção 3).

**Assumimos** quatro perfis:

| Perfil | Alcance |
|---|---|
| **Administrador** | Tudo, incluindo gestão de usuários |
| **Gestor** | Tudo de obras, medições, tramitação e documentos; não gerencia usuários |
| **Operacional** | Lança medições, tramitação e documentos; obras só leitura |
| **Visualizador** | Somente leitura |

Ninguém edita ou apaga a auditoria — nem o administrador.

**Perguntar:** quatro perfis bastam? Quem na empresa cai em cada um? Existe
alguém que deva ver só as obras em que é responsável?

**Custo de mudar:** baixo enquanto for ajuste de matriz — é uma linha de
tabela em código, sem migration nem tela de administração. **Vira caro** se o
cliente quiser montar perfis pela interface: isso é tabela no banco, tela de
administração e não está orçado.
**Onde:** `src/modules/auth/permissoes.ts`.

## 4. Uma obra tem exatamente um contrato 🟢 RESOLVIDO

**Confirmado pelo engenheiro do cliente em 04/09/2026.** Era o ponto mais
caro da lista; deixa de ser risco.

**Resposta:** para cada contrato, uma obra. Não há contratos complementares,
não há lotes, e **não existe contrato guarda-chuva** cobrindo várias obras.

**Consequência:** a modelagem 1:1 está certa e passa a ser definitiva. Os
campos de contrato (`numeroContrato`, `valorContratado`, datas) continuam
colunas de `Obra`, e as medições apontam direto para a obra. Nada a mudar.

Dois assuntos novos saíram desta mesma conversa e viraram os pontos
[#14](#14-consórcio-contrato-com-duas-empresas-) e
[#15](#15-contratos-de-manutenção-não-são-obras-).

**Onde:** `prisma/schema.prisma`, model `Obra`.

## 5. O percentual executado é digitado pelo usuário 🟡

Os requisitos pedem cálculo automático de "% executado", mas avanço **físico**
não sai de dado financeiro: 40% do valor medido não significa 40% de obra
construída.

**Assumimos:** `percentualExecutado` é informado em cada medição, como número
acumulado (não incremento). O sistema calcula sozinho tudo o que é financeiro:
% medido, saldo a medir, valor contratado × medido.

**Perguntar:** quem informa o avanço físico e de onde ele sai — boletim de
medição, cronograma físico-financeiro? Ou o cliente esperava que fosse igual
ao percentual financeiro?

**Atualização (etapa 5):** o campo está no formulário de medição, obrigatório
e rotulado "Avanço físico acumulado (%)", com a dica de que é o acumulado da
obra e não o do mês. É o único número da medição que o sistema não calcula —
convém confirmar na reunião que quem lança sabe disso.

**Custo de mudar:** médio. Se vier de cronograma físico-financeiro, é
estrutura nova (itens e cronograma), fora do orçado.
**Onde:** `src/modules/medicoes/calculos.ts`, `prisma/schema.prisma`.

## 6. Setores de tramitação 🟡

O fluxo é fixo, mas os setores por onde o processo passa não estão nos
requisitos.

**Assumimos** sete, editáveis pela tela de cadastros: Protocolo, Engenharia,
Fiscalização, Controladoria, Jurídico, Financeiro, Gabinete.

**Perguntar:** essa lista bate com a realidade? Os setores são da AJA ou do
órgão contratante — ou os dois, e o processo transita entre eles?

**Custo de mudar:** baixo. É cadastro, o cliente mesmo ajusta.
**Onde:** `prisma/seed.ts`.

> A pergunta "os setores são do órgão?" tem uma implicação escondida: se cada
> contratante tiver setores próprios, `Setor` passa a depender de
> `Contratante`. Vale confirmar antes da etapa 6.

## 7. Numeração de medições e rerratificações 🟡

**Assumimos** numeração sequencial por obra (1ª, 2ª, 3ª medição), única no
banco, atribuída pelo sistema.

**Perguntar:** a numeração é sequencial simples ou segue formato do órgão
(por exemplo `MED-2026/001`)? Pode haver medição retificadora reaproveitando
o número, ou medição fora de ordem?

**Decidido na etapa 5:** o número é sugerido pelo sistema (maior já usado
mais um, não a contagem — número que já circulou em protocolo não se repete)
mas **continua editável**, porque contrato que começou fora do sistema tem
medição anterior à instalação.

**Custo de mudar:** médio — a restrição de unicidade está no banco.
**Onde:** `prisma/schema.prisma`, `@@unique([obraId, numero])`.

## 8. O que acontece ao excluir um registro 🟡

**Assumimos:**

- **Documentos:** exclusão lógica (`excluidoEm`). O arquivo some da tela, o
  registro fica para a auditoria.
- **Obras, medições, etapas:** exclusão física, em cascata. **Refinado na
  etapa 5:** só medição em *Rascunho* é apagável; a partir de *Protocolada*
  existe processo no órgão e a saída é marcá-la como *Rejeitada*.
- **Auditoria:** nunca. Trigger no banco bloqueia UPDATE e DELETE.
- **Contratantes, responsáveis e setores:** exclusão física só quando ninguém
  os referencia. Em uso, o sistema recusa e oferece desativar — some das
  listas de seleção sem reescrever o histórico de contratos já assinados.

**Perguntar:** apagar uma obra deve mesmo levar junto medições, documentos e
tramitação? Ou obra encerrada por engano deveria ser "arquivada" e
recuperável?

**Custo de mudar:** médio. Exclusão lógica em todas as entidades exige filtrar
todas as consultas do sistema — decidir agora sai bem mais barato.
**Onde:** `prisma/schema.prisma` (`onDelete`).

## 9. Retenções e tributos além do ISS 🔴

Os requisitos citam só nota fiscal e ISS.

**Assumimos** apenas ISS (alíquota e valor por medição). Sem INSS, IRRF,
retenção de garantia ou glosa.

**Implementado na etapa 5:** alíquota e valor do ISS por medição. O valor
digitado vence o calculado — a guia de recolhimento tem arredondamento
próprio, e o que vale é o papel; o cálculo (alíquota sobre o valor da nota)
só entra quando o campo fica em branco.

**Perguntar:** a medição sofre outras retenções? O cliente precisa do valor
líquido a receber, ou o bruto medido basta? A tela de medição hoje mostra
só o bruto — se houver retenções, esta é a coluna que falta no histórico.

**Custo de mudar:** médio — campos novos em `Medicao` e ajuste nos cálculos e
relatórios.
**Onde:** `prisma/schema.prisma`, `src/modules/medicoes/calculos.ts`.

## 10. Conteúdo dos relatórios 🟡

Formatos confirmados (XLS e PDF), conteúdo não.

> **Confirmado pelo engenheiro em 07/09/2026 — público e layout.**
>
> **Nada vai para o órgão.** Os relatórios são internos, *"principalmente para
> a diretoria"*; fora dela, quem olha é o Henrique.
>
> **Não existe layout obrigatório.** Sai da lista o único risco real de estouro
> das 12h orçadas: relatório tabular direto atende.
>
> **Falta o exemplo.** Ele topou mandar um relatório que monta hoje e ainda não
> mandou — é o que define as colunas. Cobrar antes da reunião.

**Assumimos** três relatórios: obras com farol e situação financeira; medições
por obra e por período; tempo de permanência por etapa e setor.

**Ainda perguntar:** o exemplo prometido; e, já sabendo que o leitor é a
diretoria, que decisão ela toma olhando o relatório — é acompanhamento de
prazo, de dinheiro a receber, ou os dois na mesma folha?

**Custo de mudar:** médio. A hipótese cara — layout obrigatório de órgão
público — está descartada; as 12h orçadas assumem relatório tabular direto, que
é o que o cliente precisa.
**Onde:** `src/modules/relatorios/`.

**Estado:** a mecânica de exportação (XLSX e PDF) já está pronta e testada —
ela não depende da resposta. O que a resposta define são as colunas e as
consultas. Vale levar um relatório impresso à reunião: é mais fácil o cliente
dizer o que falta olhando uma folha do que descrevendo do zero.

## 11. Como o sistema será instalado no servidor 🔴

O contrato diz que a instalação é *"a definir após visita técnica à
infraestrutura do cliente"* e está fora das 140h. Ainda não sabemos nem o
sistema operacional do servidor.

**Assumimos** — provisoriamente, para o desenvolvimento: PostgreSQL nativo e a
aplicação Node rodando como serviço do sistema, sem Docker. Isso segue o
espírito declarado no `CLAUDE.md`, que escolheu a stack por "menos peças
móveis" e "um único processo Node, sem serviços extras".

**Perguntar na visita técnica:**

- Qual o sistema operacional do servidor — Windows Server ou Linux?
- Quem administra a máquina, e essa pessoa tem experiência com o quê?
- Existe rotina de backup? O que ela cobre hoje?
- O servidor reinicia sozinho após queda de energia, e os serviços sobem junto?
- **O sistema vai atender em HTTP ou HTTPS?** Muda uma variável de ambiente
  (`COOKIE_SEGURO`) e não é detalhe estético: com a flag `Secure` ligada em
  servidor HTTP o navegador descarta o cookie de sessão e **ninguém consegue
  entrar**, sem erro em log nenhum. Fica `false` até haver certificado.

**Por que Docker provavelmente não é a resposta aqui**, apesar de ser o padrão
de mercado: não há manutenção inclusa após o aceite, então quem estiver no
cliente precisa religar o sistema sozinho; e o backup, que é responsabilidade
do cliente, fica menos óbvio com volumes de contêiner do que com um diretório
de dados nativo. Docker resolve reprodutibilidade — problema que não temos,
já que é uma instalação única — ao custo de uma peça a mais para o cliente
manter sem suporte.

**Custo de mudar:** médio, e não afeta o código. É retrabalho de instalação,
não de desenvolvimento. O ambiente de desenvolvimento não precisa ser igual ao
de produção: para a aplicação, a diferença é só a `DATABASE_URL`.

## 12. Recuperação de senha sem servidor de e-mail 🟡

Os requisitos pedem "recuperação de senha" (1.1), mas o sistema roda em rede
local sem internet e **não há servidor de e-mail** — o link de redefinição não
tem como ser enviado. Isso só aparece na hora de implementar.

**Assumimos** um fluxo mediado pelo administrador, que funciona offline:

1. A pessoa abre *Esqueci minha senha* e registra o pedido.
2. O pedido aparece marcado na lista de usuários, para o administrador.
3. O administrador gera um link, válido por 24 horas e de uso único, e entrega
   à pessoa pelo meio que quiser (pessoalmente, telefone, mensagem).
4. A pessoa escolhe a própria senha.

Pela mesma lógica, **usuário novo nasce sem senha**: o administrador cria o
cadastro e entrega um link. Ninguém além da própria pessoa conhece a senha
dela — nem o administrador, nem o desenvolvedor.

**Perguntar:**

- Existe servidor de e-mail interno ou conta de e-mail que o servidor alcance?
  Se existir, o envio automático é barato de acrescentar.
- Copiar e colar um link longo é aceitável para quem vai administrar o
  sistema? A alternativa é o administrador digitar uma senha provisória —
  mais simples de comunicar por telefone, e pior, porque cria uma senha que
  duas pessoas conhecem.
- Quem será o administrador do sistema no dia a dia?

**Custo de mudar:** baixo. Trocar para senha provisória digitada pelo
administrador é uma tela; ligar envio de e-mail é uma biblioteca e as
credenciais do servidor SMTP — mas envio de e-mail não está no orçamento.
**Onde:** `src/app/(app)/usuarios/acoes.ts` e `src/app/(auth)/acoes.ts`.

---

## 13. Periodicidade da medição e o que conta como atrasada 🟡

O mockup traz, na aba Contrato, um campo **"Periodicidade da medição"** com
as opções Mensal, Quinzenal, Semanal e Personalizado — e, no painel, o
indicador **"Medições atrasadas"** e os campos "Última medição" e "Próxima
medição" em cada cartão. Nenhum dos três é calculável sem essa periodicidade,
então ela virou campo da obra na etapa 5.

**Assumimos:**

- **Padrão mensal**, porque é a opção que o mockup mostra selecionada e a
  praxe em medição de contrato público.
- Mensal = **30 dias corridos**, quinzenal = 15, semanal = 7. Não é "mesmo
  dia do mês seguinte": 30 dias corridos é mais simples de explicar e não
  produz o problema do dia 31.
- O ciclo conta **da data da última medição**; sem nenhuma medição, conta da
  ordem de início.
- Obra **finalizada, cancelada, paralisada ou sem ordem de início** não tem
  medição atrasada — a pendência ali é outra, e o farol já a sinaliza pelo
  status.

**Perguntar:**

1. A periodicidade é a mesma para todos os contratos, ou varia por órgão?
   Se for sempre mensal, o campo pode sumir da tela.
2. O prazo conta da última medição feita, ou de uma data fixa do contrato
   (por exemplo, todo dia 30)?
3. Existe carência entre a ordem de início e a primeira medição? Hoje o
   sistema já cobra a primeira medição um período depois da ordem de início.
4. "Medição atrasada" é sobre **fazer** a medição, ou sobre o **processo dela
   estar parado** no órgão? São coisas diferentes, e a segunda depende da
   tramitação (etapa 6).

**Atualização (07/09/2026):** a manutenção de Nilópolis é medida em parcela
mensal fixa (ver ponto [#15](#15-contratos-de-manutenção-não-são-obras-)) — um
caso concreto a favor do padrão mensal. Ainda sem resposta se a periodicidade
varia entre os contratos de obra.

**Custo de mudar:** baixo. Tudo está em `modules/medicoes/periodicidade.ts`,
sem persistir nada calculado — mudar a regra é mudar a função.
**Onde:** `src/modules/medicoes/periodicidade.ts`, campo
`periodicidadeMedicao` em `prisma/schema.prisma`.

## 14. Consórcio: contrato com duas empresas 🟡

Levantado pelo engenheiro em 04/09/2026, ao responder o ponto #4.

**O que ele disse:** existe **um** contrato firmado em consórcio por duas
empresas, mas **só uma delas administra** — e é essa que a AJA usa no
controle. Ele disse que explica pessoalmente.

**Hoje o sistema não modela isso.** `Obra` guarda quem *contrata* (o órgão),
não quem *executa* — a empresa executora é implícita, porque o sistema é da
AJA. Num contrato em consórcio, o instrumento nomeia duas empresas e a
distinção pode aparecer em nota fiscal, protocolo e atestado.

**Perguntar:**

1. O consórcio precisa **aparecer** em algum lugar do sistema (relatório,
   atestado, capa de processo), ou é informação de bastidor?
2. A nota fiscal da medição sai pela empresa administradora sempre, ou
   alterna?
3. É um caso único ou tende a se repetir em contratos futuros?

**Custo de mudar:** baixo se for só exibição — um campo de texto opcional na
obra ("consórcio / empresa executora") resolve. Sobe se o sistema precisar
**repartir valores** entre as consorciadas, o que seria estrutura nova e está
fora do orçado.
**Onde:** `prisma/schema.prisma`, model `Obra`.

## 15. Contratos de manutenção não são obras 🟡

> **Respondido em parte em 07/09/2026 — e a preocupação muda de forma.**
>
> A manutenção do município de **Nilópolis** é medida pelo **valor do contrato
> dividido por 12**: o mesmo valor todo mês, *"tendo muita demanda ou pouca
> demanda"*. Não é contrato sob demanda, é parcela fixa.
>
> **Isso desarma o alerta falso descrito abaixo.** Se a medição é 1/12 ao mês,
> o avanço acompanha o tempo decorrido por construção: quem lançar o acumulado
> como 3/12, 4/12 nunca fica atrás do prazo. O critério de avanço físico
> funciona sozinho — sem campo `tipoContrato`, sem `if` no motor do farol.
>
> **Com uma condição:** que quem lança digite o acumulado assim. Se a pessoa
> deixar o avanço físico em 0% porque "não teve obra para medir", o alerta
> falso volta pela porta dos fundos. Isso é assunto de rótulo de formulário e
> de treinamento, não de modelagem.
>
> **Continua sem resposta:** se a manutenção entra na mesma lista das obras ou
> em uma separada, e como funciona o **segundo** contrato — ele descreveu só o
> de Nilópolis.

Levantado pelo engenheiro em 04/09/2026, na mesma conversa. Ele mencionou
**dois contratos de manutenção** e disse que "precisa ver como vai fazer",
mas que não influencia o resto.

**Concordo que não muda a modelagem — e discordo que não influencia.** Um
contrato de manutenção cabe em `Obra` sem violência: tem contratante, número,
valor, prazo e medições mensais. O problema não é onde guardar, é o que o
sistema **conclui** a partir disso:

- **"Avanço físico acumulado"** não significa a mesma coisa. Numa obra é
  quanto da construção ficou pronta; numa manutenção sob demanda é, no
  máximo, quanto do teto contratual foi consumido — e pode ser legitimamente
  baixo no meio do contrato.
- **O farol vai acusar atraso falso.** O critério "avanço físico atrás do
  tempo decorrido" (ponto #1) espera 50% de execução na metade do prazo. Um
  contrato de manutenção com pouca demanda no semestre acenderia 🔴 sem ter
  problema nenhum.
- **"Medições atrasadas"** (ponto #13) provavelmente se aplica bem, porque a
  medição de manutenção costuma ser mensal e fixa.

**Perguntar:**

1. Os contratos de manutenção devem entrar no mesmo painel das obras, ou em
   uma lista à parte?
2. Faz sentido o farol deles ignorar o avanço físico e olhar só prazo do
   contrato e medição em dia?
3. A manutenção tem medição mensal fixa ou por demanda/chamado?

**Custo de mudar:** baixo a médio. A saída provável é um campo
`tipoContrato` (obra / manutenção) que desliga um critério do farol — uma
coluna e um `if` no motor. Vira médio se o cliente quiser telas e relatórios
próprios para manutenção, o que não está no orçado.
**Onde:** `prisma/schema.prisma` e `src/modules/farol/regras.ts`.

## 16. Onde a tramitação mora: por medição ou por etapa 🟡

O requisito 1.5 `[AJUSTADO]` descreve um fluxo fixo de **11 etapas do
contrato** (busca em licitação → … → atestado), com registro de entrada e
saída por setor. O mockup mostra outra coisa: **não tem aba de tramitação**, e
o percurso pelos setores aparece dentro de cada **medição**, que tem protocolo
próprio e caminha sozinha.

**Assumimos que os dois convivem**, porque são camadas diferentes:

- As **11 etapas** são o ciclo de vida do contrato. Ganharam aba própria — o
  mockup é anterior ao requisito ajustado, e o fluxo não tinha onde morar.
- Os **movimentos entre setores** pertencem a uma etapa; na etapa de medições,
  cada movimento pertence também a uma medição específica
  (`TramitacaoMovimento.medicaoId`). É o que faz "Setor atual" e "Tempo"
  funcionarem por linha na tabela de medições, como no mockup.

**Perguntar:**

1. As outras etapas do fluxo (garantia, aceite, atestado) também tramitam
   entre setores, ou só as medições? Se só as medições, a aba Tramitação pode
   virar um acompanhamento de situação, sem percurso.
2. Rerratificação tem protocolo próprio que caminha sozinho, como a medição?
   Hoje ela é uma etapa só, sem tramitação individual.
3. Quem registra entrada e saída: alguém da AJA acompanhando o processo no
   órgão, ou existe consulta ao sistema do órgão? Isso muda a frequência com
   que os dados chegam — e, se o registro for manual e atrasado, o "há N dias
   parado" mede o atraso do registro, não o do processo.
4. A aba Tramitação faz sentido para o cliente, ou ele esperava ver tudo
   dentro da medição como no mockup?

**Custo de mudar:** médio. Tirar a aba é apagar tela. Estender a tramitação
individual a outras entidades (rerratificação, por exemplo) é repetir o que
já existe para medição — a coluna e a lógica estão prontas.
**Onde:** `src/modules/tramitacao/`, `src/app/(app)/obras/[id]/tramitacao/`,
`TramitacaoMovimento.medicaoId` em `prisma/schema.prisma`.

## 17. Limite legal de acréscimo contratual 🟡

A Lei 14.133/2021, art. 125, permite acréscimos e supressões de até **25%** do
valor original — **50%** no caso de reforma de edifício ou equipamento.

**Assumimos** 25% como **alerta, não como trava**. A tela avisa quando os
aditivos aprovados passam disso, mas deixa salvar: quem decide se o caso é de
50%, ou se há fundamento para exceder, é o jurídico do cliente.

O percentual é medido sobre o **valor original** do contrato, não sobre o já
aditivado — é assim que o limite legal é apurado.

**Perguntar:**

1. Os contratos da AJA são de obra nova (25%) ou há reforma de edifício (50%)?
   Se houver os dois, vale um campo na obra para o sistema saber qual usar.
2. O sistema deve **impedir** o registro acima do limite, ou só avisar?
3. Supressão também tem limite de 25% na prática do cliente?

**Custo de mudar:** baixo. É uma constante em
`modules/rerratificacoes/calculos.ts`; virar campo por obra é uma coluna.
**Onde:** `src/modules/rerratificacoes/calculos.ts`,
`LIMITE_ACRESCIMO_PERCENTUAL`.

---

## Pontos já resolvidos 🟢

Registrados para não voltarem à mesa:

- **Fluxo de tramitação é fixo**, não configurável por órgão. Etapas podem ser
  marcadas "não se aplica"; a ordem nunca muda.
- **Rerratificação guarda só o agregado** (percentual alcançado e valor
  impactado), sem detalhamento item a item — isso já consta na planilha
  apresentada ao órgão, que fica anexada.
- **Armazenamento 100% local**, sem nuvem. Arquivos grandes (~300MB) não são
  problema porque residem no servidor da empresa.
- **Uma obra tem exatamente um contrato** (ponto #4, confirmado em
  04/09/2026): sem lotes, sem contratos complementares, sem guarda-chuva.
- **Banco novo**, sem migração de dados legados.
- **Exportação em XLS e PDF.**

## Pontos a levantar na reunião que não são de escopo

- **Backup.** É responsabilidade do cliente por contrato, mas vale confirmar
  em voz alta que existe rotina de backup do PostgreSQL e do diretório
  `storage/` — sem isso, o sistema é um ponto único de falha para o controle
  de prazos da empresa.
- **Senha do administrador.** O seed cria um admin com senha padrão. Trocar na
  instalação é obrigatório.
- **Acesso por tablet/celular** na obra: os requisitos pedem responsividade,
  mas o acesso é só pela rede local. Confirmar se existe Wi-Fi da empresa
  alcançando quem vai usar em campo — senão a responsividade não é usada.
