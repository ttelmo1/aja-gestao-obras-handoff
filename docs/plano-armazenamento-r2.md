# Plano — documentos no Cloudflare R2 (etapa 15)

Escrito em 05/10/2026, quando o sistema deixou de ser on-premise e passou a
ser hospedado na nuvem (ponto #11 de [`pontos-para-reuniao.md`](pontos-para-reuniao.md)).
Hospedagem escolhida para avaliação: **Vercel + Neon, com os arquivos num
storage S3-compatível** — Cloudflare R2 como primeira opção.

## Por que esta etapa existe

A Vercel corta o corpo de qualquer requisição a uma função em **~4,5 MB**, em
qualquer plano. Hoje o arquivo vai do navegador para a Server Action
`enviarDocumentos` e de lá para o banco (`ArquivoBlob`), então tudo acima
disso falha — foi o que a Fernanda relatou. O download sofre do mesmo jeito:
`src/app/documentos/[id]/route.ts` devolve os bytes passando pela função.

O sistema aceita até 300 MB (`TAMANHO_MAXIMO_BYTES`). Para chegar lá na
Vercel, **o arquivo não pode passar pela função**: o navegador envia direto ao
R2 com uma URL assinada, e baixa direto do R2 com outra.

## O que muda, em uma frase por peça

| Peça | Hoje | Depois |
|---|---|---|
| Envio | Navegador → Server Action (arquivo inteiro) → banco | Navegador pede URL assinada → envia direto ao R2 → sistema confirma e registra |
| Download | Rota lê os bytes e devolve | Rota confere permissão e **redireciona** para URL assinada de 5 min |
| Bytes | `ArquivoBlob` (Postgres) | Bucket R2 privado; chave = `caminhoRelativo` atual |
| Freio de login | `Map` em memória | Tabela no banco (memória não sobrevive entre instâncias serverless) |
| Backup | — | Dump do Neon + cópia do bucket para outro provedor, diário |

## Decisões de desenho

1. **Driver `s3`, não `r2`.** Usa o SDK S3 padrão (`@aws-sdk/client-s3` +
   `@aws-sdk/s3-request-presigner`). R2, Magalu Cloud e Backblaze falam o mesmo
   protocolo: trocar de provedor vira troca de variável de ambiente.
   `STORAGE_DRIVER` passa a aceitar `disco | db | s3`.

2. **Um fluxo de envio só, para os três drivers.** O formulário sempre faz os
   três passos (preparar → enviar → confirmar). O que muda é a URL do passo 2:
   - `s3`: URL assinada do bucket;
   - `disco`/`db`: uma rota interna (`PUT /envios/[id]`) que grava
     pelo driver atual.

   Assim o desenvolvimento local (disco) exercita o mesmo código de tela que a
   produção, sem precisar de bucket. A alternativa — manter a Server Action
   antiga para disco/db e um caminho novo para s3 — deixa dois fluxos de envio
   para manter e testar.

3. **O que foi autorizado no passo 1 fica gravado no banco.** Tabela nova
   `EnvioPendente` (id, caminhoRelativo, usuário, obra, vínculos, tipo,
   descrição, nome original, tamanho declarado, mime, expiraEm). A confirmação
   só aceita ids pendentes **do mesmo usuário** e não vencidos — nada do que o
   navegador manda no passo 3 é confiado além do id.

4. **Tamanho travado em dois lugares.** O `Content-Length` declarado entra na
   assinatura da URL (o R2 recusa corpo de outro tamanho), e na confirmação o
   sistema faz `HEAD` no objeto e compara com o declarado e com o limite.
   O `Content-Type` também entra na assinatura.

5. **`hashSha256` fica nulo no driver `s3`.** Calcular exigiria o servidor ler
   o arquivo inteiro (o que este plano evita) ou o navegador carregar 300 MB na
   memória para o `crypto.subtle`. A coluna já é opcional, e **nada no código
   lê esse campo** — só é gravado e indexado. Se um dia servir para detectar
   duplicata, dá para calcular em segundo plano. Registrar como decisão.

6. **Download por redirecionamento.** A rota mantém todas as checagens
   (sessão, permissão, excluído, 410 se o objeto sumiu) e devolve `302` para
   uma URL assinada com `response-content-type` (derivado da extensão, como
   hoje) e `response-content-disposition` (nome original, inline ou anexo).
   O `X-Content-Type-Options: nosniff` não é configurável na URL assinada, mas
   o risco que ele cobria — conteúdo rodando **na nossa origem** com a sessão
   de quem abriu — deixa de existir: o arquivo é servido do domínio do R2.
   Para `disco`/`db` a rota continua devolvendo os bytes.

7. **Envio abandonado vira lixo controlado.** Quem fecha a aba no meio deixa
   objeto sem `Documento`. Um Vercel Cron diário apaga os objetos de
   `EnvioPendente` vencidos e as linhas. Sem regra de ciclo de vida no bucket,
   para a limpeza não depender de configuração fora do repositório.

8. **Freio de login no banco.** A lógica pura de `src/modules/auth/throttle.ts`
   (janela, tentativas, bloqueio) continua pura e testada; muda só onde o
   estado mora — tabela `FreioLogin` (chave, tentativas, bloqueadoAte, visto),
   lida e gravada na Server Action de login.

## Fases

Estimativas em horas de desenvolvimento. Antes de escrever rota, ler os guias
do Next 16 em `node_modules/next/dist/docs/` (convenção do projeto).

### Fase 1 — Driver `s3` e configuração (~3h)

- `src/lib/env.ts`: `STORAGE_DRIVER` aceita `s3`; com ele, exigir
  `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
  (`S3_REGION` com padrão `auto`, que é o do R2).
- `src/lib/storage/s3.ts`: implementa o contrato atual (`salvarArquivo` via
  `PutObject` — continua servindo ao seed e a scripts —, `abrirArquivo`,
  `arquivoExiste` via `HeadObject`, `apagarArquivo`).
- `src/lib/storage/tipos.ts`: o contrato ganha três operações:
  `urlDeEnvio(caminho, tamanho, mime)`, `infoArquivo(caminho)` (existe +
  tamanho) e `urlDeDownload(caminho, opções)` — esta última opcional
  (`disco`/`db` não implementam e a rota cai no streaming).
- `driver.ts` escolhe entre os três.

### Fase 2 — Envio em três passos (~6h)

- Migration: tabela `EnvioPendente`.
- `src/modules/documentos/envio.ts` (regra pura, com teste): o que torna uma
  confirmação válida — pendente existe, é do usuário, não venceu, objeto
  existe, tamanho confere e está no limite.
- Server Actions em `documentos/acoes.ts`:
  - `prepararEnvio`: reaproveita `autorizar`, `vinculosValidos`,
    `recusaPorRepeticao` e `validarArquivo`; cria os pendentes; devolve uma
    URL por arquivo.
  - `confirmarEnvio(ids)`: valida, cria os `Documento` + auditoria **numa
    transação só** (mesmo código de hoje), apaga os pendentes; se algo falhar,
    apaga os objetos enviados.
- Rota interna `PUT /envios/[id]` para `disco`/`db`: confere sessão e
  pendente, grava pelo driver. Fora do `matcher` do `proxy.ts`, que cortaria
  o corpo em 10 MB.
- `enviar.tsx` e `acoes-linha.tsx`: o envio passa a ser feito por um hook
  único (`useEnvioDireto`), com `XMLHttpRequest` para ter **barra de
  progresso** — com arquivos de 300 MB, um botão "Enviando…" parado por
  minutos parece travado.
- `enviarDocumentos` (a Server Action antiga) sai depois que os dois
  formulários migrarem.

### Fase 3 — Download por redirecionamento (~1h)

- `src/app/documentos/[id]/route.ts`: se o driver tem `urlDeDownload`,
  `302` para ela; senão, streaming como hoje.

### Fase 4 — Limpeza de envios abandonados (~1h)

- Rota de cron protegida por `CRON_SECRET`, `vercel.json` com agendamento
  diário. Apaga objetos e linhas de `EnvioPendente` vencidos (ex.: > 24h).

### Fase 5 — Freio de login no banco (~2h)

- Migration: tabela `FreioLogin`.
- `throttle.ts` vira funções puras sobre um registro; persistência em
  `src/app/(auth)/acoes.ts`. Ajustar `tests/` do freio.

### Fase 6 — Migração dos arquivos atuais (~2h) ✅

`npm run storage:migrar` (`scripts/migrar-arquivos-para-bucket.ts`) copia cada
`ArquivoBlob` para o bucket **com a mesma chave** (`caminhoRelativo`) —
`Documento` não muda. Sem `--executar`, só simula e lista.

- **Só lê o banco e só acrescenta no bucket.** Não apaga nem altera linha, não
  sobrescreve objeto. O ambiente continua lendo do banco até o
  `STORAGE_DRIVER` mudar — dá para rodar com o cliente usando a homologação.
- **Idempotente:** o que já está no bucket com o mesmo tamanho é pulado.
  Objeto de mesmo nome e outro tamanho é **conflito**: não sobrescreve e o
  script sai com código 1.
- **Conferência byte a byte:** o MD5 calculado tem de bater com o ETag que o
  bucket devolve, e o tamanho com o `HEAD` depois da gravação.
- Lê um arquivo por vez do banco (a lista vem só com os tamanhos).
- Relata **órfãos** (bytes sem documento, não copiados) e **documentos sem
  arquivo** em lugar nenhum.

**Roteiro da virada na homologação** (depois da fase 7):

1. Com a homologação ainda em `STORAGE_DRIVER=db`, rodar da máquina do
   desenvolvedor apontando para o Neon da homologação (`DATABASE_URL`) e para
   o bucket de homologação (`S3_*`): primeiro sem `--executar`, conferir o
   resumo, depois com `--executar`.
2. No momento da troca: rodar `--executar` de novo — leva só o que entrou
   desde a primeira rodada.
3. Trocar `STORAGE_DRIVER` para `s3` (com as `S3_*`) na Vercel e fazer o
   redeploy.
4. Abrir alguns documentos antigos e enviar um novo.
5. **Só depois**, com o sistema rodando sobre o bucket e um backup do banco
   feito: apagar as linhas de `ArquivoBlob`. A tabela e o driver `db` saem
   numa migration posterior.

Se algo der errado no passo 4, voltar `STORAGE_DRIVER` para `db` desfaz a
troca: os bytes continuam no banco.

### Fase 7 — Infraestrutura (~2h, fora do código)

- Contas **no nome da AJA**: Vercel (Pro), Neon, Cloudflare; o desenvolvedor
  entra como membro.
- Dois buckets privados: `aja-obras-homolog` e `aja-obras-producao`, cada um
  com um token de API restrito a ele.
- CORS de cada bucket: `PUT` e `GET` só da origem do ambiente correspondente.
- Projeto de produção na Vercel ligado à branch `prod`; homolog continua na
  branch `homolog`.
- Variáveis de ambiente: `STORAGE_DRIVER=s3`, `S3_*`, `COOKIE_SEGURO=true`,
  `SESSION_SECRET` novo, `CRON_SECRET`.
- Domínio: registro DNS de `obras.ajaempresarial.com.br` (feito pelo
  Henrique) apontando para a Vercel.
- Revisar `serverActions.bodySizeLimit` (320 MB) em `next.config.ts`: sem
  arquivo passando por Server Action, volta a um valor pequeno.

### Fase 8 — Backup (~2h) ✅

`scripts/backup/backup.sh`, rodado todo dia pelo
`.github/workflows/backup.yml`: dump do Neon cifrado (AES-256) e cópia dos
documentos do R2 para o Backblaze B2, conta da AJA. Retenção por regra do
bucket (35 dias de diários, 13 meses de mensais). Restauração com
`scripts/backup/restaurar-banco.sh`. Configuração, segredos e roteiro de
restauração em [`backup.md`](backup.md).

### Fase 9 — Validação e documentação (~2h)

- Em homolog, com o bucket de homolog: arquivo de 1 MB, de 50 MB e de
  ~300 MB; vários de uma vez; um de formato proibido; fechar a aba no meio;
  baixar como usuário sem permissão; download de documento excluído.
- Atualizar `etapas-e-status.md`, `pontos-para-reuniao.md`, `CLAUDE.md` e um
  roteiro de operação (`docs/operacao-nuvem.md`): onde está cada conta, como
  restaurar backup, como girar as chaves.

**Total estimado: ~21h.** Fora do contrato original (que previa on-premise);
ver ponto #11.

## Ordem de entrega

1. Fases 1–5 em `dev`, com testes.
2. Fase 7 só para homolog → `homolog` publicado com bucket de homolog.
3. Fase 6 na base de homolog. A Fernanda testa os arquivos grandes.
4. Fase 7 para produção, fase 8, e a virada (que depende da resposta do
   cliente sobre a base de homolog virar a de produção).

## Pontos a confirmar antes ou durante

- **R2 aceita `Content-Length` assinado e os `response-content-*` na URL de
  download** — verificar na documentação do R2 na fase 1. Se o
  `Content-Length` não for aplicado, o `HEAD` da confirmação continua
  garantindo o limite (o objeto grande seria apagado na confirmação).
- **A base de homolog vira a de produção?** Depende do cliente (ponto #11).
- **Outro provedor:** se o cliente exigir dados no Brasil ou cobrança
  em real, o mesmo driver serve ao Magalu Cloud — confirmar que ele aceita URL
  assinada e CORS antes de trocar.
