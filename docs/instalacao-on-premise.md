# Instalação on-premise — plano

**Status: implementado em 09/09/2026, não ensaiado em Windows.** As peças da
seção 6 existem no repositório (branch `prod`); o que falta é rodá-las numa
máquina Windows. O pacote foi montado e a aplicação subiu em teste local, mas
**nenhum dos `.ps1` jamais executou** — não há Windows no ambiente de
desenvolvimento. Ver "O que ainda não foi testado" na etapa 14 de
[`etapas-e-status.md`](etapas-e-status.md).

**Passo a passo para executar:** [`roteiro-instalacao.md`](roteiro-instalacao.md).
Este documento é o plano e o porquê; o roteiro é o que fazer, na ordem.

A instalação está **fora das 140h contratadas** (`README.md`, "Instalação no
cliente"): é *"a definir após visita técnica"*. As perguntas ainda sem resposta
estão consolidadas no ponto **#11 de [`pontos-para-reuniao.md`](pontos-para-reuniao.md)**;
a seção 7 aqui lista só as que este plano acrescenta.

> ## ⚠️ Cenário revisado — 09/09/2026
>
> A versão anterior deste documento assumia *"servidor com acesso de saída à
> internet"*. **Isso foi contrariado pelo cliente.** O que o Júnior descreveu:
>
> - **Não é um servidor.** É uma máquina robusta, mas uma estação de trabalho.
> - **Windows comercial (10/11), não Windows Server.**
> - **Sem acesso à internet, por decisão, não por falta de infraestrutura.**
>   Nas palavras dele, *"tudo aqui é estanque"* — coerente com a reação na
>   apresentação (*"não queria que isso fosse público"*).
> - A rede já tem compartilhamentos por departamento, com permissão por área
>   (engenharia, DP), montados pelo próprio Júnior com ajuda de terceiro.
> - A ideia dele é publicar um atalho para o sistema numa pasta comum a todos.
>
> **Consequência maior:** cai o desenho "servidor baixa o Release do GitHub".
> A entrega passa a ser **por mídia removível** — seção 3. O resto do plano
> (release versionada, symlink, rollback, dump antes de migrar) sobrevive
> intacto; muda de onde o pacote vem.

---

## 1. Desenho físico: o que roda na máquina

O ponto que costuma confundir quem chega ao projeto: **não existe "frontend"
separado do "backend".** O Next entrega os dois no mesmo processo. O que roda na
máquina do cliente é uma coisa só — um processo Node — servindo tanto o HTML e
o JS que o navegador baixa quanto as Server Actions que gravam no banco. Não há
API separada, não há build de SPA para hospedar em outro lugar, não há segundo
serviço.

São **três peças**, todas na mesma máquina:

```
Máquina do cliente (Windows, rede interna, sem internet)
│
├── Processo Node — a aplicação inteira              :3000
│     D:\aja-obras\current\server.js
│     Rodando como Serviço do Windows (NSSM).
│     Serve as telas E executa a regra de negócio.
│     Fala com o Postgres por localhost.
│
├── PostgreSQL — instalado nativamente, sem Docker   :5432 (só localhost)
│     Obras, medições, usuários, auditoria
│     e os METADADOS dos documentos.
│
└── D:\aja-obras\storage\ — os arquivos
      <obraId>\<uuid>.pdf
      Os BYTES dos documentos, em disco.
```

### Onde mora cada dado

| Dado | Onde fica | Por quê |
| --- | --- | --- |
| Obras, contratos, medições, tramitação, usuários, auditoria | PostgreSQL | Dado relacional, consultado e agregado. |
| Metadados do documento (nome original, tipo, tamanho, hash SHA-256, quem enviou, `caminhoRelativo`) | PostgreSQL, tabela `Documento` | É o índice: sem ele, os arquivos em disco são UUIDs sem significado. |
| Bytes do documento | Disco, `storage\<obraId>\<uuid>.<ext>` | `STORAGE_DRIVER=disco` — ver abaixo. |
| Telas, JS, CSS | Dentro da release, servidos pelo processo Node | Compilados no build; não são dado do cliente. |
| Segredos (`DATABASE_URL`, `SESSION_SECRET`) | `.env` na máquina, fora da release | Nunca vão para o git nem para o pacote. |

### Por que os blobs vão para o disco e não para o banco

`STORAGE_DRIVER=disco` é o padrão (`.env.example`), e o driver em
`src/lib/storage/disco.ts` grava cada arquivo como `storage/<obraId>/<uuid>`.
A tabela `ArquivoBlob` existe no schema mas **fica vazia** na instalação real:
ela foi criada só para o deploy de demonstração em plataforma serverless, onde
o disco é efêmero — ver [`deploy-homologacao.md`](deploy-homologacao.md).
Documento em `bytea` infla o dump e passa o arquivo inteiro pela conexão do
banco; com uploads de até ~300MB previstos nos requisitos, não é desenho de
produção.

Dois detalhes que não são estéticos:

- **A pasta fica fora de `public/`.** Nada em `storage/` é servido diretamente
  pelo Next. Todo download passa por `src/app/documentos/[id]/route.ts`, que
  confere permissão antes de abrir o arquivo. Mover a pasta para dentro de
  `public/` — a "simplificação" óbvia — faz qualquer pessoa da rede baixar
  qualquer contrato adivinhando a URL.
- **O nome no disco é gerado por nós**, um UUID, nunca o nome que veio do
  navegador (`src/lib/storage/comum.ts`). Nome de upload é entrada de usuário.

> ### 🔴 `storage\` NÃO pode virar pasta compartilhada
>
> O cliente organiza a rede por compartilhamentos com permissão por
> departamento, e a extensão natural desse raciocínio seria compartilhar
> também a pasta dos documentos do sistema. **Não.** As duas camadas de
> permissão são independentes e não se conversam:
>
> | | Permissão de pasta (Windows) | Permissão do sistema |
> | --- | --- | --- |
> | Quem decide | Conta de rede do usuário | Perfil no sistema (Administrador / Gestor / Operacional / Visualizador) |
> | Onde é conferida | Explorer, ao abrir a pasta | `src/app/documentos/[id]/route.ts`, a cada download |
>
> Um `storage\` compartilhado deixa qualquer pessoa com acesso àquele
> compartilhamento abrir qualquer contrato pelo Explorer, **sem passar por
> nenhuma verificação do sistema** — inclusive documentos de obras que ela não
> pode ver na tela. A pasta é acessível apenas pela conta que roda o serviço.

### Como o usuário chega

Navegador na rede interna apontando para `http://<ip-da-maquina>:3000`.

O atalho pretendido pelo cliente (um `.url` numa pasta comum) funciona e é uma
boa ideia — mas exige duas coisas, ambas no checklist da seção 9:

- **IP fixo.** Em DHCP o endereço muda um dia e o atalho quebra para todos de
  uma vez, sem aviso.
- **Firewall do Windows liberando a porta 3000 para entrada.** O padrão
  bloqueia, e o sintoma é "funciona na máquina, não funciona em nenhuma outra".
  O `instalar.ps1` cria a regra **para a sub-rede local, em qualquer perfil de
  rede**: amarrar ao perfil Privado falharia em silêncio se o Windows tivesse
  marcado a rede como Pública.

Colocar o atalho numa pasta aberta a todos **não dá acesso a todos**: o sistema
tem login próprio e o que cada um enxerga depende do perfil dele lá dentro, não
da pasta de onde clicou. O atalho é só um caminho até a porta.

Um proxy reverso (IIS) na frente é **opcional** e resolve duas coisas: atender
na porta 80 sem elevar o Node, e HTTPS quando houver certificado — momento de
virar `COOKIE_SEGURO=true`. Enquanto for HTTP, a flag fica `false`: com ela
ligada em servidor HTTP o navegador descarta o cookie de sessão e **ninguém
consegue entrar**, sem erro em log nenhum.

⚠️ Se a decisão for **ter** proxy reverso, reabre-se a discussão de IP na
auditoria — ver ponto #11.

---

## 2. Layout de diretórios

```
D:\aja-obras\                ← D:, não C: — o C: tem 118 GB, o D: 3,6 TB
├── releases\
│   ├── 2026.09.01\          ← versão anterior, mantida para rollback
│   └── 2026.09.15\          ← nova
├── current                  ← junction para releases\2026.09.15
├── .env                     ← NUNCA vem no pacote
├── storage\                 ← NUNCA vem no pacote
└── backups\
```

O serviço aponta sempre para `current`. É isso que torna o rollback da aplicação
uma troca de atalho mais um restart, em segundos. No Windows use **junction**
(`mklink /J current releases\2026.09.15`): junction não exige privilégio de
administrador nem Modo de Desenvolvedor, ao contrário do symlink (`/D`).

**A atualização troca apenas `releases\`.** Banco, `storage\` e `.env` são os
dados do cliente e sobrevivem intactos a qualquer deploy. O `.env` em particular
guarda o `SESSION_SECRET`: sobrescrevê-lo derruba a sessão de todos os usuários
ao mesmo tempo.

A aplicação roda como **Serviço do Windows**, registrado com
[NSSM](https://nssm.cc/) (`nssm install AjaObras`), com reinício automático e
início no boot — **antes de qualquer login**. Sem isso o sistema só existe
enquanto alguém estiver logado com uma janela de console aberta, e quem fechar
a janela derruba a empresa inteira.

NSSM é um executável único, sem instalador e sem dependência de rede. Ele vai
**dentro do kit** e é copiado para `D:\aja-obras\bin\`, fora de `releases\`: o
serviço fica registrado apontando para o `nssm.exe` usado na instalação, e se
ele sumir o sistema não sobe no próximo boot.

---

## 3. Ciclo de atualização: GitHub Actions → mídia removível → máquina

A máquina do cliente **não tem internet, por decisão do cliente**. Ela nunca
baixa nada, nunca resolve DNS, nunca fala com o GitHub. O GitHub continua
sendo quem **constrói** o pacote — o que muda é o transporte da última perna.

```
sua máquina          GitHub                      máquina do cliente (isolada)
   git tag  ───────► Actions (windows-latest)
                       npm ci + next build
                       monta .zip + .sha256
                            │
                            ▼
                       Release
                            │
   você baixa ◄─────────────┘
      │
      ▼
   link de download ──► máquina COM internet ──► pen drive / pasta de rede
   (você manda)          (o cliente baixa)              │
                                                        ▼
                                                   atualizar.ps1
                                                   (dump, migra, troca junction)
```

**1. Você marca uma versão.** `git tag v2026.09.15 && git push --tags`.

**2. O Actions constrói em Windows.** `npm ci`, `next build` e empacotamento de
um `.zip` autocontido — a aplicação compilada com as dependências dentro. A
máquina do cliente nunca roda `npm install`, nunca compila, nunca clona o
repositório.

> **Por que o build tem que sair do Actions e não da sua máquina, e por que em
> `windows-latest`:** o CLI do Prisma carrega um binário nativo por plataforma.
> O que existe no `node_modules` de desenvolvimento hoje é
> `schema-engine-darwin-arm64` — macOS. Um pacote montado no Mac quebraria no
> passo de migração. **E `ubuntu-latest` quebraria igual**, só que com o binário
> errado ao contrário: o destino é Windows. A regra é *build na plataforma de
> destino*; como o destino mudou de Linux para Windows, o runner muda junto.
> (O cliente Prisma em si é TypeScript puro, porque o projeto usa
> `@prisma/adapter-pg`; o binário é só do CLI de migração.)

**3. O Actions publica um Release** com três coisas: o `.zip`, o `.sha256` e a
nota do que mudou — que vira o aviso mandado ao cliente.

**4. O pacote chega à máquina isolada.** Duas formas, ambas terminando na mesma
mídia:

- **Você leva** presencialmente, em pen drive.
- **Você manda um link de download** (foi o que o Júnior propôs). Ele baixa
  numa máquina **que tenha internet** — a dele, não a do sistema — e passa o
  arquivo à máquina isolada por pen drive ou pela pasta de rede interna.

Nos dois casos a máquina do sistema continua sem tocar na internet: quem baixa
é outra máquina. **O `.sha256` vai junto** e continua sendo conferido — aqui
ele deixa de proteger contra download truncado e passa a proteger contra pen
drive com defeito e cópia interrompida, falhas bem mais comuns. É o script que
confere, não a pessoa.

> **Sobre o link:** o `.zip` é o sistema compilado do cliente. Use link com
> validade e não indexável (não um Release público do GitHub, que o repositório
> privado já impede). Vale combinar com o Júnior por onde ele prefere receber.

**5. O script de atualização roda** (seção 4).

### O que cai por não haver internet

| Cai | Continua valendo |
| --- | --- |
| Download automático do Release pela máquina | Build e versionamento no GitHub Actions |
| **PAT do GitHub guardado na máquina** — some a discussão inteira com a TI | `.zip` + `.sha256` versionados |
| **Timer de atualização automática** — não há o que consultar | Script único, dump antes de migrar, rollback por junction |

**Não existe modo automático neste cenário.** Toda atualização passa por alguém
levando um arquivo até a máquina. Isso é consequência direta do isolamento, não
uma limitação do script — e é um custo que vale declarar ao cliente, porque
significa que correção de bug urgente exige deslocamento ou um funcionário
disponível.

**Descartado, e agora por motivo mais forte:** runner self-hosted no cliente.
Além do problema original (dá execução de comando dentro da rede do cliente a
quem tiver push no repositório), ele exige internet na máquina — que não há.

---

## 4. O script de atualização

Um `.ps1` (PowerShell) entregue dentro do pacote. Sequência, na ordem, com o
motivo de cada passo estar onde está:

1. **Conferir o SHA-256** do arquivo contra o publicado. Pega mídia com defeito
   e arquivo errado antes de qualquer coisa irreversível.
2. **`pg_dump` para `backups\`**, com data no nome. É o único passo sem volta no
   resto do processo, então o dump vem antes — e o script **aborta** se falhar.
3. **Parar o serviço** (`nssm stop AjaObras`).
4. **Extrair** em `releases\<versão>\` e ligar o `.env` da raiz.
5. **`prisma migrate deploy`.** Nunca `migrate dev`, nunca `db push`: só o
   `deploy` aplica exatamente as migrations que faltam, na ordem, sem inventar
   nem apagar.
6. **Apontar `current`** para a nova versão e subir o serviço.
7. **Verificar que respondeu.** Hoje não existe **nenhuma** rota em
   `src/app/api/`, então este passo não tem como ser feito — precisa de um
   `/api/health` devolvendo `200` e a versão. Sem ele, "subiu" é palpite.
8. **Falhou em qualquer ponto:** volta a junction, sobe a versão anterior, e
   imprime o comando de restauração do dump. Restaurar banco não se automatiza.

### O limite do rollback

A junction devolve a aplicação em segundos; **o banco não volta junto.** Uma
migration que remove ou renomeia coluna deixa a versão anterior incompatível com
o banco novo — e o rollback real ali é restaurar o dump, perdendo o que entrou
desde a atualização.

Consequências práticas: janela de manutenção combinada com o cliente, e
migrations destrutivas quebradas em duas versões (uma que para de usar a coluna,
outra, depois, que a remove).

---

## 5. Backup

Formalmente é responsabilidade do cliente (`README.md`), mas o **procedimento**
precisa ser escrito por nós — senão não vai existir.

> **Peso maior neste cenário.** A máquina é uma estação de trabalho: sem disco
> redundante, sem fonte redundante, e provavelmente sem nobreak. Não há
> redundância de hardware nenhuma. O backup deixa de ser boa prática e passa a
> ser a única rede de segurança que existe.

**São dois artefatos acoplados, e nenhum serve sozinho:**

- Só o `pg_dump`: restaura um banco que aponta para arquivos inexistentes.
- Só a `storage\`: arquivos com nome UUID, sem o índice que diz o que é cada um.

**Ordem segura: dump primeiro, `storage\` depois.** Um documento novo sem
registro é lixo inofensivo; um registro sem arquivo é erro na tela do usuário.

**Como ficou (11/09/2026).** O `instalar.ps1` registra a tarefa `AJA Obras -
backup` no **Agendador de Tarefas do Windows**: diária às 22:00, como SYSTEM,
com log em `D:\aja-obras\logs\backup.log`. Antes de terminar, ele roda a tarefa
uma vez, **pela própria tarefa**. O que precisa ser provado é que o backup
funciona sem a sessão de quem instalou.

```
D:\aja-obras\backups\
├── 20260914-220000\banco.dump     um por dia, apagado depois de 30 dias
├── antes-de-<versão>-….dump       da atualização, nunca apagado
└── documentos\                    UMA cópia, acumulada
```

**Os documentos não têm cópia por dia.** O sistema nunca sobrescreve arquivo
(grava com `wx`) e o excluir da tela é lógico, então basta copiar os novos
(`robocopy /E`, sem `/MIR`: nada sai do backup). A primeira versão do script
fazia uma cópia inteira por dia e guardava 30. No disco D:, que é o mesmo das
pastas da empresa, isso ocuparia **30 vezes o volume dos documentos**. Qualquer
dump restaura com essa pasta: arquivo que entrou depois dele é lixo inofensivo.

**O limite, e de quem ele é.** O destino padrão está no mesmo disco dos
documentos. Protege contra exclusão acidental e erro de operação, **não contra
falha do disco, perda da máquina ou vírus que criptografa**. A cópia para fora
da máquina é responsabilidade do cliente: basta passar `-Destino` com outro
disco ou pasta de rede. Isso está no LEIAME e no e-mail de ressalva.

Um backup nunca restaurado não é backup: a restauração precisa ser testada uma
vez, em máquina separada, antes do aceite.

---

## 6. O que precisa ser construído

Nada disto existe hoje. Em ordem de dependência:

**Todos existem desde 09/09/2026** — a coluna "por quê" fica como registro da
razão de cada peça, e os caminhos abaixo foram atualizados para onde as coisas
realmente ficaram.

| # | Item | Onde | Por quê |
| --- | --- | --- | --- |
| 1 | `output: "standalone"` ✅ | `next.config.ts` | Sem isso o pacote não é autocontido e a máquina precisaria de `npm install` com acesso ao registry — impossível, ela não tem internet. |
| 2 | Endpoint de saúde ✅ | `src/app/api/health/route.ts` | Passo 7 do script. Consulta o banco de propósito: 200 só com Postgres respondendo, 503 quando não. |
| 3 | Workflow de release ✅ | `.github/workflows/release.yml` | Build em **`windows-latest`** + publicação do Release, com typecheck, lint e testes antes de empacotar. |
| 4 | Script de empacotamento ✅ | `scripts/empacotar.mjs` (Node, não `.ps1` — roda no runner e dá para testar aqui) | Monta o `.zip` e o `.sha256`. |
| 5 | Script de atualização ✅ | `scripts/instalacao/atualizar.ps1`, entregue no pacote | Seção 4. |
| 6 | Script de instalação inicial ✅ | `scripts/instalacao/instalar.ps1` + `LEIAME.txt` | Máquina zerada até tela de login. Só roda uma vez, mas é o de maior risco. |
| 7 | Serviço NSSM ✅ | registrado pelo `instalar.ps1` | Sobe no boot, antes de login. NSSM levado no pen drive. |
| 8 | Procedimento de backup ✅ | `scripts/instalacao/backup.ps1` + tarefa agendada | Seção 5. |
| 9 | Versão do Node fixada ✅ | `.nvmrc` → `node-versao.txt` no pacote, conferido na instalação | Precisam ser a mesma versão maior; `standalone` traz dependências, **não traz o runtime**. Instalador MSI do Node levado no pen drive. |
| 10 | Criação do primeiro usuário ✅ | `scripts/instalacao/criar-admin.mjs`, dentro de `ferramentas\` | **Não estava no plano.** Sem ele a instalação termina numa tela de login por onde ninguém entra: o seed do repositório é TypeScript e roda com `tsx`, dependência de desenvolvimento que não vai no pacote. |

### O kit de instalação (11/09/2026)

A instalação manual pedia instalar o Node, passar pelo assistente do
PostgreSQL, copiar o NSSM e digitar um comando longo no PowerShell. Virou
**um arquivo e um duplo clique**. A instalação manual continua existindo como
plano B, e os dois caminhos rodam o mesmo `instalar.ps1`. Passo a passo em
[`roteiro-instalacao.md`](roteiro-instalacao.md).

| # | Item | Onde | Por quê |
| --- | --- | --- | --- |
| 11 | Node embutido ✅ | `runtime\node.exe` no pacote, pelo `empacotar.mjs` | É o `node.exe` do runner, a versão exata do `.nvmrc`. Some o MSI e a conferência de versão, e a atualização troca o Node junto com o sistema. |
| 12 | Kit ✅ | `scripts/montar-kit.mjs`, `scripts/kit/` | Pacote + instalador do PostgreSQL + NSSM + `INSTALAR.cmd`. O PostgreSQL é baixado no runner e conferido contra o SHA-256 fixado em `componentes.json`. O NSSM mora no repositório, porque o site dele cai. |
| 13 | Duplo clique ✅ | `INSTALAR.cmd` → `instalar-kit.ps1`; `ATUALIZAR.cmd` → `atualizar.ps1` sem `-Pacote` | Pedem elevação sozinhos, seguram a janela aberta no erro e, na instalação, perguntam as senhas com digitação oculta. |

**As senhas do banco.** A do `postgres` é **escolhida por quem instala** e
digitada no kit: é a que resolve problema no banco depois, e precisa ser
conhecida. O PostgreSQL só aceita conexão local, então uma senha simples não
fica exposta. A do `aja` continua aleatória, no `.env`: ninguém precisa dela.

**Por que `.cmd` e não um instalador `.exe`** (Inno Setup, NSIS): um `.exe`
sem assinatura abre com o aviso do SmartScreen, e um `.exe` desconhecido que
instala serviço é o que mais chama atenção de antivírus — e o do cliente é
desconhecido. O certificado custa algumas centenas de dólares por ano. Para uma
instalação única, o `.cmd` dá o mesmo duplo clique sem esses custos.

**Kit e pacote são coisas diferentes.** O kit (~440 MB) é só para a primeira
instalação. A atualização continua sendo o pacote (~85 MB), sem o
PostgreSQL.

---

## 7. Decisões em aberto

As de infraestrutura restantes estão no ponto **#11** de
[`pontos-para-reuniao.md`](pontos-para-reuniao.md).

Fechadas pela conversa de 09/09/2026:

- ~~SO do servidor~~ → **Windows comercial (10/11), estação de trabalho.**
- ~~Internet de saída~~ → **não há, por decisão.** Entrega por mídia removível.
- ~~Token do GitHub na máquina~~ → **não se aplica.**
- ~~Manual ou timer automático~~ → **manual, obrigatoriamente.**

Fechadas pelas respostas do Henrique, 11/09/2026 (detalhe na seção 9):

- ~~Edição do Windows~~ → **Windows 10 Pro 22H2, 64 bits.**
- ~~IP fixo ou DHCP~~ → **fixo, 192.168.1.222.**
- ~~Existe nobreak?~~ → **não.**
- ~~Alguém usa a máquina?~~ → **não**.
- ~~Antivírus, suspensão, energia, faixa de DHCP~~ → **infraestrutura do
  cliente, fora do nosso escopo.** Risco registrado por escrito.
- ~~Onde fica o backup~~ → **`D:\aja-obras\backups`, agendado na instalação.**
  A cópia para fora da máquina é do cliente.

Ainda abertas:

- **Quem executa a atualização**: o Júnior, ou você presencialmente?
- **Qual a janela de manutenção aceitável**, já que a atualização derruba o
  serviço por alguns minutos e migrations destrutivas não têm rollback barato.

---

## 8. O que este plano deliberadamente não faz

| Descartado | Por quê |
| --- | --- |
| **Docker** | Confirmado com o cliente que não usam. Resolveria reprodutibilidade — problema que não temos numa instalação única — ao custo de uma peça a mais para o cliente manter sem suporte, e de um backup menos óbvio. |
| **`git pull` na máquina** | Exigiria internet, que não há. E mesmo com ela: obriga a ter código-fonte, Node de desenvolvimento e acesso ao registry npm, transforma a máquina em ambiente de build, e troca o rollback por arqueologia de commit. A máquina recebe artefato pronto. |
| **Porta aberta / redirecionamento no roteador** | SSH ou RDP exposto à internet vira alvo de varredura em dias. |
| **Acesso remoto persistente (AnyDesk, TeamViewer)** | Caminho permanente de terceiros para dentro da rede do cliente. Contraria diretamente a postura declarada pelo cliente (*"tudo aqui é estanque"*). |
| **VPN** | O cliente não tem, e não quer. |
| **Atualização automática por timer** | Não há internet para consultar versão nova. |

---

## 9. Checklist da máquina — antes da instalação

Para mandar ao cliente **antes** de marcar a data. Cada item tem como ele
descobre a resposta, sem depender de conhecimento técnico.

> ### Respostas do Henrique — 11/09/2026
>
> Prints de `ipconfig /all`, `msinfo32`, `winver` e do Explorer, mais três
> respostas por escrito. Máquina: **SERVIDOR-AJA**.
>
> | # | Resposta | Consequência |
> | --- | --- | --- |
> | 1 | **Windows 10 Pro** 22H2, build 19045.6466 | Sem limitação de edição. |
> | 2 | 64 bits ("PC baseado em x64") | ok |
> | 3 | Xeon E5-2680 v4 (14 núcleos, 28 threads), 16 GB de RAM, 11,5 GB livres | Folga grande para Node + Postgres. Placa Atermiter E5-A59 (X99 genérica). |
> | 4 | C: 73,2 GB livres de 118 GB. **D: (DADOS) 3,51 TB livres de 3,63 TB** | Instalação em **`D:\aja-obras`**, agora o padrão dos scripts: os documentos crescem no disco grande. O Postgres fica no C: (padrão do instalador), o que deixa os dumps num disco diferente do banco. |
> | 5 | SERVIDOR-AJA | — |
> | 6 | 192.168.1.222 /24, gateway 192.168.1.1 | Atalho: **`http://192.168.1.222:3000`**. Pelo IP, não pelo nome: o DNS da máquina aponta direto para 8.8.8.8, então o nome só resolve por NetBIOS. |
> | 7 | **DHCP Habilitado: Não**, IP fixo | ok |
> | 9 | Ligada 24x7 | Backup às 22:00 sem restrição de horário. |
> | 12 | **Sem nobreak** | Queda de energia desliga o Postgres no tapa. Risco do cliente, registrado por escrito. |
> | 13 | *"Não existe um usuário nela"*: ninguém trabalha nela | — |
> | 16 | Provavelmente **não há**: a busca por "postgresql" no Iniciar caiu no Bing | O `instalar.ps1` confere de qualquer forma. |
> | 17 | Não sabe, e não vai investigar | Ver abaixo. |
>
> #### A máquina tem internet
>
> Isso contradiz o *"tudo aqui é estanque"* de 09/09. Nos prints aparecem DNS
> 8.8.8.8, uma busca no Bing com resultado do dia e notificação do OneDrive.
> **Para o projeto é neutro:** nada no sistema depende de internet em runtime.
> A entrega continua por pen drive. Se o Júnior quiser, baixar o pacote direto
> na máquina é mais simples.
>
> #### Encerrado em 11/09/2026: o checklist para aqui
>
> O Henrique não vai investigar o antivírus, e o resto do checklist é
> infraestrutura, que pelo contrato é do cliente (`escopo-e-orcamento.md`).
> **Não perguntar mais** sobre antivírus (#17), suspensão (#10), local físico
> (#11), retorno após queda de energia (#14) ou faixa de DHCP (#8). O risco
> fica com o cliente, **registrado por escrito** num e-mail de ressalva que
> cita: sem nobreak, antivírus não informado e backup no mesmo disco.
>
> O que continua sendo do nosso lado, e como ficou:
>
> - **Backup:** o `instalar.ps1` agenda a tarefa diária e roda o primeiro
>   backup antes de terminar. Destino padrão `D:\aja-obras\backups`, no mesmo
>   disco (seção 5). A cópia para fora da máquina é do cliente.
> - **Antivírus:** pode bloquear o `nssm.exe`, o Node ou a porta 3000 no dia.
>   Reservar folga na visita, sem prometer uma hora cravada.
> - **Resolver no local:** senha de administrador (a conta `admin` existe) e a
>   pasta que recebe o atalho.

### A. Identificação da máquina

| # | O que precisamos saber | Como descobrir |
| --- | --- | --- |
| 1 | Versão e edição do Windows | `Win+R` → `winver` → manda print. Precisamos ver *Windows 10/11* e *Home/Pro* |
| 2 | 64 bits? | `Win+R` → `msinfo32` → linha "Tipo de sistema" |
| 3 | Memória RAM e processador | Mesma tela do `msinfo32` |
| 4 | Espaço livre em disco | Explorer → "Este Computador" → print. Documentos só crescem |
| 5 | Nome da máquina na rede | `msinfo32`, linha "Nome do Sistema" |

### B. Rede — o item que quebra o atalho depois

| # | O que precisamos saber | Como descobrir |
| --- | --- | --- |
| 6 | IP atual da máquina | `Win+R` → `cmd` → `ipconfig /all` → print |
| 7 | **É fixo ou DHCP?** | Na saída do `ipconfig /all`, procurar **"DHCP Habilitado"**: `Sim` = automático (**precisa mudar**); `Não` = fixo (ok) |
| 8 | Quem administra o roteador/rede | Para transformar em IP fixo, se for DHCP |

### C. Disponibilidade

| # | O que precisamos saber | Por quê |
| --- | --- | --- |
| 9 | A máquina fica ligada 24h? | Se desligam à noite, muda horário de backup |
| 10 | Ela suspende/hiberna? | **Tem que ser desligado.** Se ela dorme, o sistema some para todos |
| 11 | Onde ela fica fisicamente? | Um PC solto numa sala é desligado por engano |
| 12 | Tem nobreak? | PostgreSQL desligado no tapa pode corromper. É o item mais barato da instalação |
| 13 | Alguém usa essa máquina para trabalhar? | Concorrência de recursos, e risco de alguém fechar algo |
| 14 | Reinicia sozinho após queda de energia? | Configuração de BIOS. Sem isso, alguém precisa ir lá ligar |

### D. Acesso e software

| # | O que precisamos saber | Por quê |
| --- | --- | --- |
| 15 | Quem tem senha de administrador? | Instalar Node, PostgreSQL e o serviço exige elevação |
| 16 | Já existe PostgreSQL instalado? | Iniciar → digitar "postgres". Se existir, precisamos da versão e da senha |
| 17 | Qual antivírus? | Pode bloquear a porta 3000 ou colocar o `.exe` em quarentena |
| 18 | Existe rotina de backup hoje? O que ela cobre? | Melhor encaixar na que existe do que criar uma paralela |
| 19 | Pen drive é permitido na máquina? | Se a política bloquear USB, o transporte precisa ser pela pasta de rede |
| 20 | Qual pasta de rede vai receber o atalho? | Precisa ser visível a todos que usarão o sistema |

### E. Levar no pen drive (seção 6)

Nada pode ser baixado no local. Conferir antes de sair:

- [ ] `aja-obras-kit-<versão>.zip` + `.sha256` (traz sistema, PostgreSQL e NSSM)
- [ ] `aja-obras-<versão>.zip` + `.sha256`, para o plano B
- [ ] [`roteiro-instalacao.md`](roteiro-instalacao.md) impresso
