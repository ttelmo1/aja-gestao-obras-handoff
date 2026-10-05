#!/usr/bin/env bash
#
# Backup diário (etapa 15, fase 8): dump do banco + cópia dos documentos para
# um bucket de outro provedor (Backblaze B2). Roda no GitHub Actions
# (.github/workflows/backup.yml) e também na mão, da máquina de quem precisar.
# Procedimento completo e restauração em docs/backup.md.
#
# O que faz:
#   1. pg_dump do banco (formato custom), conferido com pg_restore --list;
#   2. cifra o dump com AES-256 (openssl, senha em BACKUP_SENHA);
#   3. envia para banco/diario/AAAA-MM-DD.dump.enc — e, no dia 1, também para
#      banco/mensal/AAAA-MM.dump.enc (a retenção é regra do bucket de destino);
#   4. copia os documentos do bucket de origem para documentos/ no destino.
#      `copy`, não `sync`: nada apagado na origem é apagado no backup.
#
# Variáveis (todas obrigatórias):
#   BACKUP_DATABASE_URL     conexão DIRETA (sem pooler), de preferência com um
#                           usuário só de leitura
#   BACKUP_SENHA            senha da criptografia do dump — sem ela, o backup
#                           não se restaura. Guardar fora daqui.
#   DOCS_S3_ENDPOINT, DOCS_S3_BUCKET, DOCS_S3_ACCESS_KEY_ID,
#   DOCS_S3_SECRET_ACCESS_KEY                 origem (R2), token só de leitura
#   BACKUP_S3_ENDPOINT, BACKUP_S3_REGION, BACKUP_S3_BUCKET,
#   BACKUP_S3_ACCESS_KEY_ID, BACKUP_S3_SECRET_ACCESS_KEY      destino (B2)
# Opcionais:
#   PG_BIN                  pasta do pg_dump, se não estiver no PATH
#   RCLONE                  caminho do rclone (padrão: rclone)
set -euo pipefail

for v in BACKUP_DATABASE_URL BACKUP_SENHA \
  DOCS_S3_ENDPOINT DOCS_S3_BUCKET DOCS_S3_ACCESS_KEY_ID DOCS_S3_SECRET_ACCESS_KEY \
  BACKUP_S3_ENDPOINT BACKUP_S3_REGION BACKUP_S3_BUCKET BACKUP_S3_ACCESS_KEY_ID BACKUP_S3_SECRET_ACCESS_KEY; do
  if [ -z "${!v:-}" ]; then
    echo "Falta a variável $v" >&2
    exit 2
  fi
done

PG_DUMP="${PG_BIN:+$PG_BIN/}pg_dump"
PG_RESTORE="${PG_BIN:+$PG_BIN/}pg_restore"
RCLONE="${RCLONE:-rclone}"

# Os dois buckets como remotos do rclone, só por variável de ambiente — nada
# de arquivo de configuração com chave gravada em disco.
export RCLONE_CONFIG_ORIGEM_TYPE=s3
export RCLONE_CONFIG_ORIGEM_PROVIDER=Cloudflare
export RCLONE_CONFIG_ORIGEM_ENDPOINT="$DOCS_S3_ENDPOINT"
export RCLONE_CONFIG_ORIGEM_ACCESS_KEY_ID="$DOCS_S3_ACCESS_KEY_ID"
export RCLONE_CONFIG_ORIGEM_SECRET_ACCESS_KEY="$DOCS_S3_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_DESTINO_TYPE=s3
export RCLONE_CONFIG_DESTINO_PROVIDER=Other
export RCLONE_CONFIG_DESTINO_ENDPOINT="$BACKUP_S3_ENDPOINT"
export RCLONE_CONFIG_DESTINO_REGION="$BACKUP_S3_REGION"
export RCLONE_CONFIG_DESTINO_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID"
export RCLONE_CONFIG_DESTINO_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY"
# Tokens restritos a um bucket não podem listar nem criar buckets.
export RCLONE_S3_NO_CHECK_BUCKET=true
# Sem arquivo de configuração: os remotos vêm todos das variáveis acima.
export RCLONE_CONFIG=/dev/null

DATA="$(date -u +%F)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "== 1/4 dump do banco"
"$PG_DUMP" --format=custom --no-owner --no-acl --dbname="$BACKUP_DATABASE_URL" --file="$TMP/banco.dump"
# Dump que não se lê é pior que nenhum: daria a impressão de backup.
"$PG_RESTORE" --list "$TMP/banco.dump" > /dev/null
echo "   $(du -h "$TMP/banco.dump" | cut -f1)"

echo "== 2/4 criptografia"
openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -salt \
  -pass env:BACKUP_SENHA -in "$TMP/banco.dump" -out "$TMP/banco.dump.enc"

echo "== 3/4 envio do dump"
"$RCLONE" copyto "$TMP/banco.dump.enc" "destino:$BACKUP_S3_BUCKET/banco/diario/$DATA.dump.enc"
if [ "$(date -u +%d)" = "01" ]; then
  "$RCLONE" copyto "$TMP/banco.dump.enc" "destino:$BACKUP_S3_BUCKET/banco/mensal/$(date -u +%Y-%m).dump.enc"
fi

echo "== 4/4 documentos"
"$RCLONE" copy "origem:$DOCS_S3_BUCKET" "destino:$BACKUP_S3_BUCKET/documentos" --stats-one-line --stats=0

echo "Backup de $DATA concluído."
