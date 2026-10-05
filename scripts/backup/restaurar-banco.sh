#!/usr/bin/env bash
#
# Restaura um dump feito por backup.sh num banco VAZIO. Ver docs/backup.md.
#
#   RESTAURAR_EM="postgresql://...banco-vazio..." \
#     scripts/backup/restaurar-banco.sh banco/diario/2026-10-05.dump.enc
#
# Precisa de BACKUP_SENHA e das BACKUP_S3_* (as mesmas do backup). Nunca
# aponte RESTAURAR_EM para o banco em uso: o pg_restore cria as tabelas e
# para no primeiro erro, mas um banco com dados não é lugar de ensaio.
# Opcionais: PG_BIN, RCLONE (como em backup.sh).
set -euo pipefail

CHAVE="${1:-}"
if [ -z "$CHAVE" ]; then
  echo "Uso: $0 <chave do dump no bucket, ex.: banco/diario/2026-10-05.dump.enc>" >&2
  exit 2
fi
for v in RESTAURAR_EM BACKUP_SENHA BACKUP_S3_ENDPOINT BACKUP_S3_REGION BACKUP_S3_BUCKET \
  BACKUP_S3_ACCESS_KEY_ID BACKUP_S3_SECRET_ACCESS_KEY; do
  if [ -z "${!v:-}" ]; then
    echo "Falta a variável $v" >&2
    exit 2
  fi
done

PG_RESTORE="${PG_BIN:+$PG_BIN/}pg_restore"
RCLONE="${RCLONE:-rclone}"

export RCLONE_CONFIG_DESTINO_TYPE=s3
export RCLONE_CONFIG_DESTINO_PROVIDER=Other
export RCLONE_CONFIG_DESTINO_ENDPOINT="$BACKUP_S3_ENDPOINT"
export RCLONE_CONFIG_DESTINO_REGION="$BACKUP_S3_REGION"
export RCLONE_CONFIG_DESTINO_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID"
export RCLONE_CONFIG_DESTINO_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY"
export RCLONE_S3_NO_CHECK_BUCKET=true
# Sem arquivo de configuração: os remotos vêm todos das variáveis acima.
export RCLONE_CONFIG=/dev/null

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "== baixando $CHAVE"
"$RCLONE" copyto "destino:$BACKUP_S3_BUCKET/$CHAVE" "$TMP/banco.dump.enc"

echo "== decifrando"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 \
  -pass env:BACKUP_SENHA -in "$TMP/banco.dump.enc" -out "$TMP/banco.dump"

echo "== restaurando"
"$PG_RESTORE" --no-owner --no-acl --exit-on-error --dbname="$RESTAURAR_EM" "$TMP/banco.dump"

echo "Restaurado. Os documentos estão em documentos/ no mesmo bucket (ver docs/backup.md)."
