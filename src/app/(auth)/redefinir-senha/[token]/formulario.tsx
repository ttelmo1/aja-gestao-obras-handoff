"use client";

import { useActionState } from "react";

import { CampoSenha } from "@/components/ui/campo-senha";
import { Alerta, Botao, Campo } from "@/components/ui/formulario";
import { MINIMO_CARACTERES } from "@/modules/auth/senha";

import { redefinirSenha, type EstadoFormulario } from "../../acoes";

export function FormularioRedefinir({ token }: { token: string }) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(
    redefinirSenha,
    undefined,
  );

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <Campo
        id="senha"
        rotulo="Nova senha"
        dica={`Mínimo de ${MINIMO_CARACTERES} caracteres, com pelo menos uma letra e um número.`}
      >
        <CampoSenha
          id="senha"
          name="senha"
          autoComplete="new-password"
          required
          autoFocus
        />
      </Campo>

      <Campo id="confirmacao" rotulo="Repita a nova senha">
        <CampoSenha
          id="confirmacao"
          name="confirmacao"
          autoComplete="new-password"
          required
        />
      </Campo>

      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}

      <Botao type="submit" disabled={pendente}>
        {pendente ? "Salvando…" : "Salvar nova senha"}
      </Botao>
    </form>
  );
}
