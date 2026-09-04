# Pontos para a Reunião de Validação

Decisões que assumimos para não travar o desenvolvimento, a confirmar com o
cliente junto da demonstração do MVP. Cada ponto traz **o que assumimos**, **o
que custa mudar** e **onde mexer** — para a resposta do cliente virar ajuste
imediato, não retrabalho.

Ordenados por custo de mudar, do mais caro para o mais barato.

- **Status:** `🔴 aberto` · `🟡 assumido, a confirmar` · `🟢 confirmado`
- **Última atualização:** 04/09/2026

## Índice

| # | Ponto | Status | Custo de mudar |
|---|---|---|---|
| 1 | Critérios de cor do farol | 🟡 | Baixo |
| 2 | Upload de DWG/RVT | 🔴 | Baixo a alto |
| 3 | Permissões por perfil | 🟡 | Baixo |
| 4 | Obra ↔ contrato é 1:1 | 🟡 | **Alto** |
| 5 | Percentual executado é digitado | 🟡 | Médio |
| 6 | Setores de tramitação | 🟡 | Baixo |
| 7 | Numeração de medições e rerratificações | 🟡 | Médio |
| 8 | Exclusão de registros | 🟡 | Médio |
| 9 | Retenções além do ISS | 🔴 | Médio |
| 10 | Conteúdo dos relatórios | 🔴 | Médio |
| 11 | Forma de instalação no servidor | 🔴 | Médio |

---

## 1. Critérios exatos de cada cor do farol 🟡

Declarado em aberto nos próprios requisitos (seção 3).

**Assumimos** — três critérios combinados, valendo sempre o pior:

| Critério | 🟡 Atenção | 🔴 Crítico |
|---|---|---|
| Proximidade do término previsto | faltam ≤ 30 dias | prazo vencido |
| Processo parado no mesmo setor | ≥ 15 dias | ≥ 30 dias |
| Avanço físico atrás do tempo decorrido | ≥ 10 p.p. | ≥ 25 p.p. |

Mais: obra paralisada é sempre 🔴; finalizada é 🟢; sem ordem de início fica
⚪ cinza (sem dados), não verde.

**Perguntar:** os limites fazem sentido na prática do cliente? Faltou algum
critério — por exemplo, medição atrasada ou garantia vencendo?

**Custo de mudar:** baixo. Números isolados em `LIMITES_PROVISORIOS`.
**Onde:** `src/modules/farol/regras.ts`.

## 2. Upload de arquivos de engenharia (DWG/RVT) 🔴

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

## 4. Uma obra tem exatamente um contrato 🟡

**O ponto mais caro da lista.** Os requisitos tratam obra e contrato como a
mesma coisa ("CRUD de obras: contratante, contrato, datas, responsável").

**Assumimos** 1:1: os campos de contrato (`numeroContrato`, `valorContratado`,
datas) são colunas da obra.

**Perguntar:** existe obra com mais de um contrato — lotes, contratos
complementares, consórcio? Existe contrato guarda-chuva cobrindo várias obras?

**Custo de mudar: alto.** Separar `Contrato` em tabela própria mexe em obras,
medições, rerratificações, relatórios e em todos os cálculos financeiros.
Barato agora, caro depois da etapa 5. **É a primeira pergunta a fazer na
reunião.**
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

**Custo de mudar:** médio — a restrição de unicidade está no banco.
**Onde:** `prisma/schema.prisma`, `@@unique([obraId, numero])`.

## 8. O que acontece ao excluir um registro 🟡

**Assumimos:**

- **Documentos:** exclusão lógica (`excluidoEm`). O arquivo some da tela, o
  registro fica para a auditoria.
- **Obras, medições, etapas:** exclusão física, em cascata.
- **Auditoria:** nunca. Trigger no banco bloqueia UPDATE e DELETE.

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

**Perguntar:** a medição sofre outras retenções? O cliente precisa do valor
líquido a receber, ou o bruto medido basta?

**Custo de mudar:** médio — campos novos em `Medicao` e ajuste nos cálculos e
relatórios.
**Onde:** `prisma/schema.prisma`, `src/modules/medicoes/calculos.ts`.

## 10. Conteúdo dos relatórios 🔴

Formatos confirmados (XLS e PDF), conteúdo não.

**Assumimos** três relatórios: obras com farol e situação financeira; medições
por obra e por período; tempo de permanência por etapa e setor.

**Perguntar:** quais relatórios são realmente usados hoje, e para quem vão —
uso interno ou prestação de contas ao órgão? Existe modelo/layout obrigatório?

**Custo de mudar:** médio, e cresce se houver layout obrigatório de órgão
público — as 12h orçadas assumem relatório tabular direto.
**Onde:** `src/modules/relatorios/`.

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
