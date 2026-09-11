# Roteiro de instalação e atualização

Passo a passo para executar, na máquina de **teste** e na do **cliente**. As
diferenças estão marcadas com 🧪 (só no teste) e 🏢 (só no cliente). O porquê de
cada decisão está em [`instalacao-on-premise.md`](instalacao-on-premise.md).

Existem dois caminhos, e **os dois rodam o mesmo `instalar.ps1`** no fim:

| | **Kit** — o principal | **Manual** — plano B |
| --- | --- | --- |
| Quando usar | Sempre | Só se o kit falhar e não der para corrigir na hora |
| O que levar | Um arquivo: o kit | PostgreSQL, NSSM e o pacote, instalados um a um |
| Como roda | Duplo clique no `INSTALAR.cmd` | Comando no PowerShell como Administrador |
| Senhas | Perguntadas com digitação oculta | Digitadas no comando: ficam no histórico do PowerShell |

---

## 0. Gerar o kit e o pacote

O GitHub Actions monta os dois a partir do que está **no GitHub**. Faça o push
antes, ou eles saem sem as últimas mudanças.

| Arquivo | Para quê |
| --- | --- |
| `aja-obras-kit-<versão>.zip` + `.sha256` | **Primeira instalação.** Traz tudo: sistema, PostgreSQL e NSSM (~525 MB). |
| `aja-obras-<versão>.zip` + `.sha256` | **Atualização**, e a instalação manual. Só o sistema (~170 MB). |

**🧪 Teste: disparo manual, sem publicar Release**

1. GitHub → **Actions → Release on-premise → Run workflow**.
2. Branch **`prod`**, versão **`2026.09.11-teste1`**. Na página da execução,
   baixe o artefato **`aja-obras-kit-2026.09.11-teste1`**.
3. Repita com **`2026.09.11-teste2`**. Desta vez baixe o artefato
   **`aja-obras-2026.09.11-teste2`**, que é o pacote, para testar a atualização.
4. Cada artefato vem como um `.zip` que contém o arquivo e o `.sha256`. Extraia
   só essa camada de fora.

A primeira execução baixa o instalador do PostgreSQL (~370 MB). As seguintes
usam o cache.

**🏢 Cliente: por tag**

```
git tag v2026.09.14
git push --tags
```

Os quatro arquivos saem em **Releases** no GitHub.

---

## 1. Antes de começar

- [ ] Entrar com uma conta **administradora** do Windows.
- [ ] Ter um disco **D:**. Pelo kit, se não houver, a janela pergunta se pode
      instalar em `C:\aja-obras`. Na instalação manual, acrescente
      `-Raiz C:\aja-obras` aos comandos. **Não** use `subst` para simular um
      D:: a tarefa de backup roda como SYSTEM e não enxerga essa unidade.
- [ ] 🧪 **Desligar a internet** depois de copiar o kit. Se a instalação passar
      assim, ela não depende de download.

---

## 2. Instalação pelo kit

### 2.1 Copiar e extrair

1. Copie o `aja-obras-kit-<versão>.zip` para a máquina, por exemplo em
   `C:\instalacao\`.
2. **Desbloqueie antes de extrair:** botão direito no `.zip` → **Propriedades**
   → marque **Desbloquear** → OK. Sem isso, o Windows marca cada arquivo
   extraído como "vindo da internet" e mostra aviso de segurança ao abrir.
3. Botão direito → **Extrair tudo**.

> **Não rode de dentro do `.zip`.** O Explorer deixa abrir o `INSTALAR.cmd`
> sem extrair, mas o resto do kit não vem junto. O script detecta isso e para
> com instrução.

### 2.2 Rodar

1. Duplo clique em **`INSTALAR.cmd`**.
2. Aceite o aviso **"Deseja permitir que este aplicativo faça alterações?"**.
   A instalação continua numa janela nova.
3. Responda o que a janela pedir:

| Pergunta | Regra |
| --- | --- |
| E-mail do administrador | É o login da tela do sistema |
| Senha do administrador (duas vezes) | Mínimo 8 caracteres, com letra e número |
| Senha do `postgres` (duas vezes) | Qualquer uma, sem aspas duplas (`"`) e sem terminar em `\`. **Anote.** |

Se a máquina **já tiver** PostgreSQL, o kit não instala outro e pede a senha do
`postgres` que já existe.

### 2.3 O que acontece

Leva de 5 a 15 minutos, sem mais perguntas:

1. Confere o SHA-256 do pacote e dos componentes.
2. Extrai o pacote.
3. Instala o PostgreSQL 17 em modo silencioso, sem pgAdmin nem Stack Builder.
4. Confirma que a senha do `postgres` entra no banco.
5. Copia o NSSM para `D:\aja-obras\bin\`.
6. Roda o `instalar.ps1`. Os 9 passos dele precisam terminar em verde:
   1. Pré-requisitos
   2. Diretórios
   3. `.env`
   4. Banco
   5. Release
   6. Schema
   7. Administrador
   8. Serviço e firewall
   9. Backup
7. Guarda o pacote em `D:\aja-obras\pacotes\` e abre o navegador no sistema.

### 2.4 Se parar no meio

A janela mostra o erro em **vermelho** e espera Enter para fechar. Tire um
print antes de fechar. Se o erro aconteceu depois do passo 5 do `instalar.ps1`,
siga **"Reinstalar do zero"** (seção 8) antes de rodar o kit de novo.

---

## 3. Instalação manual (plano B)

Os componentes são os mesmos do kit, e dá para tirá-los da pasta
`componentes\` do kit extraído. **O Node não precisa ser instalado:** ele vem
dentro do pacote, em `runtime\node.exe`.

### 3.1 PostgreSQL

1. Rodar `postgresql-17.10-2-windows-x64.exe`.
2. Componentes: manter **PostgreSQL Server** e **Command Line Tools**. O
   pgAdmin é opcional.
3. Senha do superusuário `postgres`: **anotar**.
4. Porta **5432**, diretório e locale padrão.
5. No fim, **desmarcar o Stack Builder**, que baixa complementos da internet.

### 3.2 NSSM

Copiar o `nssm.exe` para **`C:\Program Files\nssm\nssm.exe`**.

> Não rode direto do pen drive. O serviço fica registrado apontando para o
> `nssm.exe` usado na instalação: com ele no pen drive, o sistema para de subir
> no primeiro reinício depois que o pen drive sai. O `instalar.ps1` recusa esse
> caso.

### 3.3 Conferir e extrair o pacote

```powershell
cd C:\instalacao
(Get-FileHash .\aja-obras-<versão>.zip -Algorithm SHA256).Hash
Get-Content .\aja-obras-<versão>.zip.sha256
```

Os dois códigos têm que ser iguais (maiúscula e minúscula não importam).
Desbloqueie o `.zip` como no passo 2.1 e extraia para
`C:\instalacao\aja-obras-<versão>\`.

### 3.4 Rodar o instalador

PowerShell **como Administrador**:

```powershell
cd C:\instalacao\aja-obras-<versão>
powershell -ExecutionPolicy Bypass -File .\scripts\instalar.ps1 `
    -SenhaPostgres "senha do postgres" `
    -EmailAdmin "admin@empresa.local" `
    -SenhaAdmin "Senha1234" `
    -Nssm "C:\Program Files\nssm\nssm.exe"
```

> **Por que `powershell -ExecutionPolicy Bypass -File`:** o Windows vem com a
> execução de scripts desligada. O Bypass libera só esta execução e não muda a
> máquina. Não use `Set-ExecutionPolicy Unrestricted`.

> **As senhas ficam no histórico do PowerShell**, em texto puro. Ao terminar,
> apague-o:
> `Remove-Item (Get-PSReadLineOption).HistorySavePath`

---

## 4. Conferir a instalação

Vale para os dois caminhos.

- [ ] `http://localhost:3000` abre, e o login com o administrador funciona.
- [ ] `Invoke-RestMethod http://localhost:3000/api/health` mostra a versão
      certa e `banco: True`.
- [ ] De **outro aparelho** na mesma rede (o celular serve), abrir
      `http://<ip-da-máquina>:3000`. 🏢 No cliente: `http://192.168.1.222:3000`.
      O firewall é liberado pela instalação, só para a rede local.
- [ ] Agendador de Tarefas → **AJA Obras - backup** → último resultado `0x0`.
- [ ] Existe `D:\aja-obras\backups\<data>\banco.dump`.
- [ ] Existe `D:\aja-obras\ATUALIZAR.cmd`.
- [ ] **Reiniciar a máquina e NÃO fazer login.** Pelo outro aparelho, o sistema
      tem que abrir: o serviço sobe antes de qualquer login.

Com o sistema no ar, **crie uma obra e anexe um PDF**. Depois, rode o backup de
novo e confira se o arquivo aparece:

```powershell
Start-ScheduledTask "AJA Obras - backup"
Get-ChildItem D:\aja-obras\backups\documentos -Recurse -File
```

### 🏢 Atalho na pasta de rede

Crie um arquivo `Sistema de Obras.url` na pasta comum, com este conteúdo:

```
[InternetShortcut]
URL=http://192.168.1.222:3000
```

Use o **IP**, não o nome da máquina: o DNS dela aponta para fora, e o nome pode
não resolver em todos os PCs.

---

## 5. Atualizar para uma nova versão

1. Copie o `aja-obras-<versão>.zip` **e o `.sha256`** para
   `D:\aja-obras\pacotes\`.
2. Avise os usuários: o sistema fica fora por alguns minutos.
3. Duplo clique em **`D:\aja-obras\ATUALIZAR.cmd`** e aceite o aviso de
   administrador.
4. A janela mostra qual pacote encontrou. Confira e aperte **Enter**.

O script confere o hash, faz dump do banco, para o serviço, aplica as
migrations, troca a versão e verifica se o sistema respondeu. Se falhar, volta
sozinho para a versão anterior e mostra como restaurar o banco.

Pelo PowerShell, como Administrador, o equivalente é:

```powershell
powershell -ExecutionPolicy Bypass -File D:\aja-obras\current\scripts\atualizar.ps1 `
    -Pacote D:\aja-obras\pacotes\aja-obras-<versão>.zip
```

**Conferir:**

- [ ] `/api/health` mostra a versão nova.
- [ ] Obras e documentos continuam lá.
- [ ] Quem estava logado **continua logado** (sinal de que o `.env` foi
      preservado).
- [ ] Existe `D:\aja-obras\backups\antes-de-<versão>-….dump`.

---

## 6. Restaurar um backup

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

## 7. 🧪 Testes de falha (só na máquina de teste)

São os testes que valem mais. Antes de repetir uma atualização, apague a pasta
`D:\aja-obras\releases\<versão>` que ela criou.

| # | Como provocar | O que tem que acontecer |
| --- | --- | --- |
| 1 | Abrir o `INSTALAR.cmd` **de dentro do `.zip`**, sem extrair | Para e manda extrair o kit. |
| 2 | Na senha do admin, digitar `abc` | Recusa e pede de novo, **antes** de instalar qualquer coisa. |
| 3 | Confirmar a senha com uma diferente, ou só trocando maiúscula por minúscula | "As duas não são iguais", e pede de novo. |
| 4 | **Hash errado:** trocar um caractere do `.sha256` do pacote e atualizar | Para no passo 1, sem mexer em nada. |
| 5 | **Banco parado:** `Stop-Service postgresql-x64-17` e atualizar | Aborta no dump; o sistema anterior segue intacto. Religue o Postgres depois. |
| 6 | **Rollback manual:** comandos abaixo | `/api/health` volta a mostrar a versão anterior. |
| 7 | **Restauração:** excluir uma obra no sistema e seguir a seção 6 | A obra volta, e o PDF abre. |
| 8 | **Plano B:** depois de reinstalar do zero, instalar pela seção 3 | Mesmo resultado da seção 4. |

Rollback manual (teste 6):

```powershell
cmd /c rmdir D:\aja-obras\current
cmd /c mklink /J D:\aja-obras\current D:\aja-obras\releases\2026.09.11-teste1
Restart-Service AjaObras
```

---

## 8. Reinstalar do zero

O `instalar.ps1` e o kit se recusam a rodar se o serviço já existir. PowerShell
como Administrador:

```powershell
Stop-Service AjaObras -ErrorAction SilentlyContinue
& D:\aja-obras\bin\nssm.exe remove AjaObras confirm      # manual: C:\Program Files\nssm\nssm.exe
Unregister-ScheduledTask "AJA Obras - backup" -Confirm:$false
Remove-NetFirewallRule -DisplayName "AJA Obras"
Remove-Item D:\aja-obras -Recurse -Force
```

Depois, escolha o que fazer com o PostgreSQL:

**Manter o PostgreSQL e apagar só o banco do sistema.** Quem rodar o kit de
novo usa o PostgreSQL existente, com a mesma senha do `postgres`.

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "DROP DATABASE aja_obras" -c "DROP USER aja"
```

**🧪 Remover o PostgreSQL também**, para testar de novo a instalação silenciosa:

```powershell
& "C:\Program Files\PostgreSQL\17\uninstall-postgresql.exe" --mode unattended
Remove-Item "C:\Program Files\PostgreSQL" -Recurse -Force
```

> A segunda linha não é opcional. O desinstalador deixa a pasta de dados para
> trás, e um PostgreSQL instalado por cima dela reaproveita o banco antigo **com
> a senha antiga** do `postgres`.

---

## 9. As senhas

| Usuário | Onde é usada | Quem define | Onde fica |
| --- | --- | --- | --- |
| Administrador do sistema | Login da tela | Você, na instalação | Só o hash, no banco. Pode ser trocada pela tela. |
| `postgres` | Manutenção do banco (reinstalar, restaurar à mão) | Você, na instalação | **Em lugar nenhum. Anote.** |
| `aja` | O sistema, o backup e a atualização | Gerada pela instalação | `D:\aja-obras\.env`. Ninguém precisa dela. |

O `postgres` só aceita conexão da própria máquina: uma senha simples não fica
exposta para a rede. Não libere o PostgreSQL para acesso de outros PCs.

---

## 10. Se algo der errado

| O que ver | Onde |
| --- | --- |
| Erro do sistema | `D:\aja-obras\logs\servico-erro.log` |
| Backup | `D:\aja-obras\logs\backup.log` |
| Instalação do PostgreSQL pelo kit | `%TEMP%\install-postgresql.log` |
| Saúde | `http://localhost:3000/api/health` |
| Serviço | `Get-Service AjaObras` |

Para pedir ajuda, mande:

- print da janela, ou a saída inteira do PowerShell, principalmente o que sair
  em vermelho;
- os logs acima.

**Nunca:**

- compartilhar `D:\aja-obras\storage\` na rede, porque qualquer um abriria
  qualquer contrato sem passar pela permissão do sistema;
- apagar ou sobrescrever `D:\aja-obras\.env`;
- apagar `D:\aja-obras\bin\nssm.exe`, porque o serviço depende dele;
- rodar `prisma migrate dev` ou `db push`.
