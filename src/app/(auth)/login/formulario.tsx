"use client";

import { useActionState } from "react";

import { CampoSenha } from "@/components/ui/campo-senha";
import { Alerta, Botao, Campo, classeInput } from "@/components/ui/formulario";

import { entrar, type EstadoFormulario } from "../acoes";

export function FormularioLogin({ destino }: { destino?: string }) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(
    entrar,
    undefined,
  );

  return (
    <form action={acao} className="flex flex-col gap-4">
      {destino && <input type="hidden" name="destino" value={destino} />}

      <Campo id="email" rotulo="E-mail">
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

      <Campo id="senha" rotulo="Senha">
        <CampoSenha
          id="senha"
          name="senha"
          autoComplete="current-password"
          required
        />
      </Campo>

      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}

      <Botao type="submit" disabled={pendente}>
        {pendente ? "Entrando…" : "Entrar"}
      </Botao>
    </form>
  );
}
