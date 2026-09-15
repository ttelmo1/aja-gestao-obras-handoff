"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * `useActionState` para formulário que não pode perder o que foi digitado.
 *
 * Com `<form action={acao}>`, o React 19 limpa todos os campos não
 * controlados ao fim de cada envio — inclusive quando a action devolve erro.
 * Num cadastro longo, errar o formato do valor apagava a obra inteira já
 * preenchida. Enviando pelo `onSubmit`, dentro de uma transição, o React não
 * reseta nada: o erro aparece e os campos continuam como estavam.
 *
 * A validação nativa (`required`, `min`) continua valendo, porque o navegador
 * só dispara `submit` depois dela.
 */
export function useEnvioSemReset<E>(
  acao: (estado: Awaited<E>, dados: FormData) => E | Promise<E>,
  inicial: Awaited<E>,
): [
  estado: Awaited<E>,
  aoEnviar: (e: FormEvent<HTMLFormElement>) => void,
  pendente: boolean,
] {
  const [estado, despachar, pendente] = useActionState<E, FormData>(acao, inicial);

  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => despachar(dados));
  }

  return [estado, aoEnviar, pendente];
}
