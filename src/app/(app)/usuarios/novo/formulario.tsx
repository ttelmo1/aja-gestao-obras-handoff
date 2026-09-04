"use client";

import { useActionState } from "react";

import { Alerta, Botao } from "@/components/ui/formulario";

import { criarUsuario, type EstadoUsuario } from "../acoes";
import { CamposUsuario, LinkDeSenha } from "../campos";

export function FormularioNovoUsuario() {
  const [estado, acao, pendente] = useActionState<EstadoUsuario, FormData>(
    criarUsuario,
    undefined,
  );

  // Depois de criar, a tela vira o comprovante com o link — o formulário some
  // para o administrador não criar a mesma pessoa duas vezes por engano.
  if (estado?.link) {
    return (
      <div className="flex flex-col gap-4">
        <Alerta tipo="sucesso">{estado.sucesso}</Alerta>
        <LinkDeSenha link={estado.link} />
      </div>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-4">
      <CamposUsuario />
      <p className="text-xs text-[var(--muted)]">
        A senha não é definida aqui. Ao salvar, o sistema gera um link que a
        própria pessoa usa para escolher a senha dela.
      </p>
      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      <Botao type="submit" disabled={pendente}>
        {pendente ? "Salvando…" : "Criar usuário"}
      </Botao>
    </form>
  );
}
