"use client";

import { useActionState } from "react";

import { Alerta, Botao, Campo, classeInput } from "@/components/ui/formulario";

import { pedirRedefinicao, type EstadoFormulario } from "../acoes";

export function FormularioEsqueciSenha() {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(
    pedirRedefinicao,
    undefined,
  );

  if (estado?.sucesso) return <Alerta tipo="sucesso">{estado.sucesso}</Alerta>;

  return (
    <form action={acao} className="flex flex-col gap-4">
      <Campo id="email" rotulo="E-mail da sua conta">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          className={classeInput}
        />
      </Campo>
      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      <Botao type="submit" disabled={pendente}>
        {pendente ? "Registrando…" : "Registrar pedido"}
      </Botao>
    </form>
  );
}
