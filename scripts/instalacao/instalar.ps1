<#
.SINOPSE
  Instalação inicial numa máquina zerada, até a tela de login.

.DESCRIÇÃO
  Roda uma vez. É o script de maior risco do conjunto, porque cria o que os
  outros assumem existir: a árvore em C:\aja-obras, o .env com o segredo de
  sessão, o banco, o schema, o primeiro administrador e o serviço do Windows.

  O que ele NÃO faz, de propósito:
    - não instala Node nem PostgreSQL. Os dois têm instalador próprio, com
      telas e opções que não vale a pena automatizar numa instalação única;
      ele apenas confere se estão presentes e para com instrução clara.
    - não configura IP fixo nem firewall. São mudanças na rede do cliente, e
      quem responde por elas é quem administra a rede — estão no checklist da
      seção 9 do plano.

  Pré-requisitos na máquina (levados no pen drive, seção 6 do plano):
    Node.js (mesma versão maior do .nvmrc), PostgreSQL, NSSM.

.EXEMPLO
  .\instalar.ps1 -SenhaPostgres "..." -EmailAdmin admin@empresa.local -SenhaAdmin "..."
#>
param(
  [string]$Raiz = "C:\aja-obras",
  [int]$Porta = 3000,
  # Senha do superusuário postgres, para criar banco e usuário da aplicação.
  [Parameter(Mandatory = $true)][string]$SenhaPostgres,
  [Parameter(Mandatory = $true)][string]$EmailAdmin,
  [Parameter(Mandatory = $true)][string]$SenhaAdmin,
  # Usuário e banco criados para a aplicação.
  [string]$UsuarioBanco = "aja",
  [string]$NomeBanco = "aja_obras",
  # Onde está o nssm.exe, se não estiver no PATH.
  [string]$Nssm = "nssm"
)

. "$PSScriptRoot\comum.ps1"

Exigir-Administrador

$pacote = (Get-Item $PSScriptRoot).Parent.FullName
if (-not (Test-Path (Join-Path $pacote "server.js"))) {
  Parar "rode este script de dentro do pacote extraído (a pasta que tem server.js)."
}
$versao = (Get-Content (Join-Path $pacote "versao.txt") -Raw).Trim()

Write-Host "Instalação inicial — versão $versao" -ForegroundColor White
Write-Host "  raiz: $Raiz"

# ------------------------------------------------------- 1. pré-requisitos

Escrever-Passo "1/8 Conferindo o que precisa estar instalado"

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Parar "Node.js não está instalado (ou não está no PATH). Instale o MSI do pen drive e abra um PowerShell novo." }
$versaoNode = (& node --version).TrimStart("v")
$maiorNode = [int]($versaoNode -split '\.')[0]
$maiorEsperado = [int]((Get-Content (Join-Path $pacote "node-versao.txt") -Raw).Trim() -split '\.')[0]
if ($maiorNode -ne $maiorEsperado) {
  # `standalone` traz as dependências, não o runtime: a versão maior do Node na
  # máquina tem que ser a mesma com que o pacote foi compilado.
  Parar "Node $versaoNode instalado, mas este pacote foi compilado para a linha $maiorEsperado.x. Instale a versão certa."
}
Escrever-Ok "Node $versaoNode"

$psql = Achar-BinPostgres "psql"
if (-not $psql) { Parar "não encontrei o psql. Instale o PostgreSQL do pen drive." }
Escrever-Ok "psql em $psql"

$nssmCmd = Get-Command $Nssm -ErrorAction SilentlyContinue
if (-not $nssmCmd) { Parar "não encontrei o nssm. Copie o nssm.exe do pen drive e passe -Nssm C:\caminho\nssm.exe." }
Escrever-Ok "nssm em $($nssmCmd.Source)"

if (Get-Service $NomeServico -ErrorAction SilentlyContinue) {
  Parar "o serviço $NomeServico já existe. Esta máquina já foi instalada — use atualizar.ps1."
}

# ------------------------------------------------------------ 2. diretórios

Escrever-Passo "2/8 Criando a árvore de diretórios"
foreach ($pasta in @("releases", "storage", "backups", "logs", "pacotes")) {
  New-Item -ItemType Directory -Force -Path (Join-Path $Raiz $pasta) | Out-Null
}
Escrever-Ok "$Raiz criado."

# ------------------------------------------------------------------ 3. env

Escrever-Passo "3/8 Escrevendo o .env"
$arquivoEnv = Join-Path $Raiz ".env"
if (Test-Path $arquivoEnv) {
  Escrever-Aviso ".env já existe — mantido como está (não sobrescrevo segredo de sessão)."
} else {
  # 48 bytes aleatórios em base64. É o segredo que assina a sessão: trocá-lo
  # depois derruba a sessão de todos ao mesmo tempo, então ele nasce aqui e
  # nunca é reescrito por atualização.
  $bytes = New-Object byte[] 48
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $segredo = [Convert]::ToBase64String($bytes)

  $bytesSenha = New-Object byte[] 24
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytesSenha)
  # Sem caractere que precise de escape na URL de conexão.
  $senhaApp = [Convert]::ToBase64String($bytesSenha) -replace '[^A-Za-z0-9]', ''

  $conteudo = @"
# Gerado pela instalação em $(Get-Date -Format "yyyy-MM-dd HH:mm") — versão $versao.
# Este arquivo NÃO é sobrescrito por atualização. Guarde uma copia segura:
# perder o SESSION_SECRET derruba a sessao de todos; perder a senha do banco
# custa um ALTER USER.

DATABASE_URL="postgresql://${UsuarioBanco}:${senhaApp}@localhost:5432/${NomeBanco}?schema=public"
SESSION_SECRET="$segredo"

# HTTP na rede local: com "true" o navegador descarta o cookie e ninguem entra.
# Virar "true" no dia em que houver certificado e HTTPS na frente.
COOKIE_SEGURO="false"

# Documentos em disco, fora de public/. Todo download passa por checagem de
# permissao em src/app/documentos/[id]/route.ts.
# Barra normal de propósito: o Node aceita nos dois sentidos no Windows, e
# barra invertida em arquivo .env vira armadilha de escape.
STORAGE_DIR="$($Raiz -replace '\\','/')/storage"
STORAGE_DRIVER="disco"
"@
  Set-Content -Path $arquivoEnv -Value $conteudo -Encoding UTF8
  Escrever-Ok ".env escrito com segredo de sessão e senha de banco novos."
}

$config = Ler-Env $arquivoEnv
$urlBanco = $config["DATABASE_URL"]
$partes = Partes-Da-Url $urlBanco

# ----------------------------------------------------------------- 4. banco

Escrever-Passo "4/8 Criando o banco e o usuário da aplicação"
$env:PGPASSWORD = $SenhaPostgres
try {
  $existeUsuario = & $psql -h localhost -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$($partes.Usuario)'"
  if ($existeUsuario -ne "1") {
    # A senha entra por parâmetro do psql para não aparecer no histórico nem em
    # log de comando.
    & $psql -h localhost -U postgres -v senha="$($partes.Senha)" -c "CREATE USER `"$($partes.Usuario)`" WITH PASSWORD :'senha'" | Out-Null
    if ($LASTEXITCODE -ne 0) { Parar "falhou ao criar o usuário do banco." }
    Escrever-Ok "usuário $($partes.Usuario) criado."
  } else {
    Escrever-Aviso "usuário $($partes.Usuario) já existia."
  }

  $existeBanco = & $psql -h localhost -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$($partes.Banco)'"
  if ($existeBanco -ne "1") {
    & $psql -h localhost -U postgres -c "CREATE DATABASE `"$($partes.Banco)`" OWNER `"$($partes.Usuario)`"" | Out-Null
    if ($LASTEXITCODE -ne 0) { Parar "falhou ao criar o banco." }
    Escrever-Ok "banco $($partes.Banco) criado."
  } else {
    Escrever-Aviso "banco $($partes.Banco) já existia."
  }
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

# --------------------------------------------------------------- 5. release

Escrever-Passo "5/8 Instalando a release $versao"
$destino = Join-Path $Raiz "releases\$versao"
if (Test-Path $destino) { Parar "$destino já existe." }
New-Item -ItemType Directory -Force -Path $destino | Out-Null
Copy-Item (Join-Path $pacote "*") $destino -Recurse -Force
Ligar-Env $Raiz $destino
Apontar-Current $Raiz $destino
Escrever-Ok "release em $destino, current apontando para ela."

# -------------------------------------------------------------- 6. migrar

Escrever-Passo "6/8 Criando o schema (migrate deploy)"
$ferramentas = Join-Path $destino "ferramentas"
$env:DATABASE_URL = $urlBanco
try {
  Push-Location $ferramentas
  node (Join-Path $ferramentas "node_modules\prisma\build\index.js") migrate deploy
  $codigo = $LASTEXITCODE
  Pop-Location
  if ($codigo -ne 0) { Parar "migrate deploy falhou (código $codigo)." }
  Escrever-Ok "schema criado."

  Escrever-Passo "7/8 Criando o primeiro administrador"
  Push-Location $ferramentas
  node (Join-Path $ferramentas "criar-admin.mjs") --email $EmailAdmin --senha $SenhaAdmin --nome "Administrador"
  $codigo = $LASTEXITCODE
  Pop-Location
  if ($codigo -ne 0) { Parar "não consegui criar o administrador (código $codigo)." }
} finally {
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
}

# -------------------------------------------------------------- 8. serviço

Escrever-Passo "8/8 Registrando o serviço do Windows"
$exeNode = $node.Source
& $Nssm install $NomeServico $exeNode "$Raiz\current\server.js" | Out-Null
& $Nssm set $NomeServico AppDirectory "$Raiz\current" | Out-Null
# HOSTNAME=0.0.0.0 é o que faz o serviço atender a rede, e não só a própria
# máquina: sem isso o sintoma é "abre aqui, não abre em nenhum outro PC".
& $Nssm set $NomeServico AppEnvironmentExtra "NODE_ENV=production" "PORT=$Porta" "HOSTNAME=0.0.0.0" | Out-Null
& $Nssm set $NomeServico AppStdout "$Raiz\logs\servico.log" | Out-Null
& $Nssm set $NomeServico AppStderr "$Raiz\logs\servico-erro.log" | Out-Null
& $Nssm set $NomeServico AppRotateFiles 1 | Out-Null
& $Nssm set $NomeServico AppRotateBytes 10485760 | Out-Null
# Início automático: o sistema precisa subir no boot, ANTES de qualquer login.
& $Nssm set $NomeServico Start SERVICE_AUTO_START | Out-Null
& $Nssm set $NomeServico AppExit Default Restart | Out-Null
Escrever-Ok "serviço $NomeServico registrado."

Start-Service $NomeServico
if (-not (Esperar-Saude -Porta $Porta)) {
  Write-Host ""
  Write-Host "O serviço subiu mas não respondeu. Veja $Raiz\logs\servico-erro.log" -ForegroundColor Red
  Parar "instalação incompleta."
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -ne "WellKnown" } |
  Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "Instalado." -ForegroundColor Green
Write-Host "  Nesta máquina:  http://localhost:$Porta"
if ($ip) { Write-Host "  Na rede:        http://${ip}:$Porta" }
Write-Host "  Login:          $EmailAdmin"
Write-Host ""
Write-Host "Falta fazer, fora deste script:" -ForegroundColor Yellow
Write-Host "  1. Liberar a porta $Porta no firewall do Windows (perfil de rede privada)."
Write-Host "     New-NetFirewallRule -DisplayName 'AJA Obras' -Direction Inbound -LocalPort $Porta -Protocol TCP -Action Allow -Profile Private"
Write-Host "  2. Garantir IP fixo nesta máquina — em DHCP o atalho quebra sozinho um dia."
Write-Host "  3. Desligar suspensão/hibernação: se a máquina dorme, o sistema some para todos."
Write-Host "  4. Agendar o backup: scripts\backup.ps1 (veja o LEIAME)."
