<#
.SINOPSE
  Atualiza a instalação on-premise para uma nova release.

.DESCRIÇÃO
  Sequência, na ordem, com o motivo de cada passo estar onde está
  (docs/instalacao-on-premise.md, seção 4):

    1. Conferir o SHA-256      pega mídia com defeito antes do irreversível
    2. pg_dump                 único passo sem volta; aborta se falhar
    3. Parar o serviço
    4. Extrair a release
    5. prisma migrate deploy   nunca migrate dev, nunca db push
    6. Apontar current, subir
    7. Perguntar ao /api/health
    8. Falhou? volta a junction, sobe a anterior, imprime a restauração

  O LIMITE DO ROLLBACK: a junction devolve a aplicação em segundos, mas o banco
  não volta junto. Migration que remove ou renomeia coluna deixa a versão
  anterior incompatível com o banco novo, e o rollback real ali é restaurar o
  dump — perdendo o que entrou desde a atualização. É por isso que existe
  janela de manutenção combinada.

.EXEMPLO
  .\atualizar.ps1 -Pacote D:\aja-obras\pacotes\aja-obras-2026.09.15.zip
#>
param(
  # O .zip da release. O .sha256 tem que estar na mesma pasta.
  [Parameter(Mandatory = $true)][string]$Pacote,
  [string]$Raiz = "D:\aja-obras",
  [int]$Porta = 3000,
  # Só para emergência: aplica sem dump. Não use em operação normal.
  [switch]$SemBackup
)

. "$PSScriptRoot\comum.ps1"

Exigir-Administrador

if (-not (Test-Path $Pacote)) { Parar "não encontrei o pacote: $Pacote" }
$Pacote = (Resolve-Path $Pacote).Path
if (-not (Test-Path $Raiz)) { Parar "$Raiz não existe. Esta máquina já passou pela instalação inicial?" }

# A versão vem do nome do arquivo: aja-obras-<versao>.zip. É ela que nomeia a
# pasta em releases\, e é o que aparece no /api/health depois.
$nome = [IO.Path]::GetFileNameWithoutExtension($Pacote)
if ($nome -notmatch '^aja-obras-(?<v>[0-9A-Za-z._-]+)$') {
  Parar "nome de pacote inesperado: $nome. Esperado aja-obras-<versao>.zip"
}
$versao = $Matches['v']

$releases = Join-Path $Raiz "releases"
$destino = Join-Path $releases $versao
$current = Join-Path $Raiz "current"
$env_ = Join-Path $Raiz ".env"

Write-Host "Atualizando para a versão $versao" -ForegroundColor White
Write-Host "  pacote: $Pacote"
Write-Host "  raiz:   $Raiz"

# A release anterior, para o rollback saber para onde voltar. Lida ANTES de
# qualquer mudança: depois da troca da junction não há mais como descobrir.
$anterior = $null
if (Test-Path $current) {
  $anterior = (Get-Item $current).Target
  if ($anterior -is [array]) { $anterior = $anterior[0] }
  Write-Host "  atual:  $anterior"
}

# ---------------------------------------------------------------- 1. hash

Escrever-Passo "1/7 Conferindo a integridade do pacote"
Conferir-Hash $Pacote

if (Test-Path $destino) {
  Parar "a pasta $destino já existe. Esta versão já foi instalada — apague a pasta se quiser reinstalar."
}

$config = Ler-Env $env_
$urlBanco = $config["DATABASE_URL"]
if (-not $urlBanco) { Parar "DATABASE_URL não está no $env_" }

# ---------------------------------------------------------------- 2. dump

# Fica nulo com -SemBackup, e as mensagens de rollback checam isso antes de
# oferecer um pg_restore de um arquivo que não existe.
$arquivoDump = $null

if ($SemBackup) {
  Escrever-Aviso "2/7 Dump PULADO por -SemBackup. Se a migration corromper dado, não há para onde voltar."
} else {
  Escrever-Passo "2/7 Backup do banco antes de migrar"
  $pgDump = Achar-BinPostgres "pg_dump"
  if (-not $pgDump) { Parar "não encontrei pg_dump. Instale as ferramentas de linha de comando do PostgreSQL." }

  $backups = Join-Path $Raiz "backups"
  New-Item -ItemType Directory -Force -Path $backups | Out-Null
  $partes = Partes-Da-Url $urlBanco
  $arquivoDump = Join-Path $backups ("antes-de-{0}-{1}.dump" -f $versao, (Get-Date -Format "yyyyMMdd-HHmmss"))

  $env:PGPASSWORD = $partes.Senha
  try {
    & $pgDump --host=$($partes.Host) --port=$($partes.Porta) --username=$($partes.Usuario) `
      --dbname=$($partes.Banco) --format=custom --file=$arquivoDump
    if ($LASTEXITCODE -ne 0) { Parar "pg_dump falhou (código $LASTEXITCODE). Atualização abortada — nada foi alterado." }
  } finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  }
  $mb = [math]::Round((Get-Item $arquivoDump).Length / 1MB, 1)
  Escrever-Ok "dump em $arquivoDump ($mb MB)"
}

# ------------------------------------------------------------- 3. parar

Escrever-Passo "3/7 Parando o serviço $NomeServico"
$servico = Get-Service $NomeServico -ErrorAction SilentlyContinue
if ($servico) {
  Stop-Service $NomeServico -Force -ErrorAction SilentlyContinue
  # O Node pode levar alguns segundos para liberar a porta; subir a release
  # nova antes disso daria "porta em uso" e um serviço que não sobe.
  $limite = (Get-Date).AddSeconds(30)
  while ((Get-Service $NomeServico).Status -ne "Stopped" -and (Get-Date) -lt $limite) {
    Start-Sleep -Seconds 1
  }
  Escrever-Ok "serviço parado."
} else {
  Escrever-Aviso "serviço $NomeServico não existe ainda — seguindo (primeira atualização depois de instalação manual?)."
}

# ------------------------------------------------------------ 4. extrair

Escrever-Passo "4/7 Extraindo a release"
$temporario = Join-Path $releases ".tmp-$versao"
Remove-Item $temporario -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $temporario | Out-Null
# Extrai para temporário e só depois renomeia: extração interrompida não deixa
# uma pasta de release pela metade parecendo instalada.
Expand-Archive -Path $Pacote -DestinationPath $temporario -Force
if (-not (Test-Path (Join-Path $temporario "server.js"))) {
  Remove-Item $temporario -Recurse -Force -ErrorAction SilentlyContinue
  Parar "o pacote não tem server.js na raiz — não é uma release desta aplicação."
}
Move-Item $temporario $destino
Escrever-Ok "release em $destino"

Ligar-Env $Raiz $destino

# ------------------------------------------------------------- 5. migrar

Escrever-Passo "5/7 Aplicando migrations (migrate deploy)"
$ferramentas = Join-Path $destino "ferramentas"
$cliPrisma = Join-Path $ferramentas "node_modules\prisma\build\index.js"
if (-not (Test-Path $cliPrisma)) { Parar "não encontrei o CLI do Prisma em $cliPrisma" }

$env:DATABASE_URL = $urlBanco
try {
  Push-Location $ferramentas
  node $cliPrisma migrate deploy
  $codigo = $LASTEXITCODE
  Pop-Location
} finally {
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
}

if ($codigo -ne 0) {
  Escrever-Aviso "migrate deploy falhou (código $codigo). Desfazendo a troca de versão."
  if ($anterior) {
    Apontar-Current $Raiz $anterior
    Start-Service $NomeServico -ErrorAction SilentlyContinue
    Escrever-Aviso "voltou para $anterior."
  }
  Write-Host ""
  if ($arquivoDump) {
    Write-Host "O banco pode ter ficado a meio caminho. Para restaurar o dump:" -ForegroundColor Yellow
    Mostrar-Restauracao $partes $arquivoDump
  } else {
    Write-Host "Sem dump (-SemBackup): não há como voltar o banco por aqui." -ForegroundColor Red
  }
  Parar "atualização abortada na migration."
}
Escrever-Ok "migrations aplicadas."

# -------------------------------------------------------- 6. trocar e subir

Escrever-Passo "6/7 Apontando current para $versao e subindo o serviço"
Apontar-Current $Raiz $destino
if ($servico) {
  Start-Service $NomeServico
} else {
  Escrever-Aviso "sem serviço para iniciar — registre com instalar.ps1."
}

# ------------------------------------------------------------- 7. verificar

Escrever-Passo "7/7 Verificando se o sistema respondeu"
if (-not (Esperar-Saude -Porta $Porta)) {
  Escrever-Aviso "o sistema não respondeu. Voltando para a versão anterior."
  if ($anterior) {
    Stop-Service $NomeServico -Force -ErrorAction SilentlyContinue
    Apontar-Current $Raiz $anterior
    Start-Service $NomeServico -ErrorAction SilentlyContinue
    if (Esperar-Saude -Porta $Porta -TimeoutSegundos 60) {
      Escrever-Aviso "a versão anterior está no ar. A release $versao ficou em $destino para investigação."
    } else {
      Write-Host ""
      Write-Host "ATENÇÃO: nem a versão anterior respondeu. O sistema está fora." -ForegroundColor Red
      Write-Host "Veja o log do serviço em $Raiz\logs e o Postgres antes de qualquer outra tentativa." -ForegroundColor Red
    }
  }
  if ($arquivoDump) {
    Write-Host ""
    Write-Host "Se o banco precisar voltar (migration destrutiva):" -ForegroundColor Yellow
    Mostrar-Restauracao $partes $arquivoDump
  }
  Parar "atualização revertida."
}

Write-Host ""
Write-Host "Atualizado para $versao." -ForegroundColor Green
Write-Host "  http://localhost:$Porta/api/health"
if ($anterior) {
  Write-Host "  versão anterior mantida em $anterior (rollback: trocar a junction current)."
}
