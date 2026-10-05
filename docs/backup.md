# Backup — banco e documentos

Etapa 15, fase 8. O sistema roda na Vercel com banco no Neon e documentos no
Cloudflare R2. Os dois provedores têm recuperação própria (o Neon restaura o
banco para qualquer ponto dos últimos dias), mas um backup **no mesmo
provedor** não protege contra perder a conta, apagar o projeto por engano ou
uma falha do próprio provedor. Este backup vai para **outra empresa**
(Backblaze B2), todo dia.

## O que é salvo, onde e por quanto tempo

| O quê | Onde, no bucket do B2 | Retenção |
|---|---|---|
| Dump do banco, cifrado | `banco/diario/AAAA-MM-DD.dump.enc` | 35 dias |
| Dump do dia 1 de cada mês | `banco/mensal/AAAA-MM.dump.enc` | 13 meses |
| Documentos | `documentos/obras/<obra>/<arquivo>` | Sem prazo |

- **Banco:** `pg_dump` em formato custom, conferido com `pg_restore --list`
  antes de sair, e cifrado com AES-256 (`openssl`, PBKDF2) pela senha
  `BACKUP_SENHA`. O dump tem os hashes de senha e os dados de todos os
  contratos; cifrado, o arquivo não serve para nada a quem não tem a senha.
- **Documentos:** cópia do bucket do R2. É `copy`, não `sync`: o que sai do
  R2 **não** sai do backup. Ficam protegidos pela criptografia do próprio B2
  e pelo bucket privado.
- **A retenção é regra do bucket do B2** (abaixo), não do script.

Quem roda: `.github/workflows/backup.yml`, às 04h de Brasília, chamando
`scripts/backup/backup.sh`. Pode ser disparado à mão em *Actions → Backup
diário → Run workflow*.

> **A senha `BACKUP_SENHA` é a única coisa que não se recupera.** Sem ela, os
> dumps são lixo. Guardar no gerenciador de senhas da AJA, não só no GitHub —
> o GitHub não deixa ler um segredo depois de gravado.

## Configuração (uma vez)

Todas as contas no nome da AJA (ver ponto #11 de
[`pontos-para-reuniao.md`](pontos-para-reuniao.md)).

### 1. Backblaze B2

1. Criar o bucket **privado** `aja-obras-backup`, com *Default Encryption*
   ligado (SSE-B2).
2. *Lifecycle Settings → Custom*, duas regras:
   - prefixo `banco/diario/`: esconder após **35** dias, apagar 1 dia depois;
   - prefixo `banco/mensal/`: esconder após **400** dias, apagar 1 dia depois.
   - `documentos/` fica sem regra.
3. *Application Keys → Add a New Application Key*: acesso **só a este
   bucket**, *Read and Write*. Anotar o *keyID*, a *applicationKey* e o
   endpoint S3 do bucket (ex.: `https://s3.us-east-005.backblazeb2.com`; a
   região é o trecho do meio, `us-east-005`).

Opcional, recomendado depois: *Object Lock* no bucket, para que nem quem tem
a chave consiga apagar um backup antes do prazo.

### 2. Cloudflare R2 — token só de leitura

Um token **à parte** do que o sistema usa: *Object Read only*, só no bucket
de produção. O backup não tem por que poder escrever nos documentos.

### 3. Neon — usuário só de leitura

No SQL Editor do Neon, no banco de produção:

```sql
CREATE ROLE backup WITH LOGIN PASSWORD '<senha forte>';
GRANT pg_read_all_data TO backup;
```

A `BACKUP_DATABASE_URL` usa esse usuário e o host **direto**, sem `-pooler`
no nome (o `pg_dump` não funciona bem pelo PgBouncer).

Conferir a versão do Postgres (`SELECT version();`). Se não for 17, criar a
variável `PG_MAJOR` no repositório com o número certo — o `pg_dump` precisa
ser da mesma versão ou mais nova.

### 4. GitHub — segredos do repositório

*Settings → Secrets and variables → Actions → New repository secret*:

| Segredo | Valor |
|---|---|
| `BACKUP_DATABASE_URL` | conexão direta do usuário `backup` no Neon |
| `BACKUP_SENHA` | senha longa (ex.: `openssl rand -base64 32`) — guardar também fora do GitHub |
| `DOCS_S3_ENDPOINT` | `https://<id-da-conta>.r2.cloudflarestorage.com` |
| `DOCS_S3_BUCKET` | `aja-obras-producao` |
| `DOCS_S3_ACCESS_KEY_ID` / `DOCS_S3_SECRET_ACCESS_KEY` | token só de leitura do R2 |
| `BACKUP_S3_ENDPOINT` / `BACKUP_S3_REGION` | endpoint e região do B2 |
| `BACKUP_S3_BUCKET` | `aja-obras-backup` |
| `BACKUP_S3_ACCESS_KEY_ID` / `BACKUP_S3_SECRET_ACCESS_KEY` | chave do B2 |
| `HEALTHCHECK_URL` (opcional) | URL de um check do Healthchecks.io, período de 1 dia |

### 5. Primeira execução

*Actions → Backup diário → Run workflow*. Conferir no B2 que apareceram
`banco/diario/<hoje>.dump.enc` e `documentos/`. Depois, **fazer o ensaio de
restauração** abaixo — só então o backup conta como funcionando.

> O agendamento só vale com o arquivo do workflow na **branch padrão** do
> repositório. Enquanto ele estiver só em `dev`, o backup não roda sozinho.

## Avisos

- **Falha:** o GitHub manda e-mail a quem configurou o workflow quando uma
  execução agendada falha. Conferir que esse e-mail chega a alguém da AJA.
- **Backup que parou de rodar** (workflow desativado, repositório movido):
  esse o GitHub não avisa. Para isso existe o `HEALTHCHECK_URL` — o
  Healthchecks.io (gratuito) espera um sinal por dia e manda e-mail quando
  falta.

## Restauração

### Banco

Num banco **vazio** — um branch novo no Neon ou um Postgres local. Nunca no
banco em uso.

```bash
export BACKUP_SENHA=... BACKUP_S3_ENDPOINT=... BACKUP_S3_REGION=... \
       BACKUP_S3_BUCKET=aja-obras-backup BACKUP_S3_ACCESS_KEY_ID=... \
       BACKUP_S3_SECRET_ACCESS_KEY=...
export RESTAURAR_EM="postgresql://usuario:senha@host/banco-vazio"
scripts/backup/restaurar-banco.sh banco/diario/2026-10-05.dump.enc
```

Precisa de `pg_restore` (mesma versão do dump ou mais nova), `openssl` e
`rclone` na máquina. O dump já traz a tabela `_prisma_migrations`: depois de
restaurado, o `prisma migrate deploy` aplica só o que faltar.

### Documentos

Copiar de volta do B2 para um bucket do R2 (o mesmo, ou um novo apontado em
`S3_BUCKET`):

```bash
rclone copy b2:aja-obras-backup/documentos r2:aja-obras-producao
```

(com os remotos `b2` e `r2` configurados como no `backup.sh`). A chave de
cada arquivo no backup é a mesma que o banco guarda em
`Documento.caminhoRelativo`, então nada no banco muda.

### Ensaio — a cada 3 meses

Restaurar o dump mais recente num banco vazio e conferir a contagem de
algumas tabelas contra a produção (`Obra`, `Medicao`, `Documento`,
`Auditoria`). Backup que nunca foi restaurado não é garantia.

**Ensaiado em 05/10/2026** com o banco local e o bucket de desenvolvimento
no lugar do B2: dump de 76 KB cifrado e enviado, 33 documentos copiados
(`rclone check`: 0 diferenças), restauração num banco vazio com as mesmas
contagens em todas as tabelas conferidas (inclusive a auditoria e o
histórico de migrations), a trava da auditoria restaurada junto e recusando
`UPDATE`, e senha errada falhando na decifragem em vez de gerar arquivo
corrompido.
