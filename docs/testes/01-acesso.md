# 01 — Acesso e permissões

Valida [requisitos.md 1.1](../requisitos.md). Regras em
[`src/modules/auth/`](../../src/modules/auth/): matriz de permissões em
[permissoes.ts](../../src/modules/auth/permissoes.ts), política de senha em
[senha.ts](../../src/modules/auth/senha.ts), freio em
[throttle.ts](../../src/modules/auth/throttle.ts).

**Pré-requisito:** banco recém-semeado, logado como `admin@ajagrupo.local`.

## Login e sessão

- [ ] **ACS-01** Login com e-mail e senha corretos → entra no painel.
- [ ] **ACS-02** Login com senha errada → "E-mail ou senha incorretos."
- [ ] **ACS-03** Login com e-mail que não existe → **a mesma mensagem** e um
  tempo de resposta parecido com o do ACS-02. Mensagem ou demora diferente
  entrega quais e-mails existem no sistema.
- [ ] **ACS-04** Errar a senha 5 vezes seguidas → a 6ª tentativa recusa com
  "Tentativas demais. Espere N minuto(s)…" **mesmo com a senha certa**.
- [ ] **ACS-05** Depois do bloqueio, reiniciar `npm run dev` e tentar de novo →
  entra. O freio é em memória, por decisão de escopo (instalação de um processo
  só). Confirmar que isso é aceitável para o cliente. 🎯
- [ ] **ACS-06** Acessar `/dashboard` sem estar logado → redireciona para o
  login, não dá erro nem tela em branco.
- [ ] **ACS-07** Logar, copiar a URL de uma obra, sair (logout) e colar a URL →
  redireciona para o login.
- [ ] **ACS-08** Logado, apagar o cookie `aja_sessao` nas DevTools e recarregar
  → volta para o login.
- [ ] **ACS-09** Login pela tela de largura ~768px → formulário legível, botão
  alcançável, sem rolagem horizontal.

## Senha e recuperação

- [ ] **ACS-10** "Esqueci minha senha" com e-mail existente → mensagem de
  confirmação.
- [ ] **ACS-11** Mesma tela com e-mail que não existe → **mensagem idêntica**.
  Não pode diferenciar.
- [ ] **ACS-12** Não há servidor de e-mail na rede local: confirmar por onde o
  link chega ao usuário na prática (log do servidor? admin gera e entrega?).
  Anotar o fluxo real. 🎯
- [ ] **ACS-13** Gerar link de redefinição pelo admin (`/usuarios/[id]`) e
  abri-lo → tela de nova senha.
- [ ] **ACS-14** Usar o mesmo link **duas vezes** → a segunda recusa com "Link
  inválido ou vencido."
- [ ] **ACS-15** Adulterar um caractere do token na URL → "Link inválido ou vencido."
- [ ] **ACS-16** Nova senha com 7 caracteres → recusa, mínimo de 8.
- [ ] **ACS-17** Nova senha só de letras (`abcdefgh`) → recusa, exige um número.
- [ ] **ACS-18** Nova senha só de números (`12345678`) → recusa, exige uma letra.
- [ ] **ACS-19** Nova senha e confirmação diferentes → "As duas senhas não conferem."
- [ ] **ACS-20** Colar uma senha de 100 caracteres → recusa clara (limite de 72
  bytes do bcrypt), não trunca em silêncio.
- [ ] **ACS-21** Redefinir com sucesso → a senha antiga não entra mais e a nova
  entra.
- [ ] **ACS-22** O campo de senha tem o botão de mostrar/ocultar
  (`CampoSenha`) e ele funciona em todas as telas de senha (login, redefinir,
  criar usuário).

## Gestão de usuários

- [ ] **ACS-23** Criar os três usuários de teste (gestor, operacional,
  visualizador) em `/usuarios/novo`, senha `teste@123`.
- [ ] **ACS-24** Criar um quarto com um e-mail já usado → "Já existe um usuário
  com esse e-mail."
- [ ] **ACS-25** Editar um usuário e trocar o e-mail para o de outro → "Já
  existe outro usuário com esse e-mail."
- [ ] **ACS-26** Desativar um usuário → ele não consegue mais logar.
- [ ] **ACS-27** Tentar gerar link de redefinição para um usuário desativado →
  "Ative a conta antes de gerar o link."
- [ ] **ACS-28** Trocar o **próprio** perfil de Administrador para Visualizador
  → "Você não pode retirar o próprio perfil de administrador."
- [ ] **ACS-29** Desativar a própria conta → "Você não pode desativar a própria
  conta."
- [ ] **ACS-29b** Com **um só** administrador ativo, promover outra pessoa a
  admin, e então rebaixar o primeiro → aceita. Depois tentar rebaixar/desativar
  o último que sobrou → "Este é o único administrador ativo. Promova outra
  pessoa antes de mudar este cadastro." Ninguém pode trancar todo mundo do
  lado de fora.

## Permissões por perfil (RBAC)

A matriz está em [permissoes.ts](../../src/modules/auth/permissoes.ts):

| Recurso | Administrador | Gestor | Operacional | Visualizador |
|---|---|---|---|---|
| obra | tudo | ver/criar/editar | ver | ver |
| medição | tudo | tudo | ver/criar/editar | ver |
| tramitação | tudo | tudo | ver/criar/editar | ver |
| documento | tudo | tudo | ver/criar/editar | ver |
| rerratificação | tudo | tudo | ver | ver |
| relatório | tudo | ver | ver | ver |
| auditoria | ver | ver | — | — |
| usuário | tudo | — | — | — |
| cadastro | tudo | ver/criar/editar | ver | ver |

Para cada linha abaixo, testar **duas camadas**: o botão some da tela **e** a
ação é recusada no servidor. A segunda é a que importa — digite a URL na mão.

### Gestor (`gestor@ajagrupo.local`)

- [ ] **ACS-30** Vê o painel e as obras; consegue criar e editar obra.
- [ ] **ACS-31** Não vê o botão de excluir obra; acessar a exclusão direto
  → recusa com mensagem de permissão, não erro 500.
- [ ] **ACS-32** Não vê "Usuários" no menu; abrir `/usuarios` na mão → tela de
  sem permissão.
- [ ] **ACS-33** Abrir `/usuarios/novo` na mão → recusa.
- [ ] **ACS-34** Vê auditoria (só leitura) e a aba Histórico da obra.
- [ ] **ACS-35** Cria e edita medição, tramitação, documento e rerratificação.

### Operacional (`operacional@ajagrupo.local`)

- [ ] **ACS-36** Vê a obra mas **não** consegue editá-la — a aba **Contrato**
  (`/obras/[id]/contrato`, que é onde a obra é editada) recusa a edição.
- [ ] **ACS-37** Abrir `/obras/nova` na mão → recusa.
- [ ] **ACS-38** Cria e edita medição normalmente; **não** vê o botão de excluir
  medição, e a exclusão direta é recusada.
- [ ] **ACS-39** Registra entrada e saída de tramitação; não exclui movimento.
- [ ] **ACS-40** Envia documento; não exclui documento.
- [ ] **ACS-41** Vê rerratificação, mas o botão "Nova rerratificação" não
  aparece e `/obras/[id]/rerratificacoes/nova` é recusada.
- [ ] **ACS-42** `/auditoria` → recusada (o perfil não tem o recurso).
- [ ] **ACS-43** A aba **Histórico** da obra não aparece para este perfil — ela
  é gateada pelo recurso `auditoria`, coerente com ACS-42. Colar a URL
  `/obras/[id]/historico` na mão → recusada também.

### Visualizador (`visualizador@ajagrupo.local`)

- [ ] **ACS-44** Vê painel, obra e todas as abas — sem nenhum botão de ação.
- [ ] **ACS-45** Abrir na mão as rotas de criação (`/obras/nova`,
  `/obras/[id]/medicoes/nova`, `/obras/[id]/rerratificacoes/nova`) → todas
  recusadas.
- [ ] **ACS-46** Tentar enviar documento pela central → recusado.
- [ ] **ACS-47** `/auditoria` → recusada.
- [ ] **ACS-48** Exportar relatório é permitido (o perfil tem `relatorio: ver`)
  — confirmar que é isso mesmo que o cliente quer: quem só visualiza pode levar
  a planilha para fora. 🎯

### Transversal

- [ ] **ACS-49** A tela `/sem-permissao` explica o que houve e oferece caminho
  de volta — não é um beco.
- [ ] **ACS-50** Toda recusa por permissão devolve mensagem, nunca stack trace
  ou erro 500.
- [ ] **ACS-51** Nenhuma ação recusada aparece como sucesso na tela e falha em
  silêncio no banco (conferir no `npm run db:studio` em uma delas).
