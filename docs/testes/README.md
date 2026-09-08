# Roteiro de teste manual — antes da apresentação

Sessão de validação ponta a ponta do sistema, para rodar com a tela aberta
antes da reunião com o cliente. Não substitui os testes automatizados
(`npm test`, 231 casos nos módulos) — cobre o que eles não alcançam: as telas,
as rotas, as permissões e o percurso completo de uma obra.

Vale como a primeira metade do item 2 da **etapa 12**
([`../etapas-e-status.md`](../etapas-e-status.md)): "testes de integração ponta
a ponta, atravessando etapas escritas em momentos diferentes".

## Como usar

1. Prepare o ambiente (abaixo). **Banco limpo, sempre** — caso de teste que
   depende de sujeira da rodada anterior não é reproduzível.
2. Percorra os arquivos na ordem numérica. Cada um cabe em 30–45 min e supõe
   que o anterior passou.
3. Marque `[x]` no que passou. O que falhar vira uma linha em
   [Registro de achados](#registro-de-achados) — anote na hora, não no fim.
4. Casos marcados 🎯 são **decisões a calibrar com o cliente**, não defeitos:
   anote a resposta dele e leve para [`../pontos-para-reuniao.md`](../pontos-para-reuniao.md).
5. Casos marcados ⚠️ exercitam **achados já conhecidos** da revisão de código,
   adiados para a etapa 12. Falhar ali é o esperado — serve para você saber
   exatamente o que o cliente veria se esbarrasse neles na apresentação.

## Preparo do ambiente

```bash
npm run db:reset                 # derruba, recria e roda as migrations
npm run db:seed -- --demo        # admin + 4 obras com faróis diferentes
npm run dev
```

O seed base cria **um único usuário**:

| E-mail | Senha | Perfil |
|---|---|---|
| `admin@ajagrupo.local` | `mudar@123` | Administrador |

(sobrescritos por `SEED_ADMIN_EMAIL` / `SEED_ADMIN_SENHA`, se definidos)

O `--demo` acrescenta: contratante "Prefeitura Municipal de Exemplo",
responsável "João Silva", 7 setores (Protocolo, Engenharia, Fiscalização,
Controladoria, Jurídico, Financeiro, Gabinete) e 4 obras desenhadas para
acender os quatro faróis:

| Código | Objeto | Farol esperado |
|---|---|---|
| `OBR-DEMO-001` | Reforma da Unidade Centro | 🟢 verde — prazo folgado |
| `OBR-DEMO-002` | Adequação Elétrica – Unidade Norte | 🟡 amarelo — término próximo |
| `OBR-DEMO-003` | Manutenção Predial – Bloco B | 🔴 vermelho — prazo vencido |
| `OBR-DEMO-004` | Ampliação do Almoxarifado Central | ⚪ cinza — sem ordem de início |

As datas do demo são relativas a hoje, então o farol não envelhece entre uma
rodada e outra.

### Usuários de teste (criar antes de começar)

O seed não cria os outros perfis — o arquivo [01-acesso.md](01-acesso.md) começa
criando os três, e isso já é o primeiro teste. Sugestão de senha única para
todos, para não perder tempo: `teste@123`.

| E-mail | Perfil |
|---|---|
| `gestor@ajagrupo.local` | Gestor |
| `operacional@ajagrupo.local` | Operacional |
| `visualizador@ajagrupo.local` | Visualizador |

Use uma **janela anônima por perfil**, ou o teste de permissão vira um
carrossel de logout.

### Dica de mecânica

- Data e dinheiro são pt-BR na tela. Ao conferir um cálculo, confira o
  **separador decimal** também — é onde erro de formatação se esconde.
- Testar responsividade não exige tablet: as DevTools em ~768px de largura
  pegam o que interessa (requisito não funcional de multi-dispositivo).
- Para os casos de "arquivo grande" e "formato recusado", há um gerador pronto
  no fim de [05-documentos.md](05-documentos.md).

## Os arquivos

| # | Arquivo | Cobre | Prefixo |
|---|---|---|---|
| 01 | [Acesso e permissões](01-acesso.md) | login, freio, senha, RBAC nos 4 perfis, usuários | `ACS` |
| 02 | [Obras e cadastros](02-obras-e-cadastros.md) | CRUD de obras, código, prazo, contratante/responsável/setor, CNPJ | `OBR` |
| 03 | [Medições](03-medicoes.md) | cálculos, ISS, numeração, status, periodicidade | `MED` |
| 04 | [Tramitação](04-tramitacao.md) | fluxo fixo, entrada/saída, dias parado, "não se aplica" | `TRA` |
| 05 | [Documentos](05-documentos.md) | upload múltiplo, formatos, origem, central, exclusão | `DOC` |
| 06 | [Rerratificações](06-rerratificacoes.md) | impacto agregado, limite de 25%, efeito no contrato | `RER` |
| 07 | [Painel, farol, auditoria e relatórios](07-painel-e-relatorios.md) | indicadores, filtros, histórico, exportação | `PNL` |

## Matriz de cobertura

Amarra cada bloco ao requisito que ele valida — se um requisito não tem
caso, é buraco de roteiro, não de sistema.

| Requisito ([requisitos.md](../requisitos.md)) | Arquivo |
|---|---|
| 1.1 Autenticação e controle de acesso | 01 |
| 1.2 Gestão de obras | 02 |
| 1.3 Motor de regras — farol | 07 |
| 1.4 Medições e financeiro | 03 |
| 1.5 Tramitação (fluxo fixo) | 04 |
| 1.6 Gestão documental | 05 |
| 1.7 Rerratificações | 06 |
| 1.8 Histórico e auditoria | 07 |
| 1.9 Dashboard e relatórios | 07 |
| 2. Responsividade / usabilidade pt-BR | transversal, marcado em cada arquivo |
| 2. Sem dependência de internet | 07 (PNL-20) |

## Registro de achados

Uma linha por falha. `Gravidade`: **alta** = trava a apresentação ou corrompe
dado; **média** = usuário consegue contornar; **baixa** = cosmético.

| # | Caso | O que aconteceu | Gravidade | Situação |
|---|---|---|---|---|
| 1 | | | | aberto |

## Decisões para levar ao cliente

Preencher a partir dos casos 🎯. Depois, transcrever para
[`../pontos-para-reuniao.md`](../pontos-para-reuniao.md).

| Caso | Pergunta | Resposta do cliente |
|---|---|---|
| | | |
