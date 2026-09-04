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

/** Campo de data do formulário: `""` vira `null`, e a data é lida ao meio-dia. */
export const dataOpcional = z
  .string()
  .trim()
  .transform((v) => {
    if (v === "") return null;
    // Meio-dia local evita o clássico "a data voltou um dia": `new Date("2026-03-10")`
    // é meia-noite UTC, que em Brasília ainda é 09/03.
    const d = new Date(`${v}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  })
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

/** Valor monetário digitado em pt-BR ("1.200.000,00") ou cru ("1200000.00"). */
export const dinheiro = z
  .string()
  .trim()
  .transform((v) => (v === "" ? "0" : v.replace(/\./g, "").replace(",", ".")))
  .refine((v) => /^-?\d+(\.\d{1,2})?$/.test(v), "Valor inválido.")
  .transform((v) => dec(v).toFixed(2));

/** Dinheiro que pode ficar em branco — devolve `null`, não zero. */
export const dinheiroOpcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v.replace(/\./g, "").replace(",", ".")))
  .refine((v) => v === null || /^-?\d+(\.\d{1,2})?$/.test(v), "Valor inválido.")
  .transform((v) => (v === null ? null : dec(v).toFixed(2)))
  .nullable();

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
