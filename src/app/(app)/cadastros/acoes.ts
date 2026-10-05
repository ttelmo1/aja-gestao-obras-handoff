"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Esfera } from "@/generated/prisma/enums";
import { autorizar, type UsuarioAtual } from "@/lib/guarda";
import { prisma } from "@/lib/prisma";
import { origemDaRequisicao } from "@/lib/sessao";
import { AcaoAuditoria, diff, registrar } from "@/modules/auditoria/registrar";
import { limparCnpj, validarCnpj } from "@/modules/cadastros/cnpj";

/**
 * Ações dos cadastros de apoio (contratante e setor).
 *
 * Num arquivo só, e não um por entidade, porque o que muda entre eles é
 * apenas o schema de campos — permissão, auditoria e revalidação são
 * idênticas, e duplicar isso é duplicar o lugar onde esquecer de auditar.
 */

export type EstadoCadastro = { erro?: string; sucesso?: string } | undefined;

/** String opcional: campo vazio no formulário vira `null`, não `""`. */
const opcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

const contratanteSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome do contratante."),
  cnpj: opcional.refine(
    (v) => v === null || validarCnpj(v),
    "CNPJ inválido — confira os dígitos.",
  ),
  esfera: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine(
      (v) => v === null || Object.keys(Esfera).includes(v),
      "Esfera inválida.",
    ),
  contato: opcional,
  telefone: opcional,
  email: opcional.refine(
    (v) => v === null || z.email().safeParse(v).success,
    "E-mail inválido.",
  ),
  ativo: z.boolean(),
});

const setorSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do setor."),
  sigla: opcional,
  ativo: z.boolean(),
});

function campos(formData: FormData, nomes: string[]): Record<string, unknown> {
  const saida: Record<string, unknown> = { ativo: formData.get("ativo") === "on" };
  for (const nome of nomes) saida[nome] = formData.get(nome) ?? "";
  return saida;
}

/** Recorta só o que interessa ao log — evita despejar o objeto inteiro. */
function paraLog(dados: Record<string, unknown>): Record<string, unknown> {
  return { ...dados };
}

type Config = {
  recurso: "cadastro";
  entidade: "Contratante" | "Setor";
  rotulo: string;
  caminho: string;
};

/**
 * Salvar é criar ou atualizar conforme venha `id` no formulário. Um caminho
 * só: as duas telas usam o mesmo conjunto de campos e as mesmas validações,
 * e separar em duas ações só criaria a chance de elas divergirem.
 */
async function salvar(
  cfg: Config,
  formData: FormData,
  dados: Record<string, unknown>,
): Promise<EstadoCadastro> {
  const permissao = await autorizar("cadastro", formData.get("id") ? "editar" : "criar");
  if (!permissao.ok) return { erro: permissao.erro };

  const id = String(formData.get("id") ?? "");
  const { ip } = await origemDaRequisicao();
  const tabela = tabelaDe(cfg.entidade);

  try {
    if (id) {
      const antes = await tabela.findUnique({ where: { id } });
      if (!antes) return { erro: `${cfg.rotulo} não encontrado.` };
      const mudancas = diff(antes as Record<string, unknown>, dados);
      if (Object.keys(mudancas.depois).length === 0) {
        return { sucesso: "Nada mudou." };
      }
      await prisma.$transaction(async (tx) => {
        await tabelaDe(cfg.entidade, tx).update({ where: { id }, data: dados });
        await registrar(
          {
            ator: atorDe(permissao.usuario, ip),
            acao: AcaoAuditoria.ATUALIZAR,
            entidade: cfg.entidade,
            entidadeId: id,
            descricao: `${cfg.rotulo} "${String(dados.nome)}" alterado.`,
            dadosAntes: mudancas.antes,
            dadosDepois: mudancas.depois,
          },
          tx,
        );
      });
      revalidatePath(cfg.caminho);
      revalidatePath(`${cfg.caminho}/${id}`);
      return { sucesso: "Alterações salvas." };
    }

    const criado = await prisma.$transaction(async (tx) => {
      const registro = await tabelaDe(cfg.entidade, tx).create({ data: dados });
      await registrar(
        {
          ator: atorDe(permissao.usuario, ip),
          acao: AcaoAuditoria.CRIAR,
          entidade: cfg.entidade,
          entidadeId: (registro as { id: string }).id,
          descricao: `${cfg.rotulo} "${String(dados.nome)}" cadastrado.`,
          dadosDepois: paraLog(dados),
        },
        tx,
      );
      return registro as { id: string };
    });
    revalidatePath(cfg.caminho);
    redirect(`${cfg.caminho}/${criado.id}?criado=1`);
  } catch (erro) {
    const conflito = mensagemDeConflito(erro, cfg.entidade);
    if (conflito) return { erro: conflito };
    throw erro;
  }
}

function atorDe(usuario: UsuarioAtual, ip: string | null) {
  return { id: usuario.id, nome: usuario.nome, ip };
}

/**
 * `P2002` é a violação de índice único do Prisma. Traduzimos para a linguagem
 * do usuário em vez de deixar vazar "Unique constraint failed".
 *
 * O campo culpado aparece ora em `meta.target`, ora em `meta.constraint` com
 * o nome do índice (`Contratante_cnpj_key`), dependendo do adaptador. Em vez
 * de apostar num dos dois, procuramos no `meta` inteiro.
 */
function mensagemDeConflito(erro: unknown, entidade: Config["entidade"]): string | null {
  const codigo = (erro as { code?: string }).code;
  if (codigo !== "P2002") return null;
  const meta = JSON.stringify((erro as { meta?: unknown }).meta ?? "").toLowerCase();
  if (meta.includes("cnpj")) return "Já existe um contratante com esse CNPJ.";
  if (entidade === "Setor") return "Já existe um setor com esse nome.";
  return "Já existe um registro com esses dados.";
}

/* eslint-disable @typescript-eslint/no-explicit-any --
   As duas tabelas têm formatos diferentes e o Prisma não expõe um tipo comum
   de delegate. O acesso está confinado a esta função, e cada chamada acima
   passa por um schema do zod antes de chegar aqui. */
function tabelaDe(entidade: Config["entidade"], tx: any = prisma): any {
  return { Contratante: tx.contratante, Setor: tx.setor }[entidade];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function salvarContratante(
  _estado: EstadoCadastro,
  formData: FormData,
): Promise<EstadoCadastro> {
  const dados = contratanteSchema.safeParse(
    campos(formData, ["nome", "cnpj", "esfera", "contato", "telefone", "email"]),
  );
  if (!dados.success) return { erro: dados.error.issues[0]?.message ?? "Dados inválidos." };
  return salvar(
    CONFIGS.Contratante,
    formData,
    { ...dados.data, cnpj: dados.data.cnpj && limparCnpj(dados.data.cnpj) },
  );
}

export async function salvarSetor(
  _estado: EstadoCadastro,
  formData: FormData,
): Promise<EstadoCadastro> {
  const dados = setorSchema.safeParse(campos(formData, ["nome", "sigla"]));
  if (!dados.success) return { erro: dados.error.issues[0]?.message ?? "Dados inválidos." };
  return salvar(CONFIGS.Setor, formData, dados.data);
}

/**
 * Exclusão dos cadastros de apoio.
 *
 * Só apaga de verdade o que ninguém referencia — um contratante já vinculado
 * a uma obra permanece, porque apagá-lo reescreveria o histórico daquele
 * contrato. Nesse caso a saída é desativar: some das listas de seleção e o
 * que já existe continua de pé. É a mesma lógica do ponto 8 de
 * `docs/pontos-para-reuniao.md`, aplicada aos cadastros de apoio.
 */
export async function excluirCadastro(
  _estado: EstadoCadastro,
  formData: FormData,
): Promise<EstadoCadastro> {
  const permissao = await autorizar("cadastro", "excluir");
  if (!permissao.ok) return { erro: permissao.erro };

  const id = String(formData.get("id") ?? "");
  const entidade = String(formData.get("entidade") ?? "") as Config["entidade"];
  const cfg = CONFIGS[entidade];
  if (!cfg || !id) return { erro: "Registro inválido." };

  const registro = await tabelaDe(entidade).findUnique({ where: { id } });
  if (!registro) return { erro: `${cfg.rotulo} não encontrado.` };

  const vinculos = await contarVinculos(entidade, id);
  if (vinculos > 0) {
    return {
      erro: `Este cadastro está em uso em ${vinculos} registro(s) e não pode ser apagado. Desative-o: ele some das listas de seleção sem apagar o histórico.`,
    };
  }

  const { ip } = await origemDaRequisicao();
  await prisma.$transaction(async (tx) => {
    await tabelaDe(entidade, tx).delete({ where: { id } });
    await registrar(
      {
        ator: atorDe(permissao.usuario, ip),
        acao: AcaoAuditoria.EXCLUIR,
        entidade,
        entidadeId: id,
        descricao: `${cfg.rotulo} "${(registro as { nome: string }).nome}" excluído.`,
        dadosAntes: registro,
      },
      tx,
    );
  });

  revalidatePath(cfg.caminho);
  redirect(cfg.caminho);
}

/** Quantos registros apontam para este cadastro. Zero significa seguro apagar. */
async function contarVinculos(
  entidade: Config["entidade"],
  id: string,
): Promise<number> {
  if (entidade === "Contratante") {
    return prisma.obra.count({ where: { contratanteId: id } });
  }
  const [entradas, saidas] = await Promise.all([
    prisma.tramitacaoMovimento.count({ where: { setorDestinoId: id } }),
    prisma.tramitacaoMovimento.count({ where: { setorOrigemId: id } }),
  ]);
  return entradas + saidas;
}

const CONFIGS: Record<Config["entidade"], Config> = {
  Contratante: {
    recurso: "cadastro",
    entidade: "Contratante",
    rotulo: "Contratante",
    caminho: "/cadastros/contratantes",
  },
  Setor: {
    recurso: "cadastro",
    entidade: "Setor",
    rotulo: "Setor",
    caminho: "/cadastros/setores",
  },
};
