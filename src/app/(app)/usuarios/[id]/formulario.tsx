"use client";

import { useActionState } from "react";

import { useEnvioSemReset } from "@/components/ui/envio-sem-reset";
import { Alerta, Botao } from "@/components/ui/formulario";
import type { Perfil } from "@/generated/prisma/enums";

import {
  atualizarUsuario,
  encerrarSessoes,
  gerarLinkDeSenha,
  type EstadoUsuario,
} from "../acoes";
import { CamposUsuario, LinkDeSenha } from "../campos";

export function FormularioEditarUsuario({
  usuario,
  ehVoce,
}: {
  usuario: { id: string; nome: string; email: string; perfil: Perfil; ativo: boolean };
  ehVoce: boolean;
}) {
  const [estado, aoEnviar, pendente] = useEnvioSemReset<EstadoUsuario>(
    atualizarUsuario,
    undefined,
  );

  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={usuario.id} />
      <CamposUsuario padrao={usuario} />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="ativo"
          defaultChecked={usuario.ativo}
          disabled={ehVoce}
          className="size-4"
        />
        Conta ativa
        {ehVoce && (
          <span className="text-xs text-[var(--muted)]">
            (não dá para desativar a própria conta)
          </span>
        )}
      </label>

      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado?.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

      <Botao type="submit" disabled={pendente}>
        {pendente ? "Salvando…" : "Salvar alterações"}
      </Botao>
    </form>
  );
}

/**
 * Ações que mexem no acesso, separadas do formulário de cadastro: são
 * operações imediatas, sem "salvar", e misturá-las ao formulário faria
 * parecer que dependem dele.
 */
export function AcoesDeAcesso({ id }: { id: string }) {
  const [estadoLink, acaoLink, gerando] = useActionState<EstadoUsuario, FormData>(
    gerarLinkDeSenha,
    undefined,
  );
  const [estadoSessoes, acaoSessoes, encerrando] = useActionState<
    EstadoUsuario,
    FormData
  >(encerrarSessoes, undefined);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <form action={acaoLink}>
          <input type="hidden" name="id" value={id} />
          <Botao type="submit" variante="secundario" disabled={gerando}>
            {gerando ? "Gerando…" : "Gerar link de senha"}
          </Botao>
        </form>
        <form action={acaoSessoes}>
          <input type="hidden" name="id" value={id} />
          <Botao type="submit" variante="perigo" disabled={encerrando}>
            {encerrando ? "Encerrando…" : "Encerrar sessões"}
          </Botao>
        </form>
      </div>

      {estadoLink?.erro && <Alerta tipo="erro">{estadoLink.erro}</Alerta>}
      {estadoLink?.sucesso && <Alerta tipo="sucesso">{estadoLink.sucesso}</Alerta>}
      {estadoLink?.link && <LinkDeSenha link={estadoLink.link} />}

      {estadoSessoes?.erro && <Alerta tipo="erro">{estadoSessoes.erro}</Alerta>}
      {estadoSessoes?.sucesso && (
        <Alerta tipo="sucesso">{estadoSessoes.sucesso}</Alerta>
      )}
    </div>
  );
}
