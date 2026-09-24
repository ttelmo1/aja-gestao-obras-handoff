# Pontos para a Reunião de Validação

Decisões que assumimos para não travar o desenvolvimento, a confirmar com o
cliente junto da demonstração do MVP. Cada ponto traz **o que assumimos**, **o
que custa mudar** e **onde mexer** — para a resposta do cliente virar ajuste
imediato, não retrabalho.

Ordenados por custo de mudar, do mais caro para o mais barato.

- **Status:** `🔴 aberto` · `🟡 assumido, a confirmar` · `🟢 confirmado`
- **Última atualização:** 24/09/2026 — pedidos do Junior pela Fernanda sobre
  **pagamento de medição** e **suspensão de prazo** (ponto #26). O pagamento
  entrou em dev com duas escolhas nossas a confirmar; a suspensão espera
  resposta. Antes disso, em 21/09/2026, a Fernanda mandou a **lista de
  documentos do contrato** (dezessete itens) e pediu a **retirada do cadastro
  de responsáveis**. Fecha a parte principal do ponto #18 e deixa três escolhas
  de implementação para confirmar, registradas lá. Antes disso, em
  09/09/2026, a **apresentação do sistema à diretoria**
  (Júnior, Diego e Henrique). Notas em
  [`raw/apresentacao-diretoria.md`](raw/apresentacao-diretoria.md). Fechou os
  pontos #2, #5 e #8, avançou #1, #3, #11 e #13, e abriu #18, #19 e #20. Os
  ajustes da etapa 13 **já estão implementados** no mesmo dia, e três escolhas
  de desenho tomadas na implementação entraram como perguntas: a permissão de
  assumir obra (#3), o conflito entre dois operadores (#21) e o filtro do
  painel (#22).

## Índice

| # | Ponto | Status | Custo de mudar |
|---|---|---|---|
| 1 | Critérios de cor do farol — escopo e cores confirmados, limites em aberto | 🟡 | Baixo |
| 2 | Upload de DWG/RVT — não entram, projeto fica na rede | 🟢 | ~~Baixo a alto~~ — resolvido |
| 3 | Permissões por perfil — quatro perfis mantidos, matriz pendente | 🟡 | Baixo |
| 4 | Obra ↔ contrato é 1:1 | 🟢 | ~~Alto~~ — resolvido |
| 5 | Percentual executado — avanço físico sai do sistema | 🟢 | ~~Médio~~ — resolvido |
| 6 | Setores de tramitação | 🟡 | Baixo |
| 7 | Numeração de medições e rerratificações | 🟡 | Médio |
| 8 | Exclusão de registros — só documento ativo trava; senha do administrador em aberto | 🟡 | Baixo |
| 9 | Retenções além do ISS | 🔴 | Médio |
| 10 | Conteúdo dos relatórios — público e layout confirmados | 🟡 | Médio |
| 11 | Forma de instalação no servidor | 🔴 | Médio |
| 12 | Recuperação de senha sem servidor de e-mail | 🟡 | Baixo |
| 13 | Periodicidade da medição — mensal e amarelo 10 dias antes confirmados | 🟡 | Baixo |
| 14 | Consórcio: contrato com duas empresas | 🟡 | Baixo |
| 15 | Contratos de manutenção não são obras — parcela fixa em Nilópolis | 🟡 | Baixo |
| 16 | Onde a tramitação mora: por medição ou por etapa | 🟡 | Médio |
| 17 | Limite legal de acréscimo contratual | 🟡 | Baixo |
| 18 | Documentos padrão da lista de conferência — lista recebida em 21/09 | 🟡 | Baixo |
| 19 | Cards de totais no topo do painel: ficam ou saem | 🔴 | Baixo |
| 20 | Empresa ou operador no cartão da obra | 🟡 | Baixo |
| 21 | Dois operadores na mesma obra: quem manda | 🟡 | Baixo |
| 22 | Filtro do painel: responsável virou operador | 🟡 | Baixo |
| 24 | Pagamento pendente: o prazo, e o que conta como pendente | 🟡 | Baixo |
| 25 | Prazo adicional da rerratificação prorroga a obra | 🟢 | ~~Baixo~~ — resolvido |
| 26 | Pedidos de 24/09: pagamento na linha, quadro no painel, suspensão de prazo | 🟡 | Baixo a alto |

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
| ~~Avanço físico atrás do tempo decorrido~~ | ~~≥ 10 p.p.~~ | ~~≥ 25 p.p.~~ |
| Prazo da próxima medição *(entrou em 09/09)* | vence em ≤ 10 dias | vencida |

A linha riscada saiu em 09/09/2026 com o avanço físico; a última entrou no mesmo
dia, e é a única com número dado pelo cliente.

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

**Atualização (apresentação, 09/09/2026): o farol perde um dos três
critérios.** Com o avanço físico fora do sistema (ponto
[#5](#5-o-percentual-executado-é-digitado-pelo-usuário--resolvido-por-remoção)),
o critério *"avanço físico atrás do tempo decorrido"* deixa de ter dado de
entrada e sai da tabela acima. Sobram **proximidade do término** e **processo
parado no mesmo setor** — mais os status (paralisada, finalizada, sem ordem de
início). A lógica "basta um critério acender" continua valendo, e calibrar
ficou mais simples: são dois pares de números, não três.

Confirmado também o **prazo de medição como sinal**, que o mockup sugeria e o
engenheiro havia descartado como escopo do farol: o Júnior pediu, e o Diego
confirmou na recapitulação, **amarelo dez dias antes** do vencimento da próxima
medição e vermelho quando vencida. Isso não recoloca o farol da obra sobre
prazo de medição — o farol segue sendo da obra inteira; o que entra é o prazo de
medição como mais um critério dele, com número já definido pelo cliente (ver
ponto [#13](#13-periodicidade-da-medição-e-o-que-conta-como-atrasada-)).

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

## 2. Upload de arquivos de engenharia (DWG/RVT) 🟢 RESOLVIDO

> **Respondido na apresentação à diretoria, 09/09/2026: os arquivos de projeto
> não entram no sistema.** *"Não tem, continua na rede."* Perguntado
> diretamente se DWG e RVT entrariam, o Júnior respondeu que projeto é para
> consulta técnica e continua no compartilhamento de rede.
>
> O raciocínio dele vale mais que a resposta, porque decide casos futuros:
> **este sistema administra processo, não a obra** — *"isso é para administrar
> processo, de atraso, prazo"*, e para gerir obra *"a gente já tem outro
> sistema"*. Pedido de funcionalidade que sirva à execução da obra, e não ao
> processo dela, está fora de escopo por definição do cliente.
>
> **Consequência:** a trava fica como está, permanentemente.
> `ENGENHARIA_HABILITADA` continua `false` e passa a ser decisão registrada, não
> pendência. Nada de pré-visualização, versionamento de projeto ou controle de
> revisão — as três coisas que poderiam ter estourado o orçamento aqui.

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

> **Parcialmente respondido na apresentação, 09/09/2026.**
>
> **Os quatro perfis ficam.** O Júnior leu a operação como tendo só dois níveis
> — quem administra e quem opera — e chegou a dizer que gestor e visualizador
> não existem. Fechou-se com o Diego mantendo os quatro, pelo argumento de que
> perfil sem usuário não custa nada e o dia que precisarem de alguém que só
> visualize, existe: *"tá excelente, vamos trabalhar dessa forma"*. Não há
> mudança de código aqui.
>
> **Quem cai em cada um:** Diego e Henrique são **administradores** e cadastram
> as obras (são 15 a 20 contratos, não 15 obras por semana — cadastrar cabe a
> eles). Quem for **operacional** alimenta a obra depois de cadastrada. O
> Júnior é diretor e só olha: na prática o perfil dele é o de visualização, com
> a ressalva de que ele não vai lidar com autorizar exclusão nem gerir usuário.
>
> **Ninguém deve ver só as obras em que é responsável** — e a pergunta perdeu
> sentido: com três pessoas para 15–20 contratos, *"quem tiver, dependendo da
> urgência"* mexe, às vezes duas pessoas na mesma obra. É a mesma razão que
> produziu a atribuição momentânea do ponto
> [#20](#20-o-que-ocupa-o-lugar-do-código-no-cartão-da-obra-).
>
> **Segue pendente:** a **matriz linha a linha**. Foi enviada por WhatsApp e a
> devolutiva ficou com o Diego e o Henrique — *"a gente vai ter com Henrique
> isso, te passo"*. Também em aberto se querem **renomear** os perfis (gestor
> virar administrador, operacional virar gestor) — ajuste de rótulo, oferecido
> e não pedido.

**Uma linha da matriz já foi decidida no código, e precisa de confirmação:
assumir uma obra exige `obra:ver`, não `obra:editar`.** O perfil Operacional só
lê obra na matriz atual; se a atribuição de operador exigisse permissão de
editar, justamente as três pessoas para quem o campo existe ficariam de fora
dele. O argumento é que assumir não altera nenhum dado do contrato — só registra
quem está cuidando dele agora. Está comentado em
`src/app/(app)/obras/[id]/operador-acoes.ts`.

**Perguntar:** o operacional pode assumir obra? Se a resposta for não, quem
assume — e o que sobra para o operacional fazer com uma obra em atenção?

**Perguntar:** quatro perfis bastam? Quem na empresa cai em cada um? Existe
alguém que deva ver só as obras em que é responsável?

**Perguntar também — quem enxerga a trilha de auditoria?** Hoje a matriz dá
leitura de auditoria só a Administrador e Gestor, então a aba **Histórico** da
obra não aparece para Operacional nem Visualizador (revisão de código, achado
11 — antes ela aparecia e o clique dava "sem permissão"). É defensável dos dois
jeitos: esconder protege o "quem fez o quê" de quem só opera, mostrar deixa a
equipe conferir o próprio trabalho. Se o cliente quiser a trilha visível para
todos, é uma linha na matriz.

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

## 5. O percentual executado é digitado pelo usuário 🟢 RESOLVIDO POR REMOÇÃO

> **Decidido na apresentação à diretoria, 09/09/2026: o avanço físico sai do
> sistema.** *"Tira o físico, deixa só o financeiro"* — e, na recapitulação com
> o Diego, *"tanto do card principal quanto dos detalhes da obra"*.
>
> **O motivo não é desinteresse pelo dado, é desconfiança nele.** Sem alguém
> alimentando semanalmente, o percentual não é verdadeiro, e um físico falso ao
> lado de um financeiro correto estraga a leitura das duas coisas: *"para eu
> bater o físico, eu tinha que ter alguém alimentando essa porra todo dia"*.
> Eles têm casos reais nos dois sentidos — uma obra com financeiro à frente do
> físico, outra 100% executada e sem medir. Ou seja: a informação **importa**
> para eles, mas não neste sistema, alimentada deste jeito.
>
> **Duas alternativas foram levantadas e descartadas na mesma conversa**, e
> ficam registradas porque são a porta de entrada se um dia quiserem o físico de
> volta: subir a **planilha de quantitativos** com o executado item a item
> (descartada por exigir alguém em obra toda semana) e subir o **cronograma
> físico-financeiro** para acompanhar **por categoria** em vez de item unitário
> (defendida pelo Henrique, encerrada pelo Júnior). Nenhuma das duas está
> orçada, e o que as barrou foi processo, não tecnologia.
>
> **Consequência:** sai o campo do formulário de medição, sai do resumo e do
> cartão da obra, sai dos relatórios, e o farol perde o critério de atraso
> físico (ponto [#1](#1-critérios-exatos-de-cada-cor-do-farol-)). O que o
> sistema calcula sozinho — % medido, saldo a medir, contratado × medido —
> continua igual: é tudo financeiro.

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
  registro fica para a auditoria. Quando a obra ou a medição dona dele é
  apagada, registro e arquivo saem de vez (15/09/2026).
- **Obras, medições, etapas:** exclusão física, em cascata. **Alterado em
  15/09/2026, no período de teste:** a única trava é **documento ativo**.
  Medição sai em qualquer situação — a regra da etapa 5, de só apagar
  *Rascunho*, caiu — e obra sai levando medições, rerratificações e
  tramitação, desde que a aba Documentos esteja vazia. As duas exclusões pedem
  confirmação numa janela que mostra o que vai ser apagado.
- **Auditoria:** nunca. Trigger no banco bloqueia UPDATE e DELETE.
- **Contratantes, responsáveis e setores:** exclusão física só quando ninguém
  os referencia. Em uso, o sistema recusa e oferece desativar — some das
  listas de seleção sem reescrever o histórico de contratos já assinados.

> **Respondido na apresentação, 09/09/2026 — testado ao vivo e aceito.**
>
> O Diego tentou apagar uma obra como administrador, bateu na trava e o caminho
> foi explicado na tela: **cancelar não é excluir** (a obra cancelada continua
> no painel, com status), e para excluir de fato apaga-se **de trás para
> frente** — documentos, medições, depois a obra. Ele completou a exclusão e
> aceitou a regra com atrito consciente: *"caso seja necessário depois eu faço
> de trás pra frente, porque aqui tem um trabalho danado"*.
>
> Então **não há cascata automática**, e é isso que eles querem: a obra criada
> por engano se resolve pelo status *Cancelada*, e apagar de verdade é raro e
> deliberado. Nada de "arquivar e recuperar" — o status já cobre o caso.
>
> **O Júnior pediu um aperto:** *"o único que tem possibilidade de apagar
> alguma coisa, o administrador"*. Hoje o gestor apaga medição, tramitação,
> documento e rerratificação. Isso entra na devolutiva da matriz de permissões
> (ponto [#3](#3-detalhamento-das-permissões-por-perfil-)) — vale confirmar com
> o Diego antes de mexer, porque ele opera junto com a equipe e é quem sente o
> custo de ter que apagar tudo em nome deles.
>
> **Revisto em 15/09/2026.** A Fernanda, limpando as obras de exemplo da
> homologação, bateu na trava das medições: *"quando há medições não dá pra
> apagar a obra, seria uma opção com senha somente pro administrador"*. Ficou
> assim: o **documento** é a única trava. O "de trás pra frente" encolhe para um
> passo — esvaziar a aba Documentos — e a obra sai em cascata. Medição também
> ganhou exclusão direto na tabela, em qualquer situação.
>
> **Não implementado:** a senha do administrador na confirmação. Hoje só o
> administrador exclui obra, e a janela de confirmação mostra contrato, objeto
> e quantas medições vão junto. Confirmar se isso basta ou se a senha é
> exigência.

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

## 11. Como o sistema será instalado no servidor 🟡

O contrato diz que a instalação é *"a definir após visita técnica à
infraestrutura do cliente"* e está fora das 140h.

> ### ✅ Respondido pelo Júnior em 09/09/2026 — o ambiente é outro
>
> As três premissas principais do plano de instalação mudaram:
>
> | Assumíamos | Realidade |
> | --- | --- |
> | "Servidor" | **Estação de trabalho robusta.** Sem disco/fonte redundante |
> | Windows Server ou Linux | **Windows comercial (10/11)** |
> | Acesso de saída à internet, confirmado | **Sem internet, por decisão.** *"Tudo aqui é estanque"* |
>
> Contexto adicional dele: a rede já tem compartilhamentos por departamento
> com permissão por área (engenharia, DP), montados por ele com ajuda de
> terceiro. A ideia é publicar um atalho para o sistema numa pasta comum.
>
> **Consequências, todas absorvidas em
> [`instalacao-on-premise.md`](instalacao-on-premise.md):**
>
> - Entrega do pacote por **mídia removível**. O Júnior propôs receber um
>   **link de download**, baixar numa máquina com internet e levar o arquivo
>   à máquina isolada. Cai o download direto e cai o PAT do GitHub.
> - **Não existe atualização automática.** Toda atualização exige uma pessoa
>   levando um arquivo. Correção urgente depende de disponibilidade dele.
> - Build do Actions passa de `ubuntu-latest` para **`windows-latest`** — o
>   binário do CLI do Prisma é por plataforma, e o destino mudou.
> - `systemd` → **NSSM**; `/opt/aja-obras` → `C:\aja-obras`; cron → Agendador
>   de Tarefas.
> - **Tudo vai no pen drive**: instaladores do Node e do PostgreSQL, NSSM,
>   release e scripts. Nada pode ser baixado no local.
> - 🔴 **`storage\` não pode virar pasta compartilhada.** Pela lógica de
>   organização que ele já usa seria o passo natural, e desmontaria todo o
>   controle de permissão de documentos do sistema — qualquer um abriria
>   qualquer contrato pelo Explorer.
>
> **Ainda em aberto, no checklist da seção 9 daquele documento:** edição exata
> do Windows, **IP fixo ou DHCP** (quebra o atalho se mudar), nobreak,
> suspensão desligada, antivírus, e quem executa a atualização.

> **Reforçado na apresentação, 09/09/2026 — e com prazo na mesa.** Ao saber que
> o ambiente de teste está numa hospedagem pública, o Júnior reagiu: *"eu não
> queria que isso fosse público, não queria essa informação"*, e perguntou se
> não dava para rodar na rede interna já. Aceitou seguir público **durante o
> período de teste**, com a ressalva — dita na reunião — de que ajuste em
> ambiente interno exige ir ao local.
>
> **Duas consequências práticas.** A primeira: **dado real não sobe ao ambiente
> de teste**. Eles vão cadastrar obras reais lá para testar, e o combinado
> assumido é que essa base é descartável e não vira a base de produção. A
> segunda: a instalação foi falada para **sexta, 11/09**, com **segunda, 14/09**
> como cenário mais provável — reconhecido na própria reunião que eles não
> fecham todas as definições até sexta. O que depende deles para a instalação
> está nos pontos #3, #18 e #19.

**Plano detalhado da instalação e do ciclo de atualização:**
[`instalacao-on-premise.md`](instalacao-on-premise.md) — desenho físico (onde
ficam banco, arquivos e aplicação), entrega por GitHub Actions + Release, e o
que ainda precisa ser construído. Ele depende das respostas deste ponto.

**Assumimos** — provisoriamente, para o desenvolvimento: PostgreSQL nativo e a
aplicação Node rodando como serviço do sistema, sem Docker. Isso segue o
espírito declarado no `CLAUDE.md`, que escolheu a stack por "menos peças
móveis" e "um único processo Node, sem serviços extras".

**Perguntar na visita técnica** — a lista completa, com *como o cliente
descobre cada resposta*, está na **seção 9 de
[`instalacao-on-premise.md`](instalacao-on-premise.md)**. As que interessam
a decisões de código:

- ~~Qual o sistema operacional do servidor~~ → **Windows 10/11 comercial.**
- Quem administra a máquina, e essa pessoa tem experiência com o quê?
- Existe rotina de backup? O que ela cobre hoje?
- A máquina reinicia sozinha após queda de energia, e os serviços sobem junto?
- **O sistema vai atender em HTTP ou HTTPS?** Muda uma variável de ambiente
  (`COOKIE_SEGURO`) e não é detalhe estético: com a flag `Secure` ligada em
  servidor HTTP o navegador descarta o cookie de sessão e **ninguém consegue
  entrar**, sem erro em log nenhum. Fica `false` até haver certificado.
- **Vai haver proxy reverso (nginx, IIS) na frente do Node?** Interessa por
  causa do IP: hoje o sistema lê `x-forwarded-for`, que sem proxy é escolhido
  pelo próprio cliente — IP de auditoria autodeclarado e freio de login
  contornável (revisão de código, achado 2). **Decidido e já feito:** o sistema
  parou de ler o header e o freio de login passou a ser por e-mail; o IP fica
  vazio e a tela de sessões mostra "origem desconhecida". Se a resposta aqui for "sim, vai ter proxy", aí se reabre — com a
  informação de que o app router do Next não expõe o IP da conexão, então a
  alternativa seria custom server, que muda este procedimento de instalação.

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

> **Parcialmente respondido na apresentação, 09/09/2026.**
>
> **Mensal, 30 dias, contados da ordem de início** — é como o Júnior descreveu
> a rotina: *"eu faço a cada 30 dias (…) do prazo que eu boto lá ordem de
> início, daqui a 30 dias eu tenho que fazer a medição"*. Confirma o padrão
> mensal e a contagem em dias corridos. Não confirma se a periodicidade varia
> entre contratos, então o campo continua na tela.
>
> **Amarelo dez dias antes, vermelho quando vencer** — pedido pelo Júnior e
> confirmado pelo Diego na recapitulação. O propósito declarado do amarelo é
> ser gatilho de trabalho, não decoração: *"já pra pessoa começar a se
> programar, aí tem que começar a pedir relatório"*. É o número que faltava para
> ligar prazo de medição ao farol.
>
> **Continua em aberto:** se a periodicidade varia por órgão, se existe
> carência entre ordem de início e primeira medição, e a pergunta 4 abaixo —
> "atrasada" é sobre *fazer* a medição ou sobre o *processo dela* estar parado.
> A atribuição momentânea do operador (ponto
> [#20](#20-o-que-ocupa-o-lugar-do-código-no-cartão-da-obra-)) reduz a urgência
> dessa última: quando o processo estiver parado por algo externo, o operador
> escreve o motivo no card.

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
3. Supressão também tem limite de 25% na prática do cliente? **Assumimos que
   sim** — é o que o art. 125 diz, e desde 07/09/2026 o alerta acende para os
   dois lados (revisão de código, achado 3). Antes disso, supressão de qualquer
   tamanho passava calada. Se na prática do cliente supressão não tem teto, é
   remover o `abs` da comparação.

**Custo de mudar:** baixo. É uma constante em
`modules/rerratificacoes/calculos.ts`; virar campo por obra é uma coluna.
**Onde:** `src/modules/rerratificacoes/calculos.ts`,
`LIMITE_ACRESCIMO_PERCENTUAL`.

---

## 18. Os documentos padrão da lista de conferência 🟡 respondido, com três escolhas nossas

**Pedido em 09/09/2026, respondido em 17/09 (medição) e em 21/09 (contrato),
tudo implementado.** A aba Documentos deixou de listar só o que foi anexado:
lista **o que se espera**, com *não anexado* em vermelho e a data de quem já
chegou. O que o Junior queria: *"acaba, não tem erro da pessoa esquecer"*.

**Respondido pelo cliente em 17/09:**

1. **Documento que não se aplica ganha botão.** Marcado, fica cinza e desce
   para o fim da lista, com motivo opcional em texto livre.
2. **Mais de um arquivo por tipo continua valendo**, e a descrição continua
   existindo — *"porque 'outros' pode haver mais de um documento"*.
3. **A medição tem lista própria**: *"listada em cada medição os documentos
   necessários"*, no mesmo formato — **medição, memória de cálculo, cronograma,
   relatório fotográfico, diário de obra e nota fiscal**, mais "Outros".
   Quatro deles não existiam como tipo e entraram no enum. **Saíram da lista da
   medição** processo / protocolo, ISS e planilha, que estavam ali por leitura
   do mockup. **Vale confirmar o ISS**, que tem campo próprio no formulário da
   medição e pode ter ficado de fora por esquecimento, não por decisão.

**Respondido em 21/09 — a lista do contrato**, com dezessete itens na ordem em
que a Fernanda mandou: termo de adjudicação, termo de homologação, empenho,
contrato, publicação do extrato de contrato, apólice de seguro / risco
engenharia, publicação de comissão de fiscalização, ordem de início, emissão de
ART/RRT, emissão da CNO, medições contratuais, termo aditivo, apostilamento,
termo de recebimento provisório, termo de recebimento definitivo, licenças e
outros. Isso encerra a pergunta de 09/09 sobre ART, publicação e empenho, que
não existiam como tipo.

**Assumimos, e é o que falta confirmar:**

- **Termo aditivo e apostilamento não são cobrados.** Vieram com "(em caso de
  necessidade)", então têm linha mas ficam cinzas como *Opcional*, fora da
  conta de "não anexado". Se o cliente quiser os dois em vermelho até serem
  dispensados na mão, é trocar dois valores em
  `src/modules/documentos/acervo.ts`.
- **Cinco tipos aceitam mais de um arquivo:** "Outros", medições contratuais,
  apólice / risco engenharia, licenças e ART/RRT. Os três últimos foram
  liberados porque são naturalmente mais de um papel — dois seguros no mesmo
  item, licenças de três órgãos, uma ART por profissional. Nos demais doze
  segue um arquivo por tipo. **Perguntar** se falta algum nessa lista.
- **"Medições contratuais" é cumprida pelos boletins da tela da medição.** É
  onde eles entram; a linha do contrato ficaria vermelha para sempre se
  ignorasse isso. A alternativa seria a linha cobrar um arquivo consolidado,
  anexado ao contrato — o que duplicaria papel.
- **Três tipos antigos foram renomeados, não acrescentados**, porque nomeiam o
  mesmo papel: "Garantia" virou **apólice de seguro / risco engenharia**,
  "Rerratificação" virou **termo aditivo** e "Aceite" virou **termo de
  recebimento provisório**. O que já estava anexado seguiu com o nome novo. Se
  para o cliente "aceite" e "recebimento provisório" forem papéis diferentes,
  é desfazer o terceiro rename e separar os dois.
- **Tipos fora da lista continuam existindo** — edital, proposta, atestado/CAT,
  despacho, parecer, protocolo, foto, planilha —, porque servem às outras
  telas (tramitação, rerratificação). Não são cobrados no contrato e aparecem
  marcados "fora da lista" onde já existirem. **Perguntar** se o cliente quer
  vê-los sumir do seletor de tipo.
- **A lista é igual para todo contratante.** Nenhuma fala sugeriu o contrário,
  e a dispensa por obra resolve a variação caso a caso. Se um dia variar por
  órgão, vira cadastro.

**Ainda não decidido:** se a pendência documental deve **acender o farol**.
Hoje não acende — o farol tem dois critérios (ponto #23) e nenhum olha
documento. Com a lista no ar, é a pergunta natural seguinte.

**Onde:** `src/modules/documentos/rotulos.ts` (a lista e os rótulos),
`src/modules/documentos/acervo.ts` (o que é cobrado), a aba Documentos e a tela
da medição.

## 19. Cards de totais no topo do painel: ficam ou saem 🔴

**Aberto na apresentação de 09/09/2026, e ainda em disputa do lado do cliente.**

O Júnior pediu para remover os cards de resumo do topo do painel — valor
contratado, valor medido, saldo a medir somados de todos os contratos: *"isso aí
eu pedi para você tirasse"*. Na recapitulação, **Diego e Henrique defenderam o
oposto**: *"quanto que nós temos em contrato hoje é algo que ele me pergunta com
frequência"*, e mover para outra tela *"deixa de ser prático"*.

**Assumimos: não mexer.** O Diego assumiu resolver internamente — *"nós
explicamos e ele não falou mais, talvez ele tenha entendido que é necessário"* —
e a leitura mais provável é que os cards ficam, já que quem pede o número ao
Diego hoje é justamente o Júnior. Mexer antes da devolutiva é o pior dos
mundos: é o único item da reunião que custaria retrabalho de layout.

**Perguntar:** o Júnior confirma que os totais ficam? Se ele insistir em tirar,
a saída é um **painel-resumo separado** — o que ele mesmo sugeriu ao falar de
*"um geralzão"* — e aí vale perguntar se esse painel é a tela de entrada dele,
diferente da tela de entrada de quem opera. Isso seria escopo novo, não ajuste.

**Custo de mudar:** baixo para tirar, médio para virar tela própria com
navegação por perfil.
**Onde:** painel de obras, `src/app/(app)/obras/`.

## 20. Empresa ou operador no cartão da obra 🟡

**Aberto na apresentação de 09/09/2026.** Duas soluções diferentes foram
pedidas para o mesmo lugar do cartão, por pessoas diferentes, e a segunda
passou por cima da primeira sem que a primeira fosse retirada.

O ponto de partida comum às duas é a saída do **responsável técnico**, porque
*"geralmente são sempre os mesmos"* e informação que nunca muda não ajuda a
decidir nada.

**O espaço vem da barra de avanço físico, não do código.** O Júnior sugeriu
tirar o código (*"esse código não tem necessidade"*), mas isso foi decidido em
contrário: **o código fica no cartão**. Com o físico fora do sistema (ponto
[#5](#5-o-percentual-executado-é-digitado-pelo-usuário--resolvido-por-remoção)),
a barra de percentual do cartão deixa de ter dado e é ela que abre lugar para o
operador — o cartão não perde informação nenhuma para ganhar a nova.

**O que o Júnior pediu**, na primeira parte da reunião: que o campo mostre o
**nome da empresa**, porque trabalham com várias e é isso que ele quer
identificar de relance — *"o nome da empresa barra o nome do responsável"*.

**O que o Diego fechou**, na recapitulação: que o campo mostre o **operador** —
quem está tratando aquela obra agora. Aqui o problema era **nomenclatura, não o
campo**: *"quando fala responsável técnico ele imagina o responsável da obra"*.

**Assumimos** o desenho do Diego, porque é o que resolve o pedido de origem do
Júnior (olhar um card vencido e saber que já tem alguém trabalhando nele) e
porque foi o combinado explícito do fim da reunião. Ele está detalhado como
item firme da rodada pós-apresentação em
[`etapas-e-status.md`](etapas-e-status.md).

**Perguntar:** o nome da **empresa** ainda é necessário no cartão? Cabe ao lado
do operador sem transformar o cartão na parede de informação que o Júnior não
quer — mas é ele quem tem que dizer se quer os dois. Vale perguntar com a tela
aberta, mostrando o cartão já com operador.

**Já resolvido dentro deste ponto:** o **código da obra fica** — no cadastro e
no cartão. O Diego usa nomenclatura própria por obra na rede e vai padronizar:
*"o que tiver aqui vai estar na rede também, é fundamental para a gente"*. Isso
contraria o pedido do Júnior de tirá-lo do cartão, e a decisão foi manter: é a
chave que liga a obra no sistema à pasta dela na rede, e quem vai usar os dois
lados todo dia é o setor de engenharia. A auto-numeração quando o campo fica em
branco continua servindo.

**Custo de mudar:** baixo — é conteúdo de cartão.
**Onde:** `src/app/(app)/obras/cartao.tsx` e o painel.

**Já implementado (09/09/2026):** o cartão mostra o operador **só em atenção ou
crítico** — em obra verde não aparece nada, porque não há o que atribuir e o
rótulo vazio em quinze cartões verdes é ruído. O espaço veio da barra de avanço
físico, que saiu. Quando ninguém assumiu, o rótulo vira *"Último operador"* —
"último a mexer" foi descartado por soar a bagunça justamente onde o campo diz o
contrário, e "último responsável" está fora por reintroduzir a palavra que o
Diego pediu para sair.

---

## 21. Dois operadores na mesma obra: quem manda 🟡

Nasceu da implementação da atribuição momentânea (ponto #20), de uma frase que
ficou sem desdobramento na reunião: com três pessoas para 15–20 contratos,
*"quem tiver, dependendo da urgência"* mexe — **e às vezes duas na mesma obra**.
O cliente disse que isso acontece, mas não disse o que o sistema deve fazer
quando acontece.

**Assumimos** que **ninguém toma a obra de quem está com ela**: se outro
operador já assumiu, o botão recusa e pede para a pessoa liberar primeiro. Quem
assumiu pode reescrever a própria observação quantas vezes quiser. A escolha é
pelo caminho que força o combinado entre as duas pessoas, em vez do que troca o
nome em silêncio e faz as duas descobrirem depois.

**O risco da escolha oposta:** se qualquer um puder assumir por cima, o campo
deixa de responder "quem está cuidando disto" — que é a pergunta que ele existe
para responder — e passa a mostrar apenas quem clicou por último.

**O risco desta escolha:** operador que sai de férias sem liberar deixa a obra
travada para os outros. Hoje só o administrador consegue destravar, editando a
obra. Se isso incomodar na prática, a saída barata é um botão de liberar
disponível ao administrador.

**Perguntar:** quando duas pessoas pegam a mesma obra, elas se falam antes? Faz
sentido o sistema exigir que a primeira libere, ou é atrito desnecessário?

**Custo de mudar:** baixo — são as funções `podeAssumir` e `podeLiberar` em
`src/modules/obras/operador.ts`, com teste.

---

## 22. Filtro do painel: responsável virou operador 🟡

O requisito 1.9 prevê filtro do painel por **responsável**. Com o campo
substituído por operador (ponto #20), o filtro passou a listar **usuários do
sistema** e a filtrar por quem assumiu a obra ou por quem mexeu nela por último.
A busca livre do painel também passou a olhar o nome do operador.

**Assumimos** que a intenção do requisito era "as minhas obras" — a consulta que
os três do setor fazem todo dia — e que ela continua servida pelo campo novo.

**Perguntar:** o filtro por operador resolve? Falta um atalho de "só as minhas
obras", que hoje exige escolher o próprio nome na lista?

**Custo de mudar:** baixo — `src/modules/obras/filtros.ts` e a barra de filtros.

## 23. O farol sem o critério de processo parado 🟢 decidido

Com a tramitação fora da tela (17/09/2026), o critério **"processo parado há N
dias"** — amarelo aos 15, vermelho aos 30 — ficou sem fonte: ele lia o movimento
sem data de saída, e não há mais tela que registre movimento.

**Decisão (17/09/2026): o farol fica com dois critérios.** Implementado.

| Critério | Amarelo | Vermelho | Origem do número |
| --- | --- | --- | --- |
| Término do contrato se aproximando | 30 dias antes | vencido | suposição nossa |
| Vencimento da próxima medição | 10 dias antes | ao vencer | **dado pelo cliente** |

Descartadas duas alternativas que manteriam três critérios: contar *dias desde o
último documento anexado* e contar *dias desde a última alteração na obra*. As
duas medem outra coisa com o mesmo nome — processo anda sem gerar documento, e
documento é anexado semanas depois do fato. Preferimos perder o critério a
entregar um número que parece andamento e não é.

**O que se perde, e precisa ser dito ao cliente:** obra parada, dentro do prazo
contratual e com a medição em dia, agora fica **verde**. O farol vira alerta de
prazo, não de andamento. Quem cobra andamento passa a ser a lista de documentos
— o que é justamente o desenho que o Junior pediu.

**Saiu junto:** o indicador "Processos parados" do painel, o "Maior tempo
parado" da aba Resumo e o campo `diasParado` de `resumoDaObra`.

**Ainda por confirmar:** os 30 dias de antecedência do término continuam sendo
suposição nossa. Com um critério a menos, esse número passou a pesar mais —
vale calibrar com a tela aberta.

## 24. Pagamento pendente: o prazo, e onde o filtro fica 🟡 parcialmente respondido

O Junior pediu um jeito de ver medição com pagamento pendente. Perguntamos três
coisas; ele respondeu uma, pela Fernanda (17/09/2026): *"que essa opção fique na
aba de medições, pra poder marcar como pendente, aparecer quando for filtrar"*.

**Respondido:** o lugar é a aba Medições da obra, não o painel de obras.

**Como foi implementado, e por quê:** sem campo novo. A pendência é lida do
`status` da medição — não paga e não rejeitada é pagamento pendente. Um marcador
manual em paralelo ao status poderia discordar dele (medição "Paga" marcada como
pendente) e o sistema passaria a dar duas respostas para a mesma pergunta. Na
prática o que o Junior chama de "marcar como pendente" é o que ele já faz hoje
ao deixar a medição em Protocolada ou Aprovada.

**Continua sem resposta, e é o que importa:** *pendente* não é *atrasado*. Toda
obra em andamento tem medição não paga; um filtro que devolve todas não separa
nada. O que separa é o pagamento estar fora do prazo — e não sabemos de onde sai
o prazo:

- conta do **protocolo no órgão**, da **aprovação da medição**, ou de outra data?
- existe **prazo fixo em contrato** (30, 60 dias)?
- o prazo **varia por órgão**, e teria que ser informado obra a obra?

Enquanto não houver resposta, a tela mostra pendência, não atraso: o filtro "só
pagamento pendente" e o total em vermelho na faixa de indicadores.

**Também sem resposta:** pagamento parado deve **acender o farol**? Hoje não
acende — o farol tem dois critérios (ponto #23) e nenhum olha pagamento.

**Custo de mudar:** baixo enquanto a pendência for derivada. Vira alto se
entrarmos em prazo por obra — passa a ser campo no contrato, migration e
recálculo do farol.

## 25. Prazo adicional da rerratificação prorroga a obra 🟢 decidido

**Bug relatado pela Fernanda em 22/09/2026:** *"Quando adicionada uma
rerratificação e colocando prazo adicional, o prazo não é acrescentado e fica
constando como vencida."* Na tela que ela mandou: Nilópolis, término previsto
24/07/2026, 120 dias aprovados, e mesmo assim "vencido há 60".

**Causa:** `prazoAdicionalDias` era gravado na rerratificação e não chegava a
lugar nenhum. O valor tinha cache (`Obra.valorAditivado`) e propagação; o prazo
não tinha nenhum dos dois. Dias restantes e farol continuavam contando pelo
término do contrato assinado.

**Ela também preencheu "Término real" à mão** com 21/11/2026 e nada mudou — o
campo era decorativo, gravado e exibido, sem entrar em conta nenhuma. Aí estava
a divergência de vocabulário: no banco `dataTerminoReal` foi modelado como "a
obra acabou neste dia"; ela usava como "o término que vale hoje". Obra
prorrogada e ainda em execução tem término vigente, não tem término real.

**Perguntado e respondido (22/09/2026):** propusemos manter o término previsto
do contrato intocado e criar um **Término vigente** ao lado, que soma o prazo
aprovado, com os dias restantes e o farol contando por ele. Resposta dela:
*"Desse jeito está ótimo. Isso só quando estiver aprovada."*

**Como ficou:**

- `dataPrevistaTermino` continua sendo a do contrato assinado e **não é
  reescrita** por rerratificação — pedido explícito: *"mas não alterar o
  contrato"*.
- `Obra.prazoAditivadoDias` é cache da soma do prazo das **aprovadas**, mesmo
  papel e mesmo lugar de escrita do `valorAditivado`. Rerratificação em
  tramitação não prorroga nada, confirmado por ela na mesma conversa.
- O término vigente é derivado (`modules/obras/prazo.ts`), some sozinho se a
  rerratificação sair de aprovada, e alimenta dias restantes, percentual
  transcorrido e farol.
- **"Término real" virou "Término efetivo"**, com dica de quando preencher, e
  só aparece na aba Resumo depois que a obra termina de fato.

**O que fica em aberto:** suspensão de prazo continua sem modelagem — quando
existir, entra pelo mesmo caminho do prazo aditivado, não por data digitada à
mão. Pedida em 24/09/2026 — ver ponto #26.

## 26. Pedidos de 24/09/2026 — pagamento e suspensão 🟡 parcialmente implementado

Pedidos do Junior, pela Fernanda, por mensagem em 24/09/2026:

1. *"Só pagamento pendente"* vira **"Pagamento pendente"**, mantendo a caixa.
2. **Suspensão de prazo** na aba Rerratificações — *"depois irá voltar de onde
   parou, prazo não vai contar"*.
3. **Marcar como paga na própria linha** da medição, com a data ao lado; a
   data sai do formulário.
4. **Quadro no painel** com o valor somado e a quantidade de medições com
   pagamento pendente; o quadro abre **uma lista** — obra, medição, valor —
   *"apenas informativa"*: alterar continua dentro da medição.
5. A **observação da aba Contrato** também no cartão do painel.

**Implementado em dev (24/09/2026):** 1, 3, 4 e 5. Escolhas nossas, a
confirmar com a tela aberta:

- **O botão "Marcar como paga" só aparece em Protocolada e Aprovada.** Rascunho
  ainda não tem protocolo, e o formulário exige protocolo a partir de
  Protocolada — pagar um rascunho seria um atalho em volta dessa trava.
- **"Desfazer" volta a medição para Aprovada** e apaga a data. O sistema não
  guarda a situação anterior ao pagamento, e pagamento só sai depois do aceite.
- **O formulário não escolhe mais "Paga"** nem mexe na data. Medição paga
  mostra a situação fixa. Dois caminhos para o mesmo dado eram o risco: o
  formulário salvo sem o campo apagaria a data gravada pelo botão.
- **Data do pagamento no futuro é recusada.**
- **O quadro e a lista seguem os filtros do painel**, para a soma bater.
- **Observação no cartão limitada a três linhas**; o texto inteiro fica ao
  passar o mouse e na aba Resumo.

**Em aberto — muda número que a diretoria vê:** o que conta como pendente.
Hoje é Rascunho, Protocolada e Aprovada (ponto #24). A primeira mensagem dela
foi *"não é referente ao nosso pagamento pendente"*, o que sugere que para eles
seja só a aprovada. A mesma regra decide o quadro, a lista e o filtro — é uma
linha em `pagamentoPendente` (`modules/medicoes/filtros.ts`).

A planilha que ela mostrou como modelo tem **uma quarta coluna**, cortada na
foto. Perguntar o que é antes de acrescentar.

**Suspensão de prazo — não implementada, bloqueada.** Não vira mais uma
rerratificação: rerratificação tem percentual obrigatório, valor ou prazo,
numeração e entra na variação do contrato; suspensão tem início e retomada.
Fica como registro próprio, mostrado dentro da aba Rerratificações. Antes de
modelar, perguntar:

- O registro tem **data de início e de retomada**? A retomada pode ficar em
  aberto enquanto não se sabe?
- Precisa de **aprovação**, como a rerratificação, ou vale pela data?
- **Durante a suspensão, o ciclo de medição para também?** Se não parar, a
  obra fica vermelha com "Medição vencida" sem poder medir.
- Suspensa é o mesmo que a situação **Paralisada**, que hoje deixa o farol
  sempre vermelho?

**Custo de mudar:** baixo para as escolhas do pagamento. A suspensão é
migration nova e mexe em prazo, farol e painel. Enquanto a retomada estiver em
aberto o término anda um dia por dia, então não cabe em coluna cache como o
prazo aditivado — é calculada na leitura. E obra cujo término já foi corrigido
à mão por causa de suspensão contaria os dias duas vezes: listar as obras cujo
término gravado difere de ordem de início + prazo e revisar uma a uma.

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
- **Arquivos de projeto (DWG/RVT) não entram no sistema** (ponto #2, confirmado
  em 09/09/2026): continuam na rede. O sistema administra **processo**, não a
  obra — eles já têm outro sistema para gerir obra.
- **Avanço físico sai do sistema** (ponto #5, decidido em 09/09/2026): só
  financeiro. Planilha de quantitativos e cronograma físico-financeiro foram
  levantados e descartados na mesma conversa.
- **Auditoria aprovada como está**, incluindo o registro de entrada e saída de
  sessão, que havia sido oferecido como removível: *"não, pode deixar"*.
- **A base de demonstração não é zerada** para a entrega de teste: o Diego
  preferiu manter as obras fictícias como parâmetro de preenchimento e criar as
  reais ao lado.
- **O engenheiro em campo não acessa o sistema**: levanta em obra, o escritório
  lança. Aplicativo de campo foi mencionado como ideia futura, sem escopo.
- **O cadastro de responsáveis sai do sistema** (21/09/2026, pedido da
  Fernanda): o nome de quem assina a medição é digitado na própria medição. Os
  nomes já lançados foram copiados na migration. O que se perde é a
  padronização do nome — dois jeitos de escrever a mesma pessoa viram duas —,
  e foi escolha do cliente.
- **Prazo adicional aprovado prorroga a obra** (ponto #25, 22/09/2026): o
  término do contrato não muda, entra um "Término vigente" derivado, e só
  rerratificação **aprovada** conta.
- **A lista de documentos do contrato veio do cliente** (21/09/2026), com
  dezessete itens. As escolhas que fizemos ao implementá-la estão no ponto #18.
- **Amarelo dez dias antes do vencimento da medição** (ponto #13, número dado
  pelo cliente em 09/09/2026 e confirmado duas vezes). É o único limite do farol
  que não é mais suposição nossa — já implementado, e medição que vence *hoje*
  ainda é amarela.

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
