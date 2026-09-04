# Validação técnica com o engenheiro do cliente — notas condensadas

Referência de origem para os pontos [AJUSTADO] em `docs/requisitos.md`. Consultar apenas se
precisar do "porquê" por trás de uma decisão de escopo.

**Fluxo de tramitação**: a sequência de etapas é sempre a mesma, independente do contratante
— busca de licitação → habilitação/classificação/homologação → contrato → garantia → ordem
de início → obra → medições → (rerratificação, se houver) → finalização → aceite → atestado.
Contratos que não têm determinada etapa devem marcá-la como "não se aplica", em vez de mudar
a ordem do fluxo.

**Formatos de documento**: além de PDF/XLSX/XLS/CSV/JPG/PNG, o cliente pode precisar de DWG,
RVT e outros formatos de projeto de engenharia — decisão ainda não fechada com o dono da
empresa. Arquivos de projeto podem ser grandes (até ~300MB), mas isso não é problema técnico
porque o sistema roda 100% na rede interna, com arquivos residindo no servidor da própria
empresa (sem upload para nuvem).

**Rerratificações**: o próprio Excel apresentado ao órgão já evidencia os itens alterados —
o sistema só precisa mostrar o resultado agregado (percentual e valor impactado), não o
detalhamento item a item.

**Relatórios**: formatos de exportação confirmados = XLS e PDF.

**Confirmação do modelo de deploy**: reforçado que o sistema é de uso interno, na rede da
empresa, sem necessidade de publicação na internet — indo ao encontro do que já havia sido
combinado com o Henrique (contato inicial do lado do cliente).
