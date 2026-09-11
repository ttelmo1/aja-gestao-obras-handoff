# Funções compartilhadas pelos scripts de instalação, atualização e backup.
#
# Carregado com dot-sourcing: . "$PSScriptRoot\comum.ps1"

$ErrorActionPreference = "Stop"

# Padrões da instalação. Ver docs/instalacao-on-premise.md, seção 2.
$script:RaizPadrao   = "D:\aja-obras"
$script:NomeServico  = "AjaObras"
$script:PortaPadrao  = 3000
$script:TarefaBackup = "AJA Obras - backup"

function Escrever-Passo([string]$Texto) {
  Write-Host ""
  Write-Host "== $Texto" -ForegroundColor Cyan
}

function Escrever-Ok([string]$Texto) {
  Write-Host "   $Texto" -ForegroundColor Green
}

function Escrever-Aviso([string]$Texto) {
  Write-Host "   $Texto" -ForegroundColor Yellow
}

function Parar([string]$Motivo) {
  Write-Host ""
  Write-Host "ERRO: $Motivo" -ForegroundColor Red
  exit 1
}

function Exigir-Administrador {
  $identidade = [Security.Principal.WindowsIdentity]::GetCurrent()
  $papel = New-Object Security.Principal.WindowsPrincipal($identidade)
  if (-not $papel.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Parar "abra o PowerShell como Administrador (registrar serviço e instalar exige elevação)."
  }
}

<#
  Lê o .env da instalação para um hashtable.

  Precisa existir porque o CLI do Prisma e o criador do primeiro usuário rodam
  fora da aplicação e não têm quem carregue o .env por eles — a aplicação, essa
  sim, lê o arquivo sozinha.

  Formato aceito: CHAVE=valor, uma por linha, com aspas opcionais. Linha em
  branco e comentário (#) são ignorados. Não interpreta variável dentro de
  variável de propósito: o .env do cliente é escrito por nós, não por um shell.
#>
function Ler-Env([string]$Caminho) {
  if (-not (Test-Path $Caminho)) { Parar "não encontrei o .env em $Caminho" }
  $valores = @{}
  foreach ($linha in Get-Content $Caminho) {
    $texto = $linha.Trim()
    if ($texto -eq "" -or $texto.StartsWith("#")) { continue }
    $i = $texto.IndexOf("=")
    if ($i -lt 1) { continue }
    $chave = $texto.Substring(0, $i).Trim()
    $valor = $texto.Substring($i + 1).Trim()
    if ($valor.Length -ge 2) {
      $primeiro = $valor[0]
      $ultimo = $valor[$valor.Length - 1]
      if (($primeiro -eq '"' -and $ultimo -eq '"') -or ($primeiro -eq "'" -and $ultimo -eq "'")) {
        $valor = $valor.Substring(1, $valor.Length - 2)
      }
    }
    $valores[$chave] = $valor
  }
  return $valores
}

<#
  Confere o SHA-256 do pacote contra o arquivo .sha256 publicado ao lado.

  É o primeiro passo da atualização porque pega mídia com defeito e cópia
  interrompida antes de qualquer coisa irreversível — e no cenário do cliente,
  em que o arquivo viaja por pen drive, essa é a falha mais provável.
#>
function Conferir-Hash([string]$Arquivo) {
  $arquivoHash = "$Arquivo.sha256"
  if (-not (Test-Path $arquivoHash)) {
    Parar "não encontrei $arquivoHash — o .sha256 vem junto com o .zip e é ele que prova que a cópia veio inteira."
  }
  $esperado = ((Get-Content $arquivoHash -Raw).Trim() -split '\s+')[0].ToLower()
  $calculado = (Get-FileHash $Arquivo -Algorithm SHA256).Hash.ToLower()
  if ($esperado -ne $calculado) {
    Write-Host "   esperado:   $esperado" -ForegroundColor Red
    Write-Host "   calculado:  $calculado" -ForegroundColor Red
    Parar "o pacote não confere com o .sha256. Copie o arquivo de novo — não instale este."
  }
  Escrever-Ok "SHA-256 confere."
}

<#
  Pergunta ao /api/health se o serviço subiu de verdade.

  Tenta por até $TimeoutSegundos porque o Next leva alguns segundos para
  atender a primeira requisição, e o serviço acabou de iniciar. Devolve $true
  só com HTTP 200 — o endpoint responde 503 quando o banco não responde, que é
  exatamente o caso em que a atualização precisa ser desfeita.
#>
function Esperar-Saude([int]$Porta = $script:PortaPadrao, [int]$TimeoutSegundos = 90) {
  $url = "http://localhost:$Porta/api/health"
  $limite = (Get-Date).AddSeconds($TimeoutSegundos)
  $ultimoErro = ""
  while ((Get-Date) -lt $limite) {
    try {
      $resposta = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
      if ($resposta.StatusCode -eq 200) {
        $corpo = $resposta.Content | ConvertFrom-Json
        Escrever-Ok "respondeu: versao=$($corpo.versao) banco=$($corpo.banco)"
        return $true
      }
    } catch {
      $ultimoErro = $_.Exception.Message
    }
    Start-Sleep -Seconds 3
  }
  Escrever-Aviso "sem resposta 200 em $url após $TimeoutSegundos s. Último erro: $ultimoErro"
  return $false
}

<#
  Troca a junction `current` para a release indicada.

  Junction (`mklink /J`), não symlink (`/D`): junction não exige privilégio de
  administrador nem Modo de Desenvolvedor. `rmdir` remove a junction sem tocar
  no conteúdo apontado — `Remove-Item -Recurse` já apagaria a release.
#>
function Apontar-Current([string]$Raiz, [string]$Destino) {
  $current = Join-Path $Raiz "current"
  if (Test-Path $current) {
    cmd /c rmdir "$current" | Out-Null
    if (Test-Path $current) { Parar "não consegui remover a junction $current" }
  }
  cmd /c mklink /J "$current" "$Destino" | Out-Null
  if (-not (Test-Path (Join-Path $current "server.js"))) {
    Parar "a junction current não aponta para uma release válida ($Destino)"
  }
}

<#
  Liga o .env da raiz dentro da release.

  A aplicação lê o .env do diretório de trabalho, que é `current`. O arquivo de
  verdade mora em D:\aja-obras\.env — fora das releases, para sobreviver a
  qualquer atualização: ele guarda o SESSION_SECRET, e sobrescrevê-lo derruba a
  sessão de todos os usuários ao mesmo tempo.

  Hardlink em vez de cópia para que editar o .env da raiz valha para a release
  ativa sem precisar copiar de novo. Se o hardlink falhar (volume diferente,
  política), cai para cópia e avisa.
#>
function Ligar-Env([string]$Raiz, [string]$Release) {
  $origem = Join-Path $Raiz ".env"
  $destino = Join-Path $Release ".env"
  if (-not (Test-Path $origem)) { Parar "não encontrei o .env em $origem" }
  if (Test-Path $destino) { Remove-Item $destino -Force }
  try {
    New-Item -ItemType HardLink -Path $destino -Target $origem -ErrorAction Stop | Out-Null
    Escrever-Ok ".env ligado por hardlink."
  } catch {
    Copy-Item $origem $destino -Force
    Escrever-Aviso ".env copiado (hardlink indisponível): editar $origem exigirá rodar este script de novo."
  }
}

<# Caminho do pg_dump/psql, procurando as instalações padrão do EDB. #>
function Achar-BinPostgres([string]$Programa) {
  $doPath = Get-Command $Programa -ErrorAction SilentlyContinue
  if ($doPath) { return $doPath.Source }
  $candidatos = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\$Programa.exe" -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending
  if ($candidatos) { return $candidatos[0].FullName }
  return $null
}

<#
  Imprime como restaurar um dump.

  Host, usuário e banco separados, e não a DATABASE_URL: ela termina em
  "?schema=public", parâmetro do Prisma que o libpq recusa ("invalid URI query
  parameter") — a instrução de socorro falharia justo na hora do socorro. A
  senha não é impressa: está no .env.
#>
function Mostrar-Restauracao($Partes, [string]$Arquivo, [string]$Cor = "Yellow") {
  $pgRestore = Achar-BinPostgres "pg_restore"
  if (-not $pgRestore) { $pgRestore = "pg_restore" }
  Write-Host "  Stop-Service $NomeServico" -ForegroundColor $Cor
  Write-Host "  `$env:PGPASSWORD = '<senha do usuário $($Partes.Usuario), na DATABASE_URL do .env>'" -ForegroundColor $Cor
  Write-Host "  & `"$pgRestore`" --clean --if-exists -h $($Partes.Host) -p $($Partes.Porta) -U $($Partes.Usuario) -d $($Partes.Banco) `"$Arquivo`"" -ForegroundColor $Cor
  Write-Host "  Start-Service $NomeServico" -ForegroundColor $Cor
}

<# Componentes da DATABASE_URL, para chamar pg_dump e psql. #>
function Partes-Da-Url([string]$Url) {
  # postgresql://usuario:senha@host:porta/banco?params
  $uri = [Uri]$Url
  $usuario = [Uri]::UnescapeDataString($uri.UserInfo.Split(":")[0])
  $senha = ""
  if ($uri.UserInfo.Contains(":")) {
    $senha = [Uri]::UnescapeDataString($uri.UserInfo.Substring($uri.UserInfo.IndexOf(":") + 1))
  }
  return @{
    Host     = $uri.Host
    Porta    = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
    Banco    = $uri.AbsolutePath.TrimStart("/")
    Usuario  = $usuario
    Senha    = $senha
  }
}
