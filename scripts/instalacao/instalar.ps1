<#
.SINOPSE
  Instalação inicial numa máquina zerada, até a tela de login.

.DESCRIÇÃO
  Roda uma vez. É o script de maior risco do conjunto, porque cria o que os
  outros assumem existir: a árvore em D:\aja-obras, o .env com o segredo de
  sessão, o banco, o schema, o primeiro administrador, o serviço do Windows,
  a regra de firewall e a tarefa diária de backup.

  Dois caminhos chegam aqui, e o script é o mesmo nos dois
  (docs/roteiro-instalacao.md):
    - o kit (INSTALAR.cmd), que antes instala o PostgreSQL e o NSSM;
    - a instalação manual, plano B.

  O que ele NÃO faz, de propósito:
    - não instala o PostgreSQL: só confere. No kit, quem instala é o
      instalar-kit.ps1.
    - não configura IP fixo. É mudança na rede do cliente.

  O Node vem dentro do pacote (runtime\node.exe).

.EXEMPLO
  .\instalar.ps1 -SenhaPostgres "..." -EmailAdmin admin@empresa.local -SenhaAdmin "..." -Nssm "C:\Program Files\nssm\nssm.exe"
#>
param(
  # D: e não C:: na máquina do cliente o C: tem 118 GB e o D: tem 3,6 TB, e
  # os documentos só crescem. O Postgres fica no C:, onde o instalador põe.
  [string]$Raiz = "D:\aja-obras",
  [int]$Porta = 3000,
  # Senha do superusuário postgres, para criar banco e usuário da aplicação.
  [Parameter(Mandatory = $true)][string]$SenhaPostgres,
  [Parameter(Mandatory = $true)][string]$EmailAdmin,
  [Parameter(Mandatory = $true)][string]$SenhaAdmin,
  # Usuário e banco criados para a aplicação.
  [string]$UsuarioBanco = "aja",
  [string]$NomeBanco = "aja_obras",
  # Onde está o nssm.exe, se não estiver no PATH.
  [string]$Nssm = "nssm",
  # Onde o backup diário grava. Padrão: <raiz>\backups (mesmo disco — ver o
  # limite no cabeçalho do backup.ps1).
  [string]$DestinoBackup = "",
  [string]$HorarioBackup = "22:00"
)

. "$PSScriptRoot\comum.ps1"

Exigir-Administrador

$pacote = (Get-Item $PSScriptRoot).Parent.FullName
if (-not (Test-Path (Join-Path $pacote "server.js"))) {
  Parar "rode este script de dentro do pacote extraído (a pasta que tem server.js)."
}
$versao = (Get-Content (Join-Path $pacote "versao.txt") -Raw).Trim()
if (-not $DestinoBackup) { $DestinoBackup = Join-Path $Raiz "backups" }

Write-Host "Instalação inicial — versão $versao" -ForegroundColor White
Write-Host "  raiz: $Raiz"

# ------------------------------------------------------- 1. pré-requisitos

Escrever-Passo "1/9 Conferindo o que precisa estar instalado"

$nodeEmbutido = Test-Path (Join-Path $pacote "runtime\node.exe")
$nodePacote = Node-Da-Release $pacote
if (-not $nodePacote) {
  Parar "o pacote não traz runtime\node.exe e não há Node.js no PATH. Use o pacote gerado pelo GitHub Actions."
}
$versaoNode = (& $nodePacote --version).TrimStart("v")
if ($nodeEmbutido) {
  Escrever-Ok "Node $versaoNode, embutido no pacote"
} else {
  $maiorNode = [int]($versaoNode -split '\.')[0]
  $maiorEsperado = [int]((Get-Content (Join-Path $pacote "node-versao.txt") -Raw).Trim() -split '\.')[0]
  if ($maiorNode -ne $maiorEsperado) {
    # `standalone` traz as dependências, não o runtime: sem o Node embutido, a
    # versão maior do Node da máquina tem que ser a mesma da compilação.
    Parar "Node $versaoNode instalado, mas este pacote foi compilado para a linha $maiorEsperado.x. Instale a versão certa."
  }
  Escrever-Ok "Node $versaoNode, do PATH"
}

$psql = Achar-BinPostgres "psql"
if (-not $psql) { Parar "não encontrei o psql. Instale o PostgreSQL (com as Command Line Tools)." }
Escrever-Ok "psql em $psql"

$nssmCmd = Get-Command $Nssm -ErrorAction SilentlyContinue
if (-not $nssmCmd) { Parar "não encontrei o nssm. Passe -Nssm com o caminho do nssm.exe." }
Escrever-Ok "nssm em $($nssmCmd.Source)"
# O serviço fica registrado apontando para ESTE nssm.exe. No pen drive, o
# sistema funciona até alguém tirar o pen drive — e depois não sobe mais.
try {
  $unidadeNssm = Split-Path -Qualifier $nssmCmd.Source
  if (([IO.DriveInfo]::new($unidadeNssm)).DriveType -eq [IO.DriveType]::Removable) {
    Parar "o nssm.exe está numa unidade removível ($unidadeNssm). Copie para C:\Program Files\nssm\ e passe -Nssm com esse caminho."
  }
} catch {
  # Caminho de rede (\\...) não tem letra de unidade; não é o caso do pen drive.
}

if (Get-Service $NomeServico -ErrorAction SilentlyContinue) {
  Parar "o serviço $NomeServico já existe. Esta máquina já foi instalada — use atualizar.ps1."
}

$unidade = Split-Path -Qualifier $Raiz
if (-not (Test-Path "$unidade\")) {
  Parar "a unidade $unidade não existe nesta máquina. Passe -Raiz com outro caminho."
}

# ------------------------------------------------------------ 2. diretórios

Escrever-Passo "2/9 Criando a árvore de diretórios"
foreach ($pasta in @("releases", "storage", "backups", "logs", "pacotes")) {
  New-Item -ItemType Directory -Force -Path (Join-Path $Raiz $pasta) | Out-Null
}
Escrever-Ok "$Raiz criado."

# ------------------------------------------------------------------ 3. env

Escrever-Passo "3/9 Escrevendo o .env"
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

  # A senha do usuário "aja" é aleatória e só existe aqui: quem lê é o sistema,
  # o backup e a atualização, todos pelo .env. Para mexer no banco à mão, a
  # senha que importa é a do postgres.
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

Escrever-Passo "4/9 Criando o banco e o usuário da aplicação"
$env:PGPASSWORD = $SenhaPostgres
try {
  # A senha viaja no texto SQL, por stdin, e nunca como argumento — argumento
  # aparece na lista de processos da máquina.
  #
  # Por que não `-c` com variável do psql (`:'senha'`), que era o jeito antigo:
  # `-c` manda a linha direto ao servidor, SEM substituir variáveis do psql, e
  # o servidor recebe o `:` cru e recusa com "syntax error at or near". Só
  # script lido de arquivo ou de stdin passa pela substituição — e aí a senha
  # voltaria para a linha de comando, em `-v`. Por stdin, não precisa dela.
  #
  # ON_ERROR_STOP é obrigatório neste formato: sem ele, erro em script lido de
  # stdin ainda termina com código 0, e a falha passaria batida.
  $senhaSql = $partes.Senha -replace "'", "''"
  $existeUsuario = & $psql -h localhost -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$($partes.Usuario)'"
  if ($existeUsuario -ne "1") {
    "CREATE USER `"$($partes.Usuario)`" WITH PASSWORD '$senhaSql';" |
      & $psql -h localhost -U postgres -v ON_ERROR_STOP=1 -q -f - | Out-Null
    if ($LASTEXITCODE -ne 0) { Parar "falhou ao criar o usuário do banco." }
    Escrever-Ok "usuário $($partes.Usuario) criado."
  } else {
    # Sobra de tentativa anterior: o .env recém-escrito tem uma senha nova, e
    # ela precisa valer para o usuário que já existe — senão a aplicação sobe
    # sem conseguir conectar, e o erro só aparece na primeira tela.
    "ALTER USER `"$($partes.Usuario)`" WITH PASSWORD '$senhaSql';" |
      & $psql -h localhost -U postgres -v ON_ERROR_STOP=1 -q -f - | Out-Null
    if ($LASTEXITCODE -ne 0) { Parar "o usuário $($partes.Usuario) já existia e não consegui ajustar a senha dele." }
    Escrever-Aviso "usuário $($partes.Usuario) já existia — senha sincronizada com o .env."
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

Escrever-Passo "5/9 Instalando a release $versao"
$destino = Join-Path $Raiz "releases\$versao"
if (Test-Path $destino) { Parar "$destino já existe." }
New-Item -ItemType Directory -Force -Path $destino | Out-Null
Copy-Item (Join-Path $pacote "*") $destino -Recurse -Force
Ligar-Env $Raiz $destino
Apontar-Current $Raiz $destino
Escrever-Ok "release em $destino, current apontando para ela."

# O duplo clique da atualização mora na raiz, fora das releases: é o arquivo
# que alguém vai procurar daqui a meses.
$atalhoAtualizar = Join-Path $pacote "scripts\ATUALIZAR.cmd"
if (Test-Path $atalhoAtualizar) {
  Copy-Item $atalhoAtualizar (Join-Path $Raiz "ATUALIZAR.cmd") -Force
  Escrever-Ok "ATUALIZAR.cmd em $Raiz"
}

# -------------------------------------------------------------- 6. migrar

Escrever-Passo "6/9 Criando o schema (migrate deploy)"
$ferramentas = Join-Path $destino "ferramentas"
$nodeRelease = Node-Da-Release $destino
$env:DATABASE_URL = $urlBanco
try {
  Push-Location $ferramentas
  & $nodeRelease (Join-Path $ferramentas "node_modules\prisma\build\index.js") migrate deploy
  $codigo = $LASTEXITCODE
  Pop-Location
  if ($codigo -ne 0) { Parar "migrate deploy falhou (código $codigo)." }
  Escrever-Ok "schema criado."

  Escrever-Passo "7/9 Criando o primeiro administrador"
  Push-Location $ferramentas
  & $nodeRelease (Join-Path $ferramentas "criar-admin.mjs") --email $EmailAdmin --senha $SenhaAdmin --nome "Administrador"
  $codigo = $LASTEXITCODE
  Pop-Location
  if ($codigo -ne 0) { Parar "não consegui criar o administrador (código $codigo)." }
} finally {
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
}

# -------------------------------------------------------------- 8. serviço

Escrever-Passo "8/9 Registrando o serviço do Windows e o firewall"
# Pelo current, e não pela release de hoje: a atualização troca o current, e o
# Node da versão nova passa a rodar sem mexer no serviço.
$nodeServico = if ($nodeEmbutido) { Join-Path $Raiz "current\runtime\node.exe" } else { $nodePacote }
& $Nssm install $NomeServico $nodeServico "$Raiz\current\server.js" | Out-Null
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

# Sub-rede local em vez de perfil de rede: vale com a rede marcada como
# Privada, Pública ou Domínio — o que o Windows escolheu nesta máquina é
# detalhe que ninguém confere, e é o motivo clássico de "abre aqui e não abre
# em nenhum outro PC" —, e continua fechada para qualquer coisa fora da rede.
if (-not (Get-NetFirewallRule -DisplayName "AJA Obras" -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName "AJA Obras" -Direction Inbound -LocalPort $Porta -Protocol TCP `
    -Action Allow -Profile Any -RemoteAddress LocalSubnet | Out-Null
}
Escrever-Ok "firewall: porta $Porta liberada para a rede local."

# --------------------------------------------------------------- 9. backup

Escrever-Passo "9/9 Agendando o backup diário"
# Aponta para current, não para a release de hoje: cada atualização traz o
# backup.ps1 da versão nova sem precisar reagendar.
$scriptBackup = Join-Path $Raiz "current\scripts\backup.ps1"
$logBackup = Join-Path $Raiz "logs\backup.log"
# -Command em vez de -File por causa do log: como SYSTEM e sem janela, saída que
# não vai para arquivo se perde. O `exit` repassa o código do backup.ps1 para o
# "Último resultado" do Agendador de Tarefas.
$comando = "& '$scriptBackup' -Raiz '$Raiz' -Destino '$DestinoBackup' *>> '$logBackup'; exit `$LASTEXITCODE"
$acao = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"$comando`""
$gatilho = New-ScheduledTaskTrigger -Daily -At $HorarioBackup
# StartWhenAvailable: se a máquina estiver desligada no horário, roda quando
# voltar, em vez de pular o dia.
$ajustes = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 6)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName $TarefaBackup -Action $acao -Trigger $gatilho `
  -Settings $ajustes -Principal $principal -Force | Out-Null
Escrever-Ok "tarefa `"$TarefaBackup`" diária às $HorarioBackup, destino $DestinoBackup."

# Roda uma vez agora, pela própria tarefa e não chamando o script direto: o que
# precisa ser provado é que ele funciona como SYSTEM, sem a sessão de quem
# instala — achar o pg_dump, ler o .env, escrever no destino.
Start-ScheduledTask -TaskName $TarefaBackup
# 267009 = em execução, 267011 = ainda não rodou. Os dois significam "espere".
$limite = (Get-Date).AddMinutes(5)
do {
  Start-Sleep -Seconds 3
  $resultadoBackup = (Get-ScheduledTaskInfo -TaskName $TarefaBackup).LastTaskResult
  $estado = (Get-ScheduledTask -TaskName $TarefaBackup).State
} while (($estado -eq "Running" -or $resultadoBackup -in 267009, 267011) -and (Get-Date) -lt $limite)
$backupOk = $resultadoBackup -eq 0
if ($backupOk) {
  Escrever-Ok "primeiro backup feito."
} else {
  Write-Host "   o primeiro backup NÃO funcionou (resultado $resultadoBackup). Veja $logBackup" -ForegroundColor Red
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -ne "WellKnown" } |
  Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "Instalado." -ForegroundColor Green
Write-Host "  Nesta máquina:  http://localhost:$Porta"
if ($ip) { Write-Host "  Na rede:        http://${ip}:$Porta" }
Write-Host "  Login:          $EmailAdmin"
Write-Host "  Backup:         diário às $HorarioBackup em $DestinoBackup"
Write-Host "  Atualizar:      $Raiz\ATUALIZAR.cmd"
Write-Host ""
Write-Host "Falta fazer, fora deste script:" -ForegroundColor Yellow
Write-Host "  1. Abrir o endereço da rede em OUTRO computador antes de ir embora."
if (-not $backupOk) {
  Write-Host "  2. Corrigir o backup: rode a tarefa `"$TarefaBackup`" de novo depois de ver o log." -ForegroundColor Red
}
exit 0
