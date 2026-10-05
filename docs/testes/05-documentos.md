# 05 — Gestão documental

Valida [requisitos.md 1.6](../requisitos.md). Regras em
[`src/modules/documentos/`](../../src/modules/documentos/) — allowlist em
[formatos.ts](../../src/modules/documentos/formatos.ts), rastreabilidade em
[origem.ts](../../src/modules/documentos/origem.ts).

**Pré-requisito:** obra com medição, movimento de tramitação e (depois de
[06](06-rerratificacoes.md)) rerratificação. Arquivos de teste no
[fim deste arquivo](#gerando-os-arquivos-de-teste).

## Upload

- [ ] **DOC-01** Enviar um PDF pela aba Documentos da obra → aparece na lista
  com nome original, tipo, tamanho e quem enviou.
- [ ] **DOC-02** Enviar **três arquivos de uma vez** → todos entram (requisito
  pede upload múltiplo).
- [ ] **DOC-03** Enviar sem selecionar nada → "Selecione ao menos um arquivo."
- [ ] **DOC-04** Enviar cada formato confirmado — `.pdf`, `.xlsx`, `.xls`,
  `.csv`, `.jpg`, `.png` → todos aceitos.
- [ ] **DOC-05** Enviar `.docx` → "Formato .docx não é aceito." Confirmar com o
  cliente: contrato e ofício em Word são comuns no setor público, e hoje não
  entram. 🎯
- [ ] **DOC-06** Enviar `.dwg` → recusa com a mensagem específica de arquivo de
  engenharia "ainda não liberado pelo cliente". A decisão está em aberto
  (requisitos seção 3) — **não liberar sem confirmação escrita**. 🎯
- [ ] **DOC-07** Enviar arquivo **sem extensão** → "Arquivo sem extensão."
- [ ] **DOC-08** Enviar arquivo **vazio** (0 bytes) → "Arquivo vazio."
- [ ] **DOC-09** Renomear um `.exe` para `.pdf` e enviar → observar. A extensão
  manda, mas o mime declarado que contradiz um formato conhecido é recusado;
  registrar o comportamento real.
- [ ] **DOC-10** Renomear um `.png` para `.jpg` e enviar → recusa com "Conteúdo
  do arquivo (image/png) não corresponde à extensão .jpg."
- [ ] **DOC-11** Enviar arquivo de **~310MB** → recusa citando o limite de 300MB.
- [ ] **DOC-12** Enviar arquivo de **~50MB** → aceita. Cronometrar: numa rede
  local, quanto demora? Se travar a tela sem feedback, é achado de usabilidade
  para a apresentação.
- [ ] **DOC-13** Enviar dois arquivos com o **mesmo nome** → os dois coexistem,
  sem um sobrescrever o outro no disco.
- [ ] **DOC-14** Nome de arquivo com acento, espaço e cedilha
  (`Ofício nº 12 – Fiscalização.pdf`) → salva e baixa com o nome intacto.
- [ ] **DOC-15** Enviar dois arquivos de uma vez, um válido e um recusado →
  verificar se o válido entrou ou se o lote inteiro foi recusado. Registrar
  qual é o comportamento — o usuário precisa saber. ⚠️

## Rastreabilidade de origem

O documento fica ligado à entidade que o originou (requisito 1.6).

- [ ] **DOC-20** Anexar documento **direto na obra** → origem "Obra" (ou
  equivalente), sem setor/etapa.
- [ ] **DOC-21** Anexar dentro de uma **medição** → a central mostra
  "Medição 01" na coluna "Vinculado a".
- [ ] **DOC-22** Anexar num **movimento de tramitação** → mostra o **setor**
  (ex.: "Controladoria") na coluna "Setor / Etapa".
- [ ] **DOC-23** Anexar numa **etapa** sem movimento → mostra o rótulo da etapa
  (ex.: "Assinatura de contrato").
- [ ] **DOC-24** Anexar numa **rerratificação** → mostra "Rerratificação 01".
- [ ] **DOC-25** Um documento anexado ao movimento de uma etapa mostra o
  vínculo **mais específico** (o setor), não o genérico.
- [ ] **DOC-26** O documento enviado pela medição aparece **só** na tela da
  medição — não na aba Documentos da obra (24/09/2026).

## Central de documentos

- [ ] **DOC-30** A central lista os documentos de todas as origens da obra.
- [ ] **DOC-31** Filtrar por **tipo de documento** → a lista reduz corretamente.
- [ ] **DOC-32** A aba Documentos abre com os **dezesseis tipos da lista do
  cliente**, na ordem: adjudicação, homologação, empenho, contrato,
  publicação do extrato, apólice, publicação da comissão, ordem de início,
  ART/RRT, CNO, termo aditivo, apostilamento, recebimento provisório,
  recebimento definitivo, licenças e "Outros". "Medições contratuais" saiu
  em 24/09/2026.
- [ ] **DOC-33** **Termo aditivo**, **apostilamento** e **Outros** aparecem
  como *Opcional* em cinza, não em vermelho, e não entram no "N de M não
  anexado(s)" — o cliente pediu os dois primeiros "em caso de necessidade".
- [ ] **DOC-34** Anexar **duas apólices** (ou duas licenças, ou duas ART) na
  mesma obra → as duas ficam na linha do tipo, na ordem de envio, e o
  cabeçalho continua contando o tipo uma vez. No **contrato** ou em outro tipo
  de arquivo único, o segundo envio é recusado com a mensagem que manda usar
  "Outros".
- [ ] **DOC-35** Anexar um boletim na tela de uma medição → ele aparece na
  linha **Medições** da própria medição e **não** aparece na aba Documentos
  da obra. O filtro de origem da aba não oferece medições.
- [ ] **DOC-35a** Tentar excluir uma obra que só tem documentos em medições →
  a recusa manda excluir "na aba Documentos e nas medições".
- [ ] **DOC-32** Filtrar por **origem** → idem.
- [ ] **DOC-33** Buscar por parte do nome do arquivo → encontra.
- [ ] **DOC-34** Buscar por um termo que não existe → estado vazio com mensagem,
  não tabela em branco sem explicação.
- [ ] **DOC-35** Editar a URL com um filtro inválido (`?tipo=BANANA`) → o filtro
  é ignorado e a tela abre normal, sem erro.
- [ ] **DOC-36** Combinar busca + tipo + origem → os três aplicam juntos.
- [ ] **DOC-37** Os filtros aplicados sobrevivem a um refresh (estão na URL).

## Download e segurança

- [ ] **DOC-40** Clicar em "Abrir" num PDF → abre inline no navegador.
- [ ] **DOC-41** Clicar num `.xlsx` → baixa como anexo, não tenta abrir inline.
- [ ] **DOC-42** Copiar a URL `/documentos/<id>` e abrir **deslogado** → 401,
  não entrega o arquivo.
- [ ] **DOC-43** Abrir a mesma URL logado como Visualizador → funciona (perfil
  tem `documento: ver`).
- [ ] **DOC-44** Trocar o `<id>` da URL por um inexistente → 404 limpo.
- [ ] **DOC-45** Conferir no disco: o arquivo está em `obras/<obraId>/…`, e
  **não** em `public/`. Nada em `public/` pode ser adivinhado por URL.
- [ ] **DOC-46** Excluir um documento → some da lista e some do download (a URL
  direta passa a dar 404), mas o registro continua na auditoria.
- [ ] **DOC-47** Depois da exclusão, o arquivo físico — ficou ou saiu do disco?
  Registrar. É exclusão lógica; confirmar com o cliente se é o esperado para
  fins de LGPD. 🎯

## Gerando os arquivos de teste

```bash
cd /tmp && mkdir -p aja-teste && cd aja-teste

printf '%%PDF-1.4\n%% teste\n' > valido.pdf
printf 'a,b,c\n1,2,3\n' > planilha.csv
printf '' > vazio.pdf                          # 0 bytes
printf 'MZ nao sou pdf' > falso.pdf            # conteúdo que não é PDF
printf 'nada' > sem-extensao
mkdir -p 'com acento' && printf '%%PDF-1.4\n' > 'Ofício nº 12 – Fiscalização.pdf'
printf '%%PDF-1.4\n' > projeto.dwg             # extensão de engenharia
head -c 52428800 /dev/urandom > grande-50mb.pdf
head -c 325058560 /dev/urandom > enorme-310mb.pdf
```

Para o DOC-10, copie um PNG real e renomeie: `cp foto.png foto-falsa.jpg`.
Depois da sessão: `rm -rf /tmp/aja-teste`.
