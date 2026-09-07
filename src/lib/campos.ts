import { z } from "zod";

import { dec } from "./money";

/**
 * Validadores dos campos que se repetem em todo formulário do sistema.
 *
 * Nasceram dentro das ações de obra na etapa 4. Ao chegar a segunda tela com
 * campo de dinheiro e campo de data, viraram arquivo: o jeito de ler uma data
 * digitada não pode variar de tela para tela, senão a mesma data entra
 * diferente dependendo de onde foi preenchida.
 */

/**
 * Campo de data do formulário: `""` vira `null`, e a data é lida ao meio-dia.
 *
 * Data malformada é erro de validação, não `null`: devolver `null` fazia o
 * campo simplesmente esvaziar na volta, sem dizer nada — o usuário digitava
 * uma data errada e o formulário salvava como se ele não tivesse preenchido.
 */
function dataDoCampo(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  // Meio-dia local evita o clássico "a data voltou um dia": `new Date("2026-03-10")`
  // é meia-noite UTC, que em Brasília ainda é 09/03.
  const d = new Date(`${v}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  // `new Date` não recusa dia impossível: "2026-02-30" vira 02/03 calado. Se o
  // que voltou não é o que foi digitado, a data não existe.
  const confere =
    d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia;
  return confere ? d : null;
}

export const dataOpcional = z
  .string()
  .trim()
  .refine((v) => v === "" || dataDoCampo(v) !== null, "Data inválida.")
  .transform((v) => (v === "" ? null : dataDoCampo(v)))
  .nullable();

/**
 * Campo `<input type="month">` ("2026-07") → primeiro dia do mês, ao meio-dia.
 * É assim que a competência da medição é guardada.
 */
export const competencia = z
  .string()
  .trim()
  .refine((v) => /^\d{4}-\d{2}$/.test(v), "Informe a competência (mês/ano).")
  .transform((v) => new Date(`${v}-01T12:00:00`));

/** Casas inteiras que cabem numa coluna `Decimal(15, 2)`. */
export const DIGITOS_INTEIROS_DINHEIRO = 13;

/**
 * Normaliza um valor monetário digitado para o formato do `Decimal`.
 *
 * O ponto é ambíguo em pt-BR: em "1.200.000,00" separa milhar, em "260000.00"
 * separa centavos. Tratar todo ponto como milhar — que era o que esta função
 * fazia antes — multiplicava por 100 qualquer valor que voltasse do banco no
 * formato `toFixed(2)`: bastava abrir o formulário e salvar sem tocar em nada
 * para o contrato de R$ 260.000,00 virar R$ 26.000.000,00.
 *
 * A regra:
 * - **Tem vírgula** → a vírgula é o decimal e todo ponto é milhar.
 * - **Só pontos**, e o último vem seguido de 1 ou 2 dígitos até o fim → esse
 *   ponto é decimal ("260000.00", "1200.5").
 * - **Só pontos** em qualquer outro arranjo → todos são milhar ("1.200.000",
 *   "1.200").
 *
 * Devolve `null` quando o que sobra não é número.
 */
export function normalizarDinheiro(bruto: string): string | null {
  const v = bruto.trim();
  if (v === "") return null;

  const semEspacos = v.replace(/\s/g, "");
  const cru = semEspacos.includes(",")
    ? semEspacos.replace(/\./g, "").replace(",", ".")
    : /\.\d{1,2}$/.test(semEspacos)
      ? // Um único ponto decimal: só o último sobrevive, o resto é milhar.
        semEspacos.replace(/\.(?=.*\.)/g, "")
      : semEspacos.replace(/\./g, "");

  if (!/^-?\d+(\.\d{1,2})?$/.test(cru)) return null;
  // As colunas de dinheiro são `Decimal(15, 2)`: 13 dígitos antes da vírgula.
  // Sem este corte, um valor absurdo só falharia no banco, e o `catch` das
  // actions só trata `P2002` — o resto vira erro 500 em vez de mensagem no
  // formulário.
  const inteiros = cru.replace("-", "").split(".")[0]!;
  if (inteiros.length > DIGITOS_INTEIROS_DINHEIRO) return null;
  return dec(cru).toFixed(2);
}

/** Valor monetário digitado em pt-BR ("1.200.000,00") ou cru ("260000.00"). */
export const dinheiro = z
  .string()
  .transform((v) => (v.trim() === "" ? "0.00" : normalizarDinheiro(v)))
  .refine((v) => v !== null, "Valor inválido.")
  .transform((v) => v as string);

/** Dinheiro que pode ficar em branco — devolve `null`, não zero. */
export const dinheiroOpcional = z
  .string()
  .transform((v) => (v.trim() === "" ? "" : normalizarDinheiro(v)))
  .refine((v) => v !== null, "Valor inválido.")
  .transform((v) => (v === "" ? null : (v as string)))
  .nullable();

/**
 * Dinheiro opcional que não admite negativo.
 *
 * Nota fiscal e ISS não têm o `refine(gt(0))` que valor medido e contratado
 * ganham no objeto, e `normalizarDinheiro` aceita o sinal — o campo engolia
 * "-500,00" calado. O `dinheiro` comum continua aceitando negativo de
 * propósito: a rerratificação usa isso para supressão.
 */
export const dinheiroOpcionalPositivo = dinheiroOpcional.refine(
  (v) => v === null || !dec(v).isNegative(),
  "O valor não pode ser negativo.",
);

/** Percentual 0–100 com duas casas. Em branco vira `null`. */
export const percentualOpcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v.replace(",", ".")))
  .refine(
    (v) => v === null || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 100),
    "Percentual deve estar entre 0 e 100.",
  )
  .transform((v) => (v === null ? null : dec(v).toFixed(2)))
  .nullable();

export const textoOpcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

/** Inteiro positivo opcional (prazo em dias, número de medição). */
export const inteiroOpcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .refine(
    (v) => v === null || (Number.isInteger(v) && v > 0),
    "Informe um número inteiro maior que zero.",
  );

/**
 * Percentual 0–100 obrigatório. Existe separado do opcional porque `refine`
 * em cima do objeto valida mas não estreita o tipo — e o campo desce direto
 * para uma coluna `NOT NULL`.
 */
export const percentualObrigatorio = z
  .string()
  .trim()
  .refine((v) => v !== "", "Informe o percentual.")
  .transform((v) => v.replace(",", "."))
  .refine(
    (v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 100,
    "Percentual deve estar entre 0 e 100.",
  )
  .transform((v) => dec(v).toFixed(2));
