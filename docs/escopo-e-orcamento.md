# Escopo e Orçamento Fechados

Contrato fechado: **R$ 10.000,00** por **140 horas** de desenvolvimento (R$70/h), em 4 parcelas.
Instalação **fora** desse valor, a definir após visita técnica à infraestrutura do cliente.
Detalhes completos: ver contrato assinado (fora deste repositório).

## Distribuição de horas por módulo (referência de priorização)

| Módulo | Horas orçadas | Nota |
|---|---|---|
| Auth + perfis de acesso (RBAC) | 12h | |
| CRUD de obras + dashboard/filtros | 18h | |
| Motor do "farol" (regra de status) | 6h | critérios exatos ainda em aberto com cliente |
| Medições + cálculos financeiros | 18h | |
| Tramitação (workflow) | 30h | **fluxo é FIXO, não configurável** — ver requisitos.md 1.5; sobra de horas aqui é esperada |
| Gestão documental | 24h | formatos de engenharia (DWG/RVT) ainda não confirmados — não implementar até confirmar |
| Rerratificações | 8h | simplificado: só resumo agregado, não item a item — ver requisitos.md 1.7 |
| Histórico/auditoria | 8h | |
| Relatórios/exportação | 12h | formatos confirmados: XLS e PDF |
| Ajustes, integração e testes gerais | 7h | |
| **Total desenvolvimento** | **143h*** | |

\* A soma dos módulos é 143h; o valor fechado com o cliente foi por 140h. Pequena folga
negativa a considerar durante o desenvolvimento — não é motivo para renegociar, mas vale
não estourar módulos individuais.

## Decisões de escopo que restringem a implementação

- **Banco de dados novo, do zero** — sem migração de dados de sistema legado.
- **Deploy 100% on-premise**, servidor do próprio cliente, acesso restrito à rede local —
  sem hospedagem em nuvem, sem domínio público.
- **Backup, energia (nobreak/UPS) e disponibilidade do servidor são responsabilidade do
  cliente**, não do desenvolvedor.
- **Sem manutenção incluída** após aceite definitivo (2ª reunião de validação), exceto os
  cenários específicos descritos no contrato.
- Mínimo de **2 reuniões de validação remota** com dados fictícios antes da instalação final.
