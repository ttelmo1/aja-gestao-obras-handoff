# Deploy de homologação (Vercel + Neon)

Ambiente **descartável**, só para o cliente testar pela internet sem depender de
uma visita ao servidor. **O produto não mudou**: a entrega continua sendo
on-premise, em rede local, com Postgres no servidor do cliente e documentos em
disco (ver `CLAUDE.md`, "Restrições fixas"). Nada aqui é caminho de produção.

## O que precisou existir por causa da plataforma

| Item | Por quê |
| --- | --- |
| `STORAGE_DRIVER=db` | Na Vercel o disco é efêmero e não é compartilhado entre instâncias: o PDF enviado numa requisição não existe na seguinte. Com `db`, os bytes vão para a tabela `ArquivoBlob` no Neon e o download funciona de verdade. On-premise segue em `disco`. |
| `DIRECT_URL` | O Neon serve conexões por um pooler (PgBouncer). `prisma migrate` não consegue criar o advisory lock por lá e precisa do endpoint direto. |
| `build:vercel` | Roda `prisma migrate deploy` antes do `next build`. O `npm run build` de sempre continua só compilando — a instalação on-premise não migra sozinha. |
| `postinstall: prisma generate` | `src/generated/` é gitignored, então o client precisa ser gerado no build da plataforma. |
| `COOKIE_SEGURO=true` | A Vercel serve HTTPS. Com `false` o cookie até é aceito, mas o padrão correto sob HTTPS é `Secure`. On-premise segue `false` enquanto o servidor atender em HTTP. |

## Passo a passo

### 0. Publicar a branch

O deploy sai da branch `homolog`, não de `main` — `main` descreve a instalação
on-premise e não tem nada disto.

```sh
git push -u origin homolog
```

### 1. Neon

1. Criar projeto em <https://neon.tech>, região **AWS São Paulo (sa-east-1)** —
   mesma região do `gru1` fixado em `vercel.json`, senão cada consulta atravessa
   o continente.
2. Copiar as duas strings de conexão do painel:
   - **Pooled** (tem `-pooler` no host) → vai em `DATABASE_URL`
   - **Direct** (sem `-pooler`) → vai em `DIRECT_URL`
3. Garantir `?sslmode=require` no fim das duas.

### 2. Vercel

1. Importar o repositório. O `vercel.json` já aponta o build command; não é
   preciso mexer na tela de build.
2. **Trocar a Production Branch para `homolog`** em *Settings → Git → Production
   Branch*. A Vercel assume o branch padrão do repositório, que aqui é `main` —
   e `main` não tem `vercel.json`, nem o script `build:vercel`, nem a migration
   da `ArquivoBlob`. Sem esta troca o primeiro build falha.
3. Em *Settings → Environment Variables*, cadastrar:

   ```
   DATABASE_URL   = postgresql://...-pooler.../neondb?sslmode=require
   DIRECT_URL     = postgresql://.../neondb?sslmode=require
   SESSION_SECRET = (openssl rand -base64 48)
   COOKIE_SEGURO  = true
   STORAGE_DRIVER = db
   ```

   Todas antes do primeiro deploy: o build roda `prisma migrate deploy` e já
   precisa da `DIRECT_URL`.

   `STORAGE_DIR` não é usada quando `STORAGE_DRIVER=db`. `SEED_ADMIN_EMAIL` e
   `SEED_ADMIN_SENHA` **não vão aqui**: só o seed as lê, e o seed roda da sua
   máquina (passo 3).
4. Deploy. As migrations rodam no build.

### 3. Popular com dados de demonstração

O seed roda da máquina do desenvolvedor, apontando para o Neon:

```sh
DATABASE_URL="<string direct do Neon>" \
STORAGE_DRIVER=db \
SESSION_SECRET="qualquer-coisa-com-32-caracteres-ou-mais" \
SEED_ADMIN_EMAIL="admin@ajagrupo.local" \
SEED_ADMIN_SENHA="<senha só deste ambiente, não a do cliente>" \
npm run db:seed -- --demo
```

Use a string **direct** (sem `-pooler`) aqui também: o seed abre uma transação
longa, que é justamente o que o pooler corta.

É idempotente: pode rodar de novo sem duplicar. Sem `--demo`, cria só o
administrador e os setores.

## Limites conhecidos deste ambiente

- **Upload de no máximo ~4,5 MB.** É teto de corpo de requisição da plataforma e
  não tem como aumentar. O `bodySizeLimit: "320mb"` de `next.config.ts` vale
  on-premise; aqui a plataforma corta antes. Arquivo maior que isso falha —
  **não é bug do sistema**, e vale avisar o cliente antes do teste.
- **Documento em `bytea` não escala.** Infla o dump e passa o arquivo inteiro
  pela conexão. Serve para uma demonstração de poucos MB; não é o desenho para
  produção.
- **Cold start.** A primeira requisição depois de um tempo parado demora alguns
  segundos — a instalação on-premise não tem isso.
- **Dados públicos na internet.** Não subir documento real de obra nem dado
  pessoal de verdade: use o `--demo`.

## Encerrando

Terminado o teste: apagar o projeto na Vercel e no Neon.

O que é descartável e o que não é, na hora de decidir o que volta para `main`:

- **Descartável**: `vercel.json` e este documento — só fazem sentido nesta
  plataforma.
- **Inerte, pode ficar**: o driver de storage (`src/lib/storage/`), a tabela
  `ArquivoBlob`, `DIRECT_URL` e o script `build:vercel`. Com `STORAGE_DRIVER`
  ausente ou `disco` — o padrão — o comportamento on-premise é exatamente o de
  antes: a tabela fica vazia e `npm run build` não migra nada.
