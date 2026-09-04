# Requisitos — Sistema de Gestão de Obras (AJA Grupo Empresarial)

> Fonte: análise do mockup de tela (`raw/mockup.html`) + validação técnica de um engenheiro
> do cliente sobre o documento de requisitos. Pontos marcados **[VALIDADO]** foram confirmados
> como estão. Pontos marcados **[AJUSTADO]** tiveram o entendimento corrigido — leia com atenção,
> pois alteram escopo em relação à análise inicial.

## 1. Requisitos Funcionais

### 1.1 Autenticação e controle de acesso — [VALIDADO]
- Login e cadastro de usuários.
- Perfis/papéis de acesso (ex.: Administrador e outros níveis de permissão por tela/ação).
- Recuperação de senha e gestão de conta.

### 1.2 Gestão de Obras — [VALIDADO]
- CRUD completo de obras (contratante, contrato, datas, responsável).
- Cadastro de responsáveis/equipe, separado do cadastro de usuários do sistema.

### 1.3 Motor de regras — "farol" de status — [VALIDADO]
- Cor do farol é calculada automaticamente (ex.: proximidade de prazo, dias parado).
- Critérios exatos de cada cor ainda precisam ser detalhados com o cliente.

### 1.4 Medições e financeiro — [VALIDADO]
- Cálculo automático de % executado, % medido, saldo a medir, valor contratado x medido.
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
- **Formatos**: além de PDF, XLSX, XLS, CSV, JPG, PNG — considerar também formatos de
  engenharia (**DWG, RVT** e possivelmente outros, dependendo do software usado pelo
  cliente). Essa parte ainda está em aberto: o cliente (dono da empresa) ainda não decidiu
  se esses arquivos de projeto vão morar dentro do sistema ou ficar em outro lugar — **não
  assumir, confirmar antes de implementar upload de CAD**.
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

- Critérios exatos de cada cor do farol.
- Decisão final sobre suportar upload de arquivos de engenharia (DWG/RVT) dentro do sistema
  ou não — e se sim, algum limite de tamanho por upload.
- Detalhamento fino das permissões por perfil de usuário (o que cada perfil vê/edita).
