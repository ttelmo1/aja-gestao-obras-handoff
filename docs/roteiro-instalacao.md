# Roteiro de instalação e atualização

Passo a passo para executar. Serve para a **máquina de teste** e para a do
**cliente**. As diferenças estão marcadas com 🧪 (só no teste) e 🏢 (só no
cliente). O porquê de cada decisão está em
[`instalacao-on-premise.md`](instalacao-on-premise.md); aqui fica só o que fazer.

---

## 0. Gerar o pacote

O pacote é montado pelo GitHub Actions, a partir do que está **no GitHub**.
Faça o push antes, ou o pacote sai sem as últimas mudanças.

**🧪 Teste: disparo manual, sem publicar Release**

1. GitHub → **Actions → Release on-premise → Run workflow**
2. Branch **`prod`**, versão **`2026.09.11-teste1`**
3. Repita com **`2026.09.11-teste2`**, para testar a atualização.
4. Na página de cada execução, baixe o **artefato** (no pé da página). Ele vem
   como um `.zip` que contém o `aja-obras-<versão>.zip` e o `.sha256`. Extraia
   só essa camada de fora.

**🏢 Cliente: por tag**

```
git tag v2026.09.14
git push --tags
```

O `.zip` e o `.sha256` saem em **Releases** no GitHub.

---

## 1. Montar o pen drive

A instalação não baixa nada. Tudo é baixado antes, numa máquina com internet.

| O que | Onde baixar | Arquivo |
| --- | --- | --- |
| Node.js **24.16.0** | nodejs.org → Downloads → Windows Installer (.msi), x64 | `node-v24.16.0-x64.msi` |
| PostgreSQL **17** | enterprisedb.com → Download PostgreSQL → Windows x86-64 | `postgresql-17.x-windows-x64.exe` |
| NSSM **2.24-101** | nssm.cc/download → pré-release 2.24-101 (não a 2.24 estável, que falha em Windows 10 recente) | usar o `win64\nssm.exe` de dentro do zip |
| O sistema | passo 0 | `aja-obras-<versão>.zip` **e** `aja-obras-<versão>.zip.sha256` |

A versão do Node tem que ser da **linha 24**, a mesma de `.nvmrc`. O instalador
confere e para se for outra.

```
PENDRIVE\
├── node-v24.16.0-x64.msi
├── postgresql-17.x-windows-x64.exe
├── nssm.exe
├── aja-obras-<versão>.zip
└── aja-obras-<versão>.zip.sha256
```

---

## 2. Antes de começar, na máquina

- [ ] Entrar com uma conta **administradora** do Windows.
- [ ] Ter um disco **D:**. 🧪 Se a máquina de teste não tiver, acrescente
      `-Raiz C:\aja-obras` em **todos** os comandos (instalar, atualizar,
      backup) e troque `D:\` por `C:\` no resto deste roteiro. **Não** use `subst`
      para simular um D:: a tarefa de backup roda como SYSTEM e não enxerga essa
      unidade.
- [ ] Usar o **Windows PowerShell** (o azul, 5.1), não o PowerShell 7. É o que
      o cliente tem.
- [ ] 🧪 **Desligar a internet** depois de copiar o pen drive. Se a instalação
      passar assim, ela não depende de download.

---

## 3. Instalar os pré-requisitos

### Node.js

1. Rodar `node-v24.16.0-x64.msi` e avançar com o padrão.
2. Na tela **"Tools for Native Modules"**, **deixar desmarcado**
   *"Automatically install the necessary tools"*. Marcado, ele tenta baixar
   Chocolatey, Python e Visual Studio Build Tools, e o pacote não precisa de
   nenhum deles.

### PostgreSQL

1. Rodar `postgresql-17.x-windows-x64.exe`.
2. Componentes: manter **PostgreSQL Server** e **Command Line Tools**. Os
   scripts usam `psql`, `pg_dump` e `pg_restore`. O pgAdmin é opcional.
3. Senha do superusuário `postgres`: **anotar**. Ela é pedida na instalação do
   sistema.
4. Porta **5432**, diretório e locale padrão.
5. No fim, **desmarcar o Stack Builder**, que baixa complementos da internet.

### NSSM

Copiar o `nssm.exe` para **`C:\Program Files\nssm\nssm.exe`**.

> Não rode direto do pen drive. O serviço fica registrado apontando para o
> `nssm.exe` usado na instalação: com ele no pen drive, o sistema para de subir
> quando o pen drive sai. O `instalar.ps1` recusa esse caso.

---

## 4. Instalar o sistema

### 4.1 Copiar e conferir o pacote

Copiar o `.zip` e o `.sha256` para `C:\instalacao\` e conferir a integridade:

```powershell
cd C:\instalacao
(Get-FileHash .\aja-obras-<versão>.zip -Algorithm SHA256).Hash
Get-Content .\aja-obras-<versão>.zip.sha256
```

Os dois códigos têm que ser iguais (maiúscula e minúscula não importam). Se
não forem, copie de novo. A atualização confere isso sozinha; a instalação não.

Extrair o `.zip` (botão direito → **Extrair tudo**) para
`C:\instalacao\aja-obras-<versão>\`.

### 4.2 Rodar o instalador

Abrir **um PowerShell novo como Administrador**. Tem que ser novo, para enxergar
o Node recém-instalado.

```powershell
cd C:\instalacao\aja-obras-<versão>
powershell -ExecutionPolicy Bypass -File .\scripts\instalar.ps1 `
    -SenhaPostgres "senha do postgres" `
    -EmailAdmin "admin@empresa.local" `
    -SenhaAdmin "Senha1234" `
    -Nssm "C:\Program Files\nssm\nssm.exe"
```

| Parâmetro | O que é |
| --- | --- |
| `-SenhaPostgres` | A senha anotada no instalador do PostgreSQL |
| `-EmailAdmin` | Login do primeiro administrador do sistema |
| `-SenhaAdmin` | **Mínimo 8 caracteres, com pelo menos uma letra e um número** |
| `-Nssm` | Caminho do `nssm.exe` do passo 3 |
| `-Raiz` | Opcional. Padrão `D:\aja-obras` |
| `-HorarioBackup` | Opcional. Padrão `22:00` |

> **Por que `powershell -ExecutionPolicy Bypass -File`:** o Windows vem com a
> execução de scripts desligada. O Bypass libera só esta execução e não muda a
> máquina. Não use `Set-ExecutionPolicy Unrestricted`.

O script mostra 9 passos. Todos precisam terminar em verde:

1. Pré-requisitos
2. Diretórios
3. `.env`
4. Banco
5. Release
6. Schema
7. Administrador
8. Serviço
9. Backup ("primeiro backup feito")

### 4.3 Liberar o firewall

Ainda no PowerShell como Administrador:

```powershell
New-NetFirewallRule -DisplayName 'AJA Obras' -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Private
```

> Se a rede da máquina estiver marcada como **Pública** no Windows, a regra não
> vale. Conferir em Configurações → Rede → propriedades da conexão → **Privada**.

---

## 5. Conferir a instalação

- [ ] `http://localhost:3000` abre, e o login com o administrador funciona.
- [ ] `Invoke-RestMethod http://localhost:3000/api/health` mostra a versão
      certa e `banco: True`.
- [ ] De **outro aparelho** na mesma rede (o celular serve), abrir
      `http://<ip-da-máquina>:3000`. 🏢 No cliente: `http://192.168.1.222:3000`.
- [ ] Agendador de Tarefas → **AJA Obras - backup** → último resultado `0x0`.
- [ ] Existe `D:\aja-obras\backups\<data>\banco.dump`.
- [ ] **Reiniciar a máquina e NÃO fazer login.** Pelo outro aparelho o sistema
      tem que abrir: o serviço sobe antes de qualquer login.

Com o sistema no ar, **criar uma obra e anexar um PDF**. Depois, rodar o backup
de novo e conferir se o arquivo aparece:

```powershell
Start-ScheduledTask "AJA Obras - backup"
Get-ChildItem D:\aja-obras\backups\documentos -Recurse -File
```

### 🏢 Atalho na pasta de rede

Criar um arquivo `Sistema de Obras.url` na pasta comum, com este conteúdo:

```
[InternetShortcut]
URL=http://192.168.1.222:3000
```

Use o **IP**, não o nome da máquina: o DNS dela aponta para fora, e o nome pode
não resolver em todos os PCs.

---

## 6. Atualizar para uma nova versão

1. Copiar o `.zip` **e o `.sha256`** novos para `D:\aja-obras\pacotes\`.
2. Avisar os usuários: o sistema fica fora por alguns minutos.
3. PowerShell **como Administrador**:

```powershell
powershell -ExecutionPolicy Bypass -File D:\aja-obras\current\scripts\atualizar.ps1 `
    -Pacote D:\aja-obras\pacotes\aja-obras-<versão>.zip
```

Use o `atualizar.ps1` de `D:\aja-obras\current\scripts`, não o de dentro do
pacote novo.

O script confere o hash, faz dump do banco, para o serviço, aplica as
migrations, troca a versão e verifica se o sistema respondeu. Se falhar, volta
sozinho para a versão anterior e imprime como restaurar o banco.

**Conferir:**

- [ ] `/api/health` mostra a versão nova.
- [ ] Obras e documentos continuam lá.
- [ ] Quem estava logado **continua logado** (sinal de que o `.env` foi
      preservado).
- [ ] Existe `D:\aja-obras\backups\antes-de-<versão>-….dump`.

---

## 7. Restaurar um backup

Para quando o banco precisa voltar a um ponto anterior. **Tudo que entrou
depois do dump se perde.**

```powershell
Stop-Service AjaObras

# A senha é a do usuário "aja", dentro da DATABASE_URL em D:\aja-obras\.env
# (o trecho entre "aja:" e "@localhost").
$env:PGPASSWORD = "<senha do .env>"
& "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" --clean --if-exists `
    -h localhost -p 5432 -U aja -d aja_obras `
    "D:\aja-obras\backups\<data>\banco.dump"
Remove-Item Env:PGPASSWORD

Start-Service AjaObras
```

> Não passe a `DATABASE_URL` inteira no `-d`. Ela termina em `?schema=public`,
> e o `pg_restore` recusa.

**Documentos:** se o `storage\` também se perdeu, copie de volta:

```powershell
robocopy D:\aja-obras\backups\documentos D:\aja-obras\storage /E
```

Arquivos que entraram depois do dump sobram na pasta. É inofensivo: o banco
restaurado não aponta para eles.

---

## 8. 🧪 Testes de falha (só na máquina de teste)

São os testes que valem mais. Antes de repetir uma atualização, apague a pasta
`D:\aja-obras\releases\<versão>` que ela criou.

| # | Como provocar | O que tem que acontecer |
| --- | --- | --- |
| 1 | **Política de execução:** rodar `.\scripts\instalar.ps1` sem o `powershell -ExecutionPolicy Bypass -File` | Erro de execução desabilitada. Confirma que o LEIAME precisava do Bypass. |
| 2 | **Hash errado:** trocar um caractere do `.sha256` e atualizar | Para no passo 1, sem mexer em nada. |
| 3 | **Banco parado:** `Stop-Service postgresql-x64-17` e atualizar | Aborta no dump; o sistema anterior segue intacto. Religar o Postgres depois. |
| 4 | **Rollback manual:** comandos abaixo | `/api/health` volta a mostrar a versão anterior. |
| 5 | **Restauração:** excluir uma obra no sistema e seguir a seção 7 com o dump anterior | A obra volta, e o PDF abre. |

Rollback manual (teste 4):

```powershell
cmd /c rmdir D:\aja-obras\current
cmd /c mklink /J D:\aja-obras\current D:\aja-obras\releases\2026.09.11-teste1
Restart-Service AjaObras
```

### Reinstalar do zero

O `instalar.ps1` se recusa a rodar se o serviço já existir. Para limpar tudo:

```powershell
Stop-Service AjaObras -ErrorAction SilentlyContinue
& "C:\Program Files\nssm\nssm.exe" remove AjaObras confirm
Unregister-ScheduledTask "AJA Obras - backup" -Confirm:$false
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "DROP DATABASE aja_obras" -c "DROP USER aja"
Remove-Item D:\aja-obras -Recurse -Force
```

---

## 9. Se algo der errado

| O que ver | Onde |
| --- | --- |
| Erro do sistema | `D:\aja-obras\logs\servico-erro.log` |
| Backup | `D:\aja-obras\logs\backup.log` |
| Saúde | `http://localhost:3000/api/health` |
| Serviço | `Get-Service AjaObras` |

Para pedir ajuda, mande:

- a **saída inteira** do PowerShell (texto ou print), principalmente o que sair
  em vermelho;
- os dois logs acima.

**Nunca:**

- compartilhar `D:\aja-obras\storage\` na rede, porque qualquer um abriria
  qualquer contrato sem passar pela permissão do sistema;
- apagar ou sobrescrever `D:\aja-obras\.env`;
- rodar `prisma migrate dev` ou `db push`.
