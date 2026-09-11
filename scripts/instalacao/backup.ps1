<#
.SINOPSE
  Backup do banco e dos documentos.

.DESCRIÇÃO
  São dois artefatos acoplados, e nenhum serve sozinho
  (docs/instalacao-on-premise.md, seção 5):

    - só o pg_dump  → restaura um banco apontando para arquivos que não existem
    - só o storage\ → arquivos com nome UUID, sem o índice que diz o que é cada um

  ORDEM: dump primeiro, documentos depois. Um documento novo sem registro no
  banco é lixo inofensivo; um registro sem arquivo é erro na tela do usuário.

  O que fica no destino:

    <destino>\20260914-220000\banco.dump   um por dia, apagado depois de -Manter dias
    <destino>\documentos\                   UMA cópia, acumulada

  Os documentos não têm uma cópia por dia porque não precisam: o sistema nunca
  sobrescreve nem apaga arquivo (grava com "wx", e o excluir da tela é lógico).
  Basta copiar os novos. Uma cópia inteira por dia, com 30 dias de retenção,
  ocuparia 30 vezes o volume dos documentos no disco de destino — que na
  máquina do cliente é o mesmo disco das pastas da empresa.

  Qualquer dump restaura com essa pasta: os arquivos que entraram depois dele
  sobram como lixo inofensivo, pelo mesmo motivo da ordem acima.

  O LIMITE: no destino padrão o backup fica no mesmo disco dos documentos.
  Protege contra exclusão acidental e erro de operação; não protege contra
  falha do disco, perda da máquina ou vírus que criptografa arquivos. Cópia
  para fora da máquina é responsabilidade do cliente — basta apontar -Destino
  para outro disco ou pasta de rede.

  Agendado pelo instalar.ps1: tarefa "AJA Obras - backup", diária, como
  SYSTEM, com log em <raiz>\logs\backup.log.

  Um backup nunca restaurado não é backup: teste a restauração uma vez, em
  máquina separada, antes do aceite.

.EXEMPLO
  .\backup.ps1
  .\backup.ps1 -Destino \\servidor\backups\aja -Manter 14
#>
param(
  # Padrão: <raiz>\backups, ao lado dos dumps que a atualização faz.
  [string]$Destino = "",
  [string]$Raiz = "D:\aja-obras",
  # Quantos dias de dump manter. 0 = não apagar nada. Não afeta os documentos.
  [int]$Manter = 30
)

. "$PSScriptRoot\comum.ps1"

if (-not (Test-Path $Raiz)) { Parar "$Raiz não existe." }
if (-not $Destino) { $Destino = Join-Path $Raiz "backups" }
if (-not (Test-Path $Destino)) {
  New-Item -ItemType Directory -Force -Path $Destino | Out-Null
}

# Rodando pela tarefa agendada, a saída vai para o log; o carimbo separa um dia
# do outro.
Write-Host ""
Write-Host "Backup iniciado em $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White

$mesmoDisco = (Split-Path -Qualifier (Resolve-Path $Destino)) -eq (Split-Path -Qualifier (Resolve-Path $Raiz))
if ($mesmoDisco) {
  Escrever-Aviso "destino no MESMO disco da instalação: protege contra exclusão e erro de operação, não contra falha do disco."
}

$config = Ler-Env (Join-Path $Raiz ".env")
$partes = Partes-Da-Url $config["DATABASE_URL"]
$carimbo = Get-Date -Format "yyyyMMdd-HHmmss"
$pasta = Join-Path $Destino $carimbo
New-Item -ItemType Directory -Force -Path $pasta | Out-Null

# ------------------------------------------------------------------ banco

Escrever-Passo "1/2 Banco"
$pgDump = Achar-BinPostgres "pg_dump"
if (-not $pgDump) { Parar "não encontrei pg_dump." }
$arquivoDump = Join-Path $pasta "banco.dump"

$env:PGPASSWORD = $partes.Senha
try {
  & $pgDump --host=$($partes.Host) --port=$($partes.Porta) --username=$($partes.Usuario) `
    --dbname=$($partes.Banco) --format=custom --file=$arquivoDump
  if ($LASTEXITCODE -ne 0) {
    # Aborta antes de copiar os documentos: uma pasta de dump sem dump é pior
    # que nenhum backup, porque parece backup.
    Remove-Item $pasta -Recurse -Force -ErrorAction SilentlyContinue
    Parar "pg_dump falhou (código $LASTEXITCODE). Backup abortado."
  }
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
Escrever-Ok "banco: $([math]::Round((Get-Item $arquivoDump).Length / 1MB, 1)) MB"

# -------------------------------------------------------------- documentos

Escrever-Passo "2/2 Documentos"
$storage = $config["STORAGE_DIR"]
if (-not $storage) { $storage = Join-Path $Raiz "storage" }
$destinoDocumentos = Join-Path $Destino "documentos"
if (Test-Path $storage) {
  # /E e não /MIR: nada é apagado do destino, então um arquivo removido da
  # origem por engano continua no backup. Arquivo que já existe e não mudou é
  # pulado, e é isso que mantém o backup diário em minutos com o volume
  # crescendo. /R:2 desiste rápido de arquivo travado em vez de repetir um
  # milhão de vezes.
  robocopy $storage $destinoDocumentos /E /R:2 /W:2 /NFL /NDL /NP | Out-Null
  # robocopy usa código < 8 para sucesso (0 = nada mudou, 1 = copiou, etc.).
  if ($LASTEXITCODE -ge 8) { Parar "robocopy falhou (código $LASTEXITCODE)." }
  $tamanho = (Get-ChildItem $destinoDocumentos -Recurse -File -ErrorAction SilentlyContinue |
    Measure-Object Length -Sum).Sum
  Escrever-Ok "documentos: $([math]::Round($tamanho / 1MB, 1)) MB no backup"
} else {
  Escrever-Aviso "não achei $storage — nenhum documento copiado."
}

# ---------------------------------------------------------------- retenção

if ($Manter -gt 0) {
  # Só as pastas de dump diário. Os dumps "antes-de-<versão>" da atualização
  # são arquivos soltos e ficam, assim como a pasta de documentos.
  $limite = (Get-Date).AddDays(-$Manter)
  $antigos = Get-ChildItem $Destino -Directory |
    Where-Object { $_.Name -match '^\d{8}-\d{6}$' -and $_.CreationTime -lt $limite }
  foreach ($velho in $antigos) {
    Remove-Item $velho.FullName -Recurse -Force
    Write-Host "   removido dump antigo: $($velho.Name)"
  }
}

Write-Host ""
Write-Host "Backup em $pasta" -ForegroundColor Green
Write-Host "Para restaurar (em máquina de teste, nunca direto na de produção):"
Write-Host "  pg_restore --clean --if-exists -d `"<url do banco>`" `"$arquivoDump`""
Write-Host "  e copiar $destinoDocumentos de volta para $storage"
exit 0
