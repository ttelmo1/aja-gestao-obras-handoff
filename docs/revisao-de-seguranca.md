# Revisão de segurança — branch `fase-3`

Revisão focada em segurança das mudanças do branch (etapas 7–11: gestão
documental, rerratificações, farol, telas de auditoria e relatórios). Escopo:
só o que o branch **introduz** — problemas pré-existentes em `main` ficaram
fora.

- **Data:** 07/09/2026
- **Branch:** `fase-3` (11 commits sobre `main`, ~306KB de diff)
- **Modelo de ameaça assumido:** servidor on-premise, rede local, sem exposição
  à internet. O atacante relevante é um **usuário autenticado** do próprio
  cliente tentando ir além do seu perfil, não um anônimo da internet.

> **Ampliação do modelo — 09/09/2026, após conhecer o ambiente real.** A
> máquina é uma estação Windows numa rede organizada por **compartilhamentos
> com permissão por departamento**. Isso acrescenta um vetor que esta revisão
> não considerou, e que **não é de código**: se a pasta `storage\` for
> compartilhada na rede — passo natural para quem organiza o resto assim —
> qualquer pessoa com acesso ao compartilhamento lê qualquer documento pelo
> Explorer, **contornando inteiramente** a verificação de permissão de
> `src/app/documentos/[id]/route.ts`. O controle de acesso a documentos do
> sistema não sobrevive a um erro de configuração de pasta. Registrado como
> item de instalação em
> [`instalacao-on-premise.md`](instalacao-on-premise.md) §1 e na etapa 14 de
> [`etapas-e-status.md`](etapas-e-status.md).

## Resultado

**1 achado de severidade alta — corrigido em 07/09/2026.** Nada de médio ou
baixo com exploração concreta.

---

## Achado 1 — XSS armazenado via `Content-Type` do upload ✅

- **Severidade:** Alta
- **Categoria:** XSS armazenado (tipo de conteúdo controlado pelo atacante,
  servido `inline`)
- **Confiança:** 8/10
- **Local:** [`src/app/documentos/[id]/route.ts:54`](../src/app/documentos/[id]/route.ts#L54)

### O que acontece

A rota de download devolve o `mimeType` guardado no banco direto no cabeçalho
`Content-Type` (linha 54) e serve o arquivo com `Content-Disposition: inline`
(linha 58).

Esse `mimeType` é o tipo que **o navegador do remetente declarou** no
multipart, gravado sem transformação em
[`documentos/acoes.ts:144`](<../src/app/(app)/obras/[id]/documentos/acoes.ts#L144>)
(`arquivo.type`). O conteúdo do arquivo nunca é inspecionado — só a extensão.

A validação de upload não barra:
[`formatos.ts:95-105`](../src/modules/documentos/formatos.ts#L95-L105) só
rejeita o mime quando ele pertence a **outro formato da allowlist**
(`conhecidoEmOutro`). Um mime que não está em lista nenhuma — `text/html`,
`image/svg+xml` — cai fora do `if` e o upload segue para `ok: true`. O
comentário na linha 93 ("o mime enviado pelo navegador é dica, não prova; a
extensão manda") descreve a intenção certa; o problema é que a rota de download
depois trata essa "dica" como autoridade.

Não há rede de proteção: `X-Content-Type-Options: nosniff` e CSP não existem em
lugar nenhum — `next.config.ts` não define `headers()` e `src/proxy.ts` só faz
redirect por cookie, devolvendo `NextResponse.next()` sem mexer em cabeçalho. O
Next repassa intacto um `Content-Type` explícito de Route Handler.

### Cenário de exploração

1. Um usuário com `documento:criar` — concedido a `OPERACIONAL`, o perfil de
   escrita mais baixo da `MATRIZ` (`src/modules/auth/permissoes.ts`) — envia um
   arquivo chamado `laudo.png`, com `Content-Type: text/html` e um payload
   HTML/JS no corpo. A extensão passa (`png`); o mime passa (`text/html` não
   está em formato nenhum).
2. Ele manda para outro usuário o link `/documentos/<id>`. `documento:ver` é
   concedido a **todos** os perfis, inclusive `VISUALIZADOR`.
3. O navegador da vítima renderiza o payload como HTML na origem da própria
   aplicação.

O cookie de sessão é `httpOnly`, então o script não lê o cookie — mas roda
autenticado como a vítima: pode invocar Server Actions em nome dela (se a
vítima for `ADMINISTRADOR`, elevar o próprio usuário do atacante) e exfiltrar
qualquer obra, medição ou registro de auditoria que ela enxergue.
`image/svg+xml` com nome `.png` dá o mesmo resultado.

Isso atravessa exatamente a fronteira `OPERACIONAL` → `ADMINISTRADOR` que a
`MATRIZ` existe para sustentar.

### Correção recomendada

1. **Na rota de download**, não confiar no `mimeType` gravado: derivar o tipo a
   partir de `documento.extensao` via `FORMATOS_CONFIRMADOS` / `formatosAceitos()`,
   com fallback `application/octet-stream`.
2. Enviar `X-Content-Type-Options: nosniff` na resposta.
3. Usar `Content-Disposition: attachment` para tudo que não for PDF, JPEG ou
   PNG (`inline` continua fazendo sentido só para esses três).
4. **No upload**, apertar `validarArquivo` para rejeitar qualquer mime fora da
   união dos `mimeTypes` da allowlist, em vez de só quando colide com outro
   formato.
5. (Defesa em profundidade) Uma CSP global — `default-src 'self'`, mais
   `sandbox` nessa rota — conteria o risco residual.

### Corrigido em 07/09/2026

Itens 1–4 implementados; o item 5 (CSP global) ficou **pendente**, como tarefa
própria: CSP mal calibrada quebra tela e precisa de teste manual.

- `src/modules/documentos/formatos.ts` — `tipoDeConteudo(extensao)` devolve o
  mime canônico da extensão (fallback `application/octet-stream`) e
  `abreInline(extensao)` libera a aba só para PDF, JPG, JPEG e PNG.
  `validarArquivo` passou a devolver `mimeNormalizado`: o mime declarado
  quando a allowlist o reconhece, senão o canônico da extensão.
- `src/app/documentos/[id]/route.ts` — o `Content-Type` sai de
  `tipoDeConteudo(documento.extensao)`, a resposta ganhou
  `X-Content-Type-Options: nosniff` e o `Content-Disposition` vira `attachment`
  fora dos quatro formatos que abrem na aba. O `select` troca `mimeType` por
  `extensao`.
- `src/app/(app)/obras/[id]/documentos/acoes.ts` — grava `mimeNormalizado` no
  lugar de `arquivo.type`.
- `tests/documentos.test.ts` — 4 casos novos fixando o contrato: `.png` com
  `text/html` entra mas grava `image/png`; `.jpg` com `image/svg+xml` grava
  `image/jpeg`; `text/csv` num `.csv` é preservado; o tipo de resposta vem da
  extensão e XLSX/XLS/CSV não abrem na aba.

**Por que normalizar em vez de rejeitar o mime desconhecido:** rejeitar todo
mime fora da allowlist quebraria upload legítimo — vários navegadores mandam
`application/octet-stream` para `.xlsx`, e máquina com Excel instalado manda
`application/vnd.ms-excel` para `.csv`. Como a rota deixou de confiar no campo,
rejeitar só geraria atrito sem ganho de segurança.

Verificação: `npm run typecheck`, `npm run lint` e `npm test` (255 testes, 59
suítes, 0 falhas) — limpos.

---

## O que foi verificado e passou

Registrado para não ser re-revisado sem motivo:

- **Path traversal no storage:** resolução é normalize-and-verify
  (`resolverDentroDe` em `src/lib/storage.ts`); o nome em disco é UUID, o nome
  original só volta como `filename*` percent-encoded.
- **Autorização:** toda server action chama `autorizar()` e toda página
  `exigirPermissao()`. IDs de vínculo entre obras são reconferidos no servidor
  (`vinculosValidos`) — não dá para anexar documento de uma obra em movimento
  de outra.
- **Injeção de fórmula em XLSX:** o texto sai como `inlineStr` escapado no
  writer próprio (`src/modules/relatorios/xlsx.ts`), não como fórmula.
- **Injeção em nome de arquivo de relatório:** o nome é *slugificado* antes de
  entrar no `Content-Disposition`.
- **Login:** comparação com hash-dummy para tempo constante, mais throttle
  (`src/modules/auth/throttle.ts`); o commit `1f905d8` já tinha parado de
  confiar em header de IP.
- **Open redirect:** o guard do parâmetro `destino` em `src/app/(auth)/acoes.ts`
  está correto (só aceita caminho relativo interno).
- **SQL injection:** não há `$queryRaw` / `$executeRaw` fora do código gerado
  pelo Prisma.

## Fora de escopo por decisão

Seguindo o combinado da revisão: negação de serviço, exaustão de recursos,
limites de taxa e segredos em disco não foram tratados como achados de
segurança aqui.
