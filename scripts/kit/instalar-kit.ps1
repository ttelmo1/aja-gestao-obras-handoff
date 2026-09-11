<#
.SINOPSE
  Instalação pelo kit. Aberto pelo INSTALAR.cmd, com duplo clique.

.DESCRIÇÃO
  Faz numa janela só o que a instalação manual (plano B de
  docs/roteiro-instalacao.md) faz em passos separados:

    1. confere o pacote do sistema e os componentes (SHA-256)
    2. pergunta e-mail e senha do administrador e a senha do postgres
    3. instala o PostgreSQL em modo silencioso, se ainda não houver um
    4. copia o nssm.exe para <raiz>\bin — fora do pen drive, porque o serviço
       fica registrado apontando para ele
    5. roda o instalar.ps1 do pacote, o mesmo da instalação manual

  As senhas são lidas com digitação oculta e passadas ao instalar.ps1 dentro
  deste mesmo processo: não aparecem na linha de comando do PowerShell nem no
  histórico.

  Senhas do banco:
    - postgres: a digitada aqui. É a que resolve problema no banco depois.
    - aja: gerada pelo instalar.ps1 e gravada no .env. Ninguém precisa dela.
#>
param(
  [string]$Raiz = "D:\aja-obras"
)

$ErrorActionPreference = "Stop"
$kit = $PSScriptRoot

# Tudo aqui roda numa janela aberta por duplo clique: sem a pausa, qualquer
# erro fecha a janela antes de alguém conseguir ler.
function Sair([string]$Motivo) {
  Write-Host ""
  Write-Host "ERRO: $Motivo" -ForegroundColor Red
  Read-Host "Pressione Enter para fechar" | Out-Null
  exit 1
}
trap { Sair "$_" }

# ----------------------------------------------------------- administrador

$papel = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $papel.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  try {
    Start-Process powershell.exe -Verb RunAs `
      -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Raiz `"$Raiz`""
  } catch {
    Sair "a instalação precisa de permissão de administrador, e o aviso do Windows foi recusado."
  }
  exit 0
}

Write-Host "Sistema de Gestão de Obras — instalação pelo kit" -ForegroundColor White
Write-Host ""

# ------------------------------------------------------------- 1. conferir

$zips = @(Get-ChildItem $kit -Filter "aja-obras-*.zip" | Where-Object { $_.Name -notlike "aja-obras-kit-*" })
if ($zips.Count -ne 1) {
  Sair ("esperava um aja-obras-<versão>.zip nesta pasta e achei $($zips.Count). " +
    "Extraia o kit inteiro (botão direito no .zip, Extrair tudo) e rode o INSTALAR.cmd da pasta extraída.")
}
$zip = $zips[0]
$versao = $zip.BaseName -replace '^aja-obras-', ''

function Conferir([string]$Arquivo, [string]$Esperado) {
  $calculado = (Get-FileHash $Arquivo -Algorithm SHA256).Hash.ToLower()
  if ($calculado -ne $Esperado.ToLower()) {
    Sair "$(Split-Path -Leaf $Arquivo) está corrompido (SHA-256 não confere). Copie o kit de novo."
  }
}

Write-Host "Conferindo os arquivos do kit..."
$arquivoHash = "$($zip.FullName).sha256"
if (-not (Test-Path $arquivoHash)) { Sair "falta $(Split-Path -Leaf $arquivoHash) ao lado do pacote." }
Conferir $zip.FullName (((Get-Content $arquivoHash -Raw).Trim() -split '\s+')[0])

$manifesto = Join-Path $kit "componentes\componentes.sha256"
if (-not (Test-Path $manifesto)) { Sair "falta componentes\componentes.sha256 — o kit está incompleto." }
foreach ($linha in Get-Content $manifesto) {
  if (-not $linha.Trim()) { continue }
  $hash, $nome = $linha.Trim() -split '\s+', 2
  $arquivo = Join-Path $kit "componentes\$nome"
  if (-not (Test-Path $arquivo)) { Sair "falta componentes\$nome — o kit está incompleto." }
  Conferir $arquivo $hash
}
Write-Host "   tudo confere." -ForegroundColor Green

# -------------------------------------------------------------- 2. extrair

Write-Host "Extraindo o pacote da versão $versao (pode levar alguns minutos)..."
$extraido = Join-Path $env:TEMP "aja-obras-instalacao-$versao"
if (Test-Path $extraido) { Remove-Item $extraido -Recurse -Force }
Expand-Archive -Path $zip.FullName -DestinationPath $extraido -Force
if (-not (Test-Path (Join-Path $extraido "scripts\instalar.ps1"))) {
  Sair "o pacote não tem scripts\instalar.ps1."
}

# Daqui em diante, as funções comuns da instalação (Parar, Escrever-*, ...).
. (Join-Path $extraido "scripts\comum.ps1")
$script:PausarAoSair = $true

# ----------------------------------------------------------------- 3. onde

$unidade = Split-Path -Qualifier $Raiz
if (-not (Test-Path "$unidade\")) {
  Escrever-Aviso "esta máquina não tem a unidade $unidade."
  $resposta = Read-Host "Instalar em C:\aja-obras? (S/N)"
  if ($resposta -notmatch '^[sS]') { Parar "instalação cancelada." }
  $Raiz = "C:\aja-obras"
}
if (Get-Service $NomeServico -ErrorAction SilentlyContinue) {
  Parar "o sistema já está instalado nesta máquina. Para uma versão nova, use o ATUALIZAR.cmd da pasta de instalação."
}

$psql = Achar-BinPostgres "psql"

# ------------------------------------------------------------ 4. perguntas

function Texto-Da-Senha([Security.SecureString]$Segura) {
  $ponteiro = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Segura)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ponteiro) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ponteiro) }
}

<#
  Pede a senha oculta, confere a regra e pede de novo para confirmar.
  -cne: a comparação padrão do PowerShell ignora maiúsculas, e "Senha1" e
  "senha1" passariam como iguais.
#>
function Ler-Senha([string]$Rotulo, [scriptblock]$Regra) {
  while ($true) {
    $senha = Texto-Da-Senha (Read-Host $Rotulo -AsSecureString)
    $problema = & $Regra $senha
    if ($problema) { Escrever-Aviso $problema; continue }
    $repetida = Texto-Da-Senha (Read-Host "Repita a senha" -AsSecureString)
    if ($senha -cne $repetida) { Escrever-Aviso "as duas não são iguais. De novo."; continue }
    return $senha
  }
}

Escrever-Passo "Administrador do sistema (o login da tela)"
do {
  $email = (Read-Host "E-mail").Trim().ToLower()
  $emailOk = $email -match '^[^@\s]+@[^@\s]+$'
  if (-not $emailOk) { Escrever-Aviso "e-mail inválido." }
} while (-not $emailOk)

$senhaAdmin = Ler-Senha "Senha do administrador" {
  param($s)
  # A mesma regra de src/modules/auth/senha.ts e do criar-admin.mjs, conferida
  # aqui para não descobrir o problema no passo 7, com o PostgreSQL já instalado.
  if ($s.Length -lt 8 -or $s -notmatch '[a-zA-Z]' -or $s -notmatch '[0-9]') {
    return "mínimo de 8 caracteres, com pelo menos uma letra e um número."
  }
  if ([Text.Encoding]::UTF8.GetByteCount($s) -gt 72) { return "senha longa demais." }
}

Escrever-Passo "Senha do usuário postgres (banco de dados)"
if ($psql) {
  Write-Host "   Já existe PostgreSQL nesta máquina: digite a senha do postgres DELE."
} else {
  Write-Host "   É com ela que se corrige problema no banco depois. Anote e guarde."
}
$senhaPostgres = Ler-Senha "Senha do postgres" {
  param($s)
  if (-not $s) { return "a senha não pode ser vazia." }
  # Vai entre aspas na linha de comando do instalador do PostgreSQL: aspas
  # quebram o argumento, e barra invertida no fim escapa a aspa de fechamento.
  if ($s.Contains('"') -or $s.EndsWith('\')) {
    return "não use aspas duplas nem termine a senha com barra invertida."
  }
}

# ----------------------------------------------------------- 5. PostgreSQL

if ($psql) {
  Escrever-Passo "PostgreSQL já instalado — usando o existente"
  $esperaPostgres = 5
} else {
  $instaladorPg = @(Get-ChildItem (Join-Path $kit "componentes") -Filter "postgresql-*-windows-x64.exe")[0]
  if (-not $instaladorPg) { Parar "não achei o instalador do PostgreSQL em componentes\." }

  Escrever-Passo "Instalando o PostgreSQL (alguns minutos)"
  # Sem pgAdmin nem Stack Builder: o Stack Builder baixa complementos da
  # internet, e nenhum dos dois é usado pelo sistema. Ficam o servidor e as
  # ferramentas de linha de comando (psql, pg_dump, pg_restore).
  $argumentos = "--mode unattended --unattendedmodeui minimal --superpassword `"$senhaPostgres`" " +
    "--serverport 5432 --disable-components pgAdmin,stackbuilder"
  $processo = Start-Process -FilePath $instaladorPg.FullName -ArgumentList $argumentos -Wait -PassThru
  if ($processo.ExitCode -ne 0) {
    Parar "o instalador do PostgreSQL terminou com código $($processo.ExitCode). Log: $env:TEMP\install-postgresql.log"
  }
  $psql = Achar-BinPostgres "psql"
  if (-not $psql) { Parar "o PostgreSQL foi instalado, mas não encontrei o psql." }
  Escrever-Ok "PostgreSQL instalado."
  # O serviço pode levar alguns segundos para aceitar conexão.
  $esperaPostgres = 60
}

function Testar-Postgres([string]$Psql, [string]$Senha, [int]$Segundos) {
  # "Continue" só aqui dentro: o psql escreve em stderr enquanto o servidor
  # ainda sobe, e com "Stop" o Windows PowerShell transforma isso em exceção.
  $ErrorActionPreference = "Continue"
  $env:PGPASSWORD = $Senha
  try {
    $limite = (Get-Date).AddSeconds($Segundos)
    do {
      # -w: nunca parar para pedir senha no teclado.
      $saida = & $Psql -w -h localhost -U postgres -tAc "SELECT 1" 2>$null
      if ($LASTEXITCODE -eq 0 -and "$saida".Trim() -eq "1") { return $true }
      Start-Sleep -Seconds 3
    } while ((Get-Date) -lt $limite)
    return $false
  } finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  }
}

if (-not (Testar-Postgres $psql $senhaPostgres $esperaPostgres)) {
  Parar "não consegui entrar no PostgreSQL como postgres com essa senha. Se ele já existia, a senha é a definida quando foi instalado."
}
Escrever-Ok "senha do postgres confere."

# ----------------------------------------------------------------- 6. NSSM

Escrever-Passo "Copiando o NSSM"
$bin = Join-Path $Raiz "bin"
New-Item -ItemType Directory -Force -Path $bin | Out-Null
$nssm = Join-Path $bin "nssm.exe"
Copy-Item (Join-Path $kit "componentes\nssm.exe") $nssm -Force
Escrever-Ok "nssm em $nssm"

# ------------------------------------------------------------- 7. instalar

Write-Host ""
Write-Host "Instalando o sistema — o mesmo instalar.ps1 da instalação manual" -ForegroundColor White
& (Join-Path $extraido "scripts\instalar.ps1") -Raiz $Raiz -SenhaPostgres $senhaPostgres `
  -EmailAdmin $email -SenhaAdmin $senhaAdmin -Nssm $nssm
if ($LASTEXITCODE -ne 0) {
  Parar ("a instalação parou (mensagem acima). Depois de corrigir, veja 'Reinstalar do zero' " +
    "em docs/roteiro-instalacao.md antes de rodar o INSTALAR.cmd de novo.")
}

# O pacote fica em pacotes\: registra de onde a instalação saiu, e o
# ATUALIZAR.cmd reconhece a versão como já instalada.
Copy-Item $zip.FullName (Join-Path $Raiz "pacotes") -Force
Copy-Item $arquivoHash (Join-Path $Raiz "pacotes") -Force
Remove-Item $extraido -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Kit concluído." -ForegroundColor Green
Write-Host "  Senha do postgres:  a digitada aqui. Guarde."
Write-Host "  Atualizar depois:   .zip e .sha256 novos em $Raiz\pacotes, e duplo clique em $Raiz\ATUALIZAR.cmd"
Write-Host ""
Start-Process "http://localhost:$PortaPadrao"
Read-Host "Pressione Enter para fechar" | Out-Null
exit 0
