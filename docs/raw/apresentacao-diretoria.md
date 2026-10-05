# Apresentação do sistema à diretoria — 09/09/2026, notas condensadas

Reunião de demonstração do sistema em homologação, com a diretoria e o setor de
engenharia. Origem das decisões registradas na rodada pós-apresentação de
[`etapas-e-status.md`](../etapas-e-status.md) e das atualizações de
[`pontos-para-reuniao.md`](../pontos-para-reuniao.md). Consultar apenas se
precisar do "porquê" por trás de um ajuste.

**Quem falou:** Júnior (diretor — decide, não opera o sistema), Diego (gestor de
engenharia — administra e também opera), Henrique (contato inicial do cliente).

## O requisito que atravessa tudo

Júnior, sobre a própria expectativa: *"o programa tem que ser um programa para
preguiçoso — que eu consiga ver fácil, clique e passo"*. Hoje ele pede
levantamento ao Diego quando quer saber como está o financeiro; o que ele quer
do sistema é chegar, clicar e já ter a informação, sem parar ninguém. Vale como
critério de decisão sempre que a dúvida for "cabe mais uma informação nesta
tela?".

Contexto de escala, do Diego: **15 a 20 contratos em execução com três pessoas**
no setor. É a razão de fundo de quase todo o resto — não existe responsável
integral por contrato, quem estiver disponível mexe, e às vezes duas pessoas
mexem na mesma obra.

## Avanço físico sai do sistema

Decisão do Júnior, repetida e depois confirmada pelo Diego: *"tira o físico,
deixa só o financeiro"* — *"tanto do card principal quanto dos detalhes da
obra"*.

O motivo não é desinteresse pelo dado, é desconfiança nele: sem alguém
alimentando semanalmente, o número não é verdadeiro, e um físico falso ao lado
de um financeiro correto confunde a leitura. Júnior: *"para eu bater o físico,
eu tinha que ter alguém alimentando essa porra todo dia"*. Eles têm casos reais
nos dois sentidos — Paiol com financeiro à frente do físico, Xangri-lá 100%
executado e financeiro atrás.

Duas alternativas foram levantadas e descartadas na mesma conversa: subir a
**planilha de quantitativos** com o executado item a item (Júnior: exigiria
alimentar toda semana, com alguém indo à obra), e subir o **cronograma
físico-financeiro** para acompanhar por categoria em vez de item unitário
(Henrique defendeu; o Júnior encerrou mandando tirar o físico). Fica registrado
porque é a porta de entrada natural se um dia quiserem o físico de volta — e
porque a razão de descartar foi processo, não tecnologia.

Consequência direta: o sistema é declaradamente **para administrar processo, não
a obra**. Júnior: *"isso é para administrar processo, de atraso, prazo (…) a
gente já tem outro sistema"* para gerir obra.

## Arquivos de projeto (DWG/RVT) não entram

Resolve a pendência que estava aberta desde a validação técnica. Projeto
continua na rede: *"não tem, continua na rede"*. O raciocínio é o mesmo do item
anterior — o sistema cuida de processo e documentação; quando alguém tem dúvida
técnica, abre o projeto na rede.

## Atribuição momentânea de operador

O pedido do Júnior, na origem: olhar um card com prazo vencido e saber que
**já tem alguém trabalhando naquilo**, e por que ainda não terminou. *"Aí ele
vai botar a observação: aguardando foto, relatório."*

O desenho fechado com o Diego no fim da reunião:

- o campo hoje chamado **"Responsável técnico" passa a se chamar "Operador"** —
  o problema era a nomenclatura, não o campo: *"quando fala responsável técnico
  ele imagina o responsável da obra"*, e responsável técnico de empresa é sempre
  o mesmo, informação que não ajuda ninguém;
- a atribuição **sai do cadastro do contrato** e vira **momentânea, feita pelo
  próprio operador na aba resumo da obra** — ele se atribui;
- ao concluir, **o nome fica** como último que mexeu: *"pode estar lá como
  último responsável que modificou"*. É registro, não fila de tarefas;
- só aparece quando a obra está em atenção ou crítico; **em verde não mostra
  nada**;
- no card entra o operador, a última atualização e a observação — a
  justificativa do amarelo/vermelho. Só a última: *"nesse card tem que ter só a
  última atualização"*, o histórico completo fica na aba.

O rastro de quem fez cada medição **já existia e foi aceito na hora** — a aba
Medições mostra o responsável por medição, e a auditoria mostra o resto. Nada a
construir ali.

## Cards de totais do painel: pedido e revertido na mesma reunião

Júnior pediu para remover os cards de resumo do topo do painel (valor
contratado, medido, saldo — totais de todos os contratos). Diego e Henrique
argumentaram contra na recapitulação: *"quanto que nós temos em contrato hoje é
algo que ele me pergunta com frequência"*, e jogar em outra tela *"deixa de ser
prático"*. Diego assumiu resolver com o Júnior — *"nós explicamos e ele não
falou mais, talvez ele tenha entendido que é necessário"*.

Por isso o painel não muda nesta rodada. É o único item da reunião que exigiria
retrabalho de layout, e ele saiu da fila por decisão deles.

## Checklist de documentos padrão

Pedido do Júnior, com o motivo: *"acaba, não tem erro da pessoa esquecer"*. A
documentação é quase sempre a mesma, então a aba deveria **listar os documentos
esperados** dizendo *não anexado* ou *anexado em tal data*, e deixar um espaço
livre no fim para o que não está na lista. Citou de exemplo contrato, ordem de
início, ART, publicação e empenho — mas a lista completa ficou de vir deles.

## Farol e prazo de medição

Confirmado duas vezes: **amarelo dez dias antes** do vencimento da próxima
medição, vermelho quando vencida, verde no prazo. A conta é sobre os 30 dias
corridos, e o Júnior descreveu contando da ordem de início. O propósito do
amarelo é ser gatilho de trabalho: *"já pra pessoa começar a se programar, aí
tem que começar a pedir relatório"*.

## Perfis de acesso

A leitura do Júnior é que existem **dois níveis reais**: quem administra (e
cadastra usuários e obras) e quem opera (alimenta as obras). Chegou a dizer que
gestor e visualizador não existem.

Fechou-se, com o Diego, **manter os quatro perfis** — deixar um usuário parado
não custa nada e o dia que precisarem de alguém que só visualize, existe. Diego:
*"tá excelente, vamos trabalhar dessa forma"*. Na prática Diego e Henrique são
os administradores e cadastram as obras; quem for operacional alimenta. A
nomenclatura pode ser ajustada se pedirem.

A matriz de permissões foi enviada por WhatsApp e a devolutiva **ficou com o
Diego e o Henrique**.

## Código da obra

Sai do card (dá lugar ao operador), mas **fica no cadastro e é importante**:
Diego usa nomenclatura própria por obra na rede e vai padronizar — *"o que
tiver aqui vai estar na rede também, é fundamental para a gente"*. A
auto-numeração quando o campo fica em branco continua servindo.

## Exclusão em cascata: testada ao vivo e aceita

Diego tentou excluir uma obra como administrador e bateu na trava. Foi
explicado o caminho — cancelar não é excluir; para excluir de fato, apagar de
trás para frente (documentos, medições, depois a obra) — e ele completou a
exclusão na tela. Aceitou com atrito consciente: *"caso seja necessário depois
eu faço de trás pra frente, porque aqui tem um trabalho danado"*. Júnior
reforçou que **só o administrador deveria apagar qualquer coisa**.

## Auditoria

Aprovada como está, incluindo o registro de entrada e saída de sessão, que
tinha sido oferecido como removível: *"não, pode deixar"*. Diego conferiu a
linha do tempo depois das próprias exclusões e viu tudo registrado.

## Base de demonstração: não zerar

Júnior queria o sistema zerado para começar a preencher. Diego preferiu manter
as obras fictícias como parâmetro de preenchimento — *"serve até como parâmetro
de preenchimento, se tiver alguma dificuldade"* — e criar as obras reais ao
lado. Prevaleceu manter.

## Hospedagem pública incomoda

Ao saber que o ambiente de teste é público, Júnior reagiu: *"eu não queria que
isso fosse público"*, e perguntou se dava para rodar na rede interna já. Aceito
seguir público **durante o período de teste** — com a ressalva de que ajuste em
ambiente interno exige ir ao local — e ir para a intranet depois. Confirma o
modelo de deploy, e é argumento para não deixar dado real subir ao ambiente de
teste.

## Campo continua fora do sistema

O engenheiro que vai à obra **não terá acesso**: levanta em campo, o escritório
lança. Aplicativo de campo foi mencionado como ideia futura, sem escopo.

## Combinados de prazo

Cliente testa o ambiente público e manda apontamentos por WhatsApp; pediram para
forçar o sistema, evitando arquivos muito grandes por causa da hospedagem
gratuita. Telmo se comprometeu a subir as modificações desta rodada **no fim do
mesmo dia** e avisar para retestarem. Instalação pretendida na sexta, com
segunda como cenário mais provável — e com a ressalva, dita na reunião, de que
eles não fecham todas as definições até sexta.
