# Requisitos — Sistema de Gestão de Obras (AJA Grupo Empresarial)

> Fonte: análise do mockup de tela (`raw/mockup.html`) + validação técnica de um engenheiro
> do cliente sobre o documento de requisitos. Pontos marcados **[VALIDADO]** foram confirmados
> como estão. Pontos marcados **[AJUSTADO]** tiveram o entendimento corrigido — leia com atenção,
> pois alteram escopo em relação à análise inicial. Pontos marcados
> **[AJUSTADO 09/09]** foram decididos na apresentação do sistema à diretoria —
> notas em [`raw/apresentacao-diretoria.md`](raw/apresentacao-diretoria.md),
> desdobramento em [`etapas-e-status.md`](etapas-e-status.md) (etapa 13).

## 1. Requisitos Funcionais

### 1.1 Autenticação e controle de acesso — [VALIDADO]
- Login e cadastro de usuários.
- Perfis/papéis de acesso (ex.: Administrador e outros níveis de permissão por tela/ação).
- Recuperação de senha e gestão de conta.

### 1.2 Gestão de Obras — [VALIDADO, com ajuste em 09/09]
- CRUD completo de obras (contratante, contrato, datas, responsável).
- Cadastro de responsáveis/equipe, separado do cadastro de usuários do sistema.
- **[AJUSTADO 09/09] Não existe responsável fixo por obra.** São 15 a 20
  contratos para três pessoas no setor: quem estiver disponível trata, e às
  vezes duas pessoas tratam a mesma obra. O "responsável técnico" do cadastro do
  contrato passa a ser **operador**, atribuído pelo próprio usuário na aba
  resumo, apenas enquanto a obra estiver em atenção ou crítico — e o nome fica
  registrado como o último que mexeu. Qualquer regra que amarre uma pessoa a um
  contrato está errada.
- **[AJUSTADO 09/09] Código da obra fica**, no cadastro e no cartão do painel: o
  cliente padroniza nomenclatura de obra na rede e quer o mesmo código nos dois
  lugares — é a chave que liga a obra no sistema à pasta dela na rede.

### 1.3 Motor de regras — "farol" de status — [VALIDADO, com ajuste em 09/09]
- Cor do farol é calculada automaticamente (ex.: proximidade de prazo, dias parado).
- O farol é da **obra inteira**, e basta um critério para acender (validação de
  07/09). São três faixas mais o cinza de obra não iniciada.
- **[AJUSTADO 09/09]** Sai o critério de **avanço físico atrás do tempo
  decorrido** — o dado deixa de existir (ver 1.4). Entra o **prazo da próxima
  medição**, com número já definido pelo cliente: **amarelo dez dias antes** do
  vencimento, vermelho quando vencer.
- Os demais limites numéricos seguem sem confirmação do cliente.

### 1.4 Medições e financeiro — [AJUSTADO 09/09 — IMPORTANTE]
- **O acompanhamento de avanço físico sai do sistema.** Só financeiro: %
  medido, saldo a medir, valor contratado × medido — tudo calculado. O "%
  executado" físico deixa de ser pedido, some do formulário de medição, do
  resumo da obra, do cartão e dos relatórios.
- **Por que:** sem alguém alimentando semanalmente o número não é verdadeiro, e
  um físico falso ao lado de um financeiro correto estraga a leitura dos dois.
  A informação importa para o cliente, mas não neste sistema — que administra
  **processo** (prazo, pendência, documentação), não a execução da obra: para
  isso eles já têm outro sistema. Carga de planilha de quantitativos e de
  cronograma físico-financeiro foram levantadas e descartadas na mesma conversa.
- Histórico de medições por obra, com protocolo, nota fiscal e ISS associados.
- Dados fiscais/financeiros via cadastro manual (sem integração externa prevista).

### 1.5 Tramitação de processos (workflow) — [AJUSTADO — IMPORTANTE]
**Mudança em relação à análise inicial:** o fluxo **NÃO é configurável por contratante/órgão**.

- A sequência de etapas é **sempre a mesma**, independente do contratante:
  busca em plataforma de licitação → habilitação/classificação/homologação → assinatura de
  contrato → garantia → ordem de início → execução da obra → medições → (rerratificação,
  quando houver) → finalização → aceite → atestado.
- O que pode variar de contrato para contrato é **a ausência de uma etapa**, não a ordem.
  Etapas que não se aplicam a um contrato específico devem poder ser marcadas como
  **"não se aplica"**, mas a sequência-base do fluxo é fixa e não precisa ser configurável
  por órgão/cliente.
- **Impacto prático:** isso reduz bastante a complexidade do motor de workflow — não é
  necessário construir um builder de fluxo dinâmico. Um fluxo fixo, com etapas que podem
  ser habilitadas/desabilitadas por contrato, atende ao requisito real.
- Mantido: registro de entrada/saída por setor, cálculo automático de tempo de permanência
  em cada etapa.

### 1.6 Gestão documental — [VALIDADO, com nota]
- Upload múltiplo por contexto (obra, contrato, medição, etapa, rerratificação).
- Central de documentos com rastreabilidade de origem (vínculo com a entidade que originou
  o arquivo).
- **Formatos — [AJUSTADO 09/09]**: PDF, XLSX, XLS, CSV, JPG, PNG. **Arquivos de
  engenharia (DWG, RVT) não entram no sistema** — decidido pelo dono da empresa:
  projeto continua no compartilhamento de rede, porque serve à consulta técnica
  e não ao controle de processo. A trava de formato deixa de ser provisória.
- **[AJUSTADO 09/09] Lista de documentos padrão por obra**: a aba deve listar o
  que se **espera** de cada obra, dizendo *não anexado* ou *anexado em tal data*,
  com espaço livre no fim para o que estiver fora da lista — para o operador não
  depender de memória. A lista dos documentos ainda não veio do cliente.
- Arquivos podem ser grandes (mencionado até ~300MB), mas **isso não é um problema técnico
  crítico** porque o sistema roda 100% na rede local da empresa — os arquivos residem no
  servidor da própria empresa, sem upload para nuvem.
- Busca e filtros por tipo de documento e por origem.

### 1.7 Rerratificações (aditivos contratuais) — [AJUSTADO]
**Mudança em relação à análise inicial:** o sistema **não precisa listar/detalhar os itens
alterados individualmente** — isso já fica evidenciado no próprio arquivo Excel que é
apresentado ao órgão público.

- O que o sistema deve mostrar é o **resultado agregado do impacto**: percentual alcançado
  e valor impactado/alcançado pela rerratificação — não um detalhamento item a item.
- **Impacto prático:** simplifica a modelagem de dados dessa aba — não precisa de uma
  estrutura granular de "item alterado", só de um resumo (percentual + valor).
- Mantido: upload do arquivo Excel de origem, documentos anexos, observações.

### 1.8 Histórico e auditoria — [VALIDADO]
- Log de auditoria automático: toda ação relevante gera registro com autor, data/hora e
  descrição.

### 1.9 Dashboard e relatórios — [VALIDADO / AJUSTADO]
- Indicadores agregados (obras em andamento, valor contratado, valor medido, processos
  parados, medições atrasadas).
- **Exportação de relatórios: formatos confirmados = XLS e PDF.** (antes estava em aberto)
- Busca e filtros no painel por obra, contrato, protocolo, responsável e status (farol).

## 2. Requisitos Não Funcionais

- **Segurança/LGPD**: dados de contratos públicos e pessoas (servidores, responsáveis) —
  avaliar exigências de proteção de dados e trilha de auditoria.
- **Responsividade**: uso multi-dispositivo (tablet/celular) esperado desde o início.
- **Escalabilidade**: múltiplas obras, cada uma com múltiplas medições/etapas/documentos —
  volume de arquivos cresce rápido, especialmente se entrarem arquivos de engenharia (DWG/RVT).
- **Confiabilidade/disponibilidade**: sistema crítico para controle de prazos — indisponibilidade
  tem custo real. **Infraestrutura (servidor, backup, energia) é responsabilidade do cliente**,
  não do desenvolvedor (ver contrato).
- **Usabilidade**: usuários não necessariamente técnicos — nomenclatura do setor público
  (protocolo, tramitação, controladoria), formatação PT-BR (datas, moeda).
- **Auditabilidade/rastreabilidade**: toda ação relevante gera registro imutável no histórico.
- **Armazenamento de arquivos**: 100% local, no servidor da empresa — **sem necessidade de
  storage em nuvem**. Isso é uma decisão confirmada, não um "ainda a definir".
- **Rede**: sistema acessado apenas via rede local da empresa, sem exposição externa/internet
  pública.

## 3. Pontos ainda em aberto (levar para próxima conversa com o cliente)

- Limites numéricos de cada cor do farol (o desenho e as cores estão fechados;
  faltam os números, exceto os dez dias do prazo de medição).
- ~~Upload de arquivos de engenharia (DWG/RVT)~~ — **resolvido em 09/09: não
  entram.**
- Detalhamento fino das permissões por perfil de usuário (o que cada perfil vê/edita).
  Os quatro perfis ficam; falta a matriz linha a linha e a decisão de deixar
  **só o administrador apagar** qualquer registro.
- **Quais são os documentos padrão** da lista de conferência (item 1.6), se ela
  é a mesma para todo contratante, e como marcar documento que não se aplica.
- **Se os cards de totais do topo do painel ficam** — pedido de remoção pela
  diretoria e defendido pelo setor de engenharia na mesma reunião; o cliente
  ficou de resolver internamente.
