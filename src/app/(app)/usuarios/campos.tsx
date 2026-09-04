"use client";

import { Campo, classeInput } from "@/components/ui/formulario";
import { Perfil } from "@/generated/prisma/enums";
import { ROTULOS_PERFIL } from "@/modules/auth/permissoes";

/**
 * Campos comuns a criar e editar. Um arquivo só para as duas telas não
 * divergirem em validação ou rótulo com o tempo.
 */
export function CamposUsuario({
  padrao,
}: {
  padrao?: { nome: string; email: string; perfil: Perfil };
}) {
  return (
    <>
      <Campo id="nome" rotulo="Nome">
        <input
          id="nome"
          name="nome"
          required
          minLength={3}
          defaultValue={padrao?.nome}
          className={classeInput}
        />
      </Campo>

      <Campo id="email" rotulo="E-mail" dica="Usado para entrar no sistema.">
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={padrao?.email}
          className={classeInput}
        />
      </Campo>

      <Campo
        id="perfil"
        rotulo="Perfil de acesso"
        dica="Administrador gerencia usuários; Gestor cuida de obras e medições; Operacional lança dados; Visualizador só consulta."
      >
        <select
          id="perfil"
          name="perfil"
          defaultValue={padrao?.perfil ?? Perfil.VISUALIZADOR}
          className={classeInput}
        >
          {Object.values(Perfil).map((p) => (
            <option key={p} value={p}>
              {ROTULOS_PERFIL[p]}
            </option>
          ))}
        </select>
      </Campo>
    </>
  );
}

/** Mostra o link de redefinição num campo selecionável, para copiar e colar. */
export function LinkDeSenha({ link }: { link: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
      <span className="text-xs font-medium">Link para definir a senha</span>
      <input
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className={`${classeInput} text-xs`}
      />
      <span className="text-xs text-[var(--muted)]">
        Vale por 24 horas e some ao ser usado. Entregue à pessoa por um meio
        que você confie — o sistema não envia e-mails.
      </span>
    </div>
  );
}
