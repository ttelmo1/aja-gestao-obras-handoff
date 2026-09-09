<#
.SINOPSE
  Backup do banco e dos documentos.

.DESCRIÇÃO
  São dois artefatos acoplados, e nenhum serve sozinho
  (docs/instalacao-on-premise.md, seção 5):

    - só o pg_dump  → restaura um banco apontando para arquivos que não existem
    - só o storage\ → arquivos com nome UUID, sem o índice que diz o que é cada um

  ORDEM: dump primeiro, storage depois. Um documento novo sem registro no banco
  é lixo inofensivo; um registro sem arquivo é erro na tela do usuário.

  O destino precisa ser OUTRO DISCO ou outra máquina. Backup no mesmo disco não
  protege contra a falha mais provável, que é justamente o disco — e esta
  máquina é uma estação de trabalho, sem disco nem fonte redundante.

  Um backup nunca restaurado não é backup: teste a restauração uma vez, em
  máquina separada, antes do aceite.

.EXEMPLO
  .\backup.ps1 -Destino E:\backups-aja
  .\backup.ps1 -Destino \\servidor\backups\aja -Manter 14

.EXEMPLO
  Agendamento diário (Agendador de Tarefas do Windows, não cron):

    $acao = New-ScheduledTaskAction -Execute "powershell.exe" `
      -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\aja-obras\current\scripts\backup.ps1" -Destino "E:\backups-aja"'
    $gatilho = New-ScheduledTaskTrigger -Daily -At 22:00
    Register-ScheduledTask -TaskName "AJA Obras - backup" -Action $acao -Trigger $gatilho `
      -User "SYSTEM" -RunLevel Highest
#>
param(
  [Parameter(Mandatory = $true)][string]$Destino,
  [string]$Raiz = "C:\aja-obras",
  # Quantos dias de backup manter no destino. 0 = não apagar nada.
  [int]$Manter = 30
)

. "$PSScriptRoot\comum.ps1"

if (-not (Test-Path $Raiz)) { Parar "$Raiz não existe." }
if (-not (Test-Path $Destino)) {
  New-Item -ItemType Directory -Force -Path $Destino | Out-Null
}

$mesmoDisco = (Split-Path -Qualifier (Resolve-Path $Destino)) -eq (Split-Path -Qualifier (Resolve-Path $Raiz))
if ($mesmoDisco) {
  Escrever-Aviso "o destino está no MESMO disco da instalação. Isso não protege contra falha de disco — use disco externo ou pasta de rede."
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
    # Aborta antes de copiar o storage: um par incompleto em que falta o banco
    # é pior que nenhum backup, porque parece backup.
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
if (Test-Path $storage) {
  # robocopy espelha só o que mudou: com o volume de documentos crescendo, copiar
  # tudo todo dia deixaria de caber na janela. /MIR espelha, /R:2 desiste rápido
  # de arquivo travado em vez de repetir um milhão de vezes.
  $destinoStorage = Join-Path $pasta "storage"
  robocopy $storage $destinoStorage /MIR /R:2 /W:2 /NFL /NDL /NP | Out-Null
  # robocopy usa código < 8 para sucesso (0 = nada mudou, 1 = copiou, etc.).
  if ($LASTEXITCODE -ge 8) { Parar "robocopy falhou (código $LASTEXITCODE)." }
  $tamanho = (Get-ChildItem $destinoStorage -Recurse -File -ErrorAction SilentlyContinue |
    Measure-Object Length -Sum).Sum
  Escrever-Ok "documentos: $([math]::Round($tamanho / 1MB, 1)) MB"
} else {
  Escrever-Aviso "não achei $storage — nenhum documento copiado."
}

# ---------------------------------------------------------------- retenção

if ($Manter -gt 0) {
  $limite = (Get-Date).AddDays(-$Manter)
  $antigos = Get-ChildItem $Destino -Directory |
    Where-Object { $_.Name -match '^\d{8}-\d{6}$' -and $_.CreationTime -lt $limite }
  foreach ($velho in $antigos) {
    Remove-Item $velho.FullName -Recurse -Force
    Write-Host "   removido backup antigo: $($velho.Name)"
  }
}

Write-Host ""
Write-Host "Backup em $pasta" -ForegroundColor Green
Write-Host "Para restaurar (em máquina de teste, nunca direto na de produção):"
Write-Host "  pg_restore --clean --if-exists -d `"<url do banco>`" `"$arquivoDump`""
Write-Host "  e copiar storage\ de volta para $storage"
