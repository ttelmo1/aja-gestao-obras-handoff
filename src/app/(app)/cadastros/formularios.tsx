"use client";

import Link from "next/link";
import { useActionState } from "react";

import { useEnvioSemReset } from "@/components/ui/envio-sem-reset";
import { Alerta, Botao, Campo, classeInput } from "@/components/ui/formulario";
import type { Esfera } from "@/generated/prisma/enums";
import { formatarCnpj } from "@/modules/cadastros/cnpj";
import { ESFERAS, ROTULOS_ESFERA } from "@/modules/cadastros/rotulos";

import {
  excluirCadastro,
  salvarContratante,
  salvarSetor,
  type EstadoCadastro,
} from "./acoes";

/**
 * Formulários dos cadastros de apoio. Cada um serve tanto para criar quanto
 * para editar: quando recebe `padrao`, manda o `id` junto e a ação atualiza.
 */

function Rodape({
  pendente,
  voltarPara,
  estado,
}: {
  pendente: boolean;
  voltarPara: string;
  estado: EstadoCadastro;
}) {
  return (
    <>
      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado?.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}
      <div className="flex items-center gap-3">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar"}
        </Botao>
        <Link
          href={voltarPara}
          className="text-sm text-[var(--muted)] underline underline-offset-2"
        >
          Cancelar
        </Link>
      </div>
    </>
  );
}

function CampoAtivo({ marcado }: { marcado: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name="ativo"
        defaultChecked={marcado}
        className="size-4"
      />
      Ativo
      <span className="text-xs text-[var(--muted)]">
        (inativo não aparece na hora de cadastrar uma obra)
      </span>
    </label>
  );
}

export type Contratante = {
  id: string;
  nome: string;
  cnpj: string | null;
  esfera: Esfera | null;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
};

export function FormContratante({ padrao }: { padrao?: Contratante }) {
  const [estado, aoEnviar, pendente] = useEnvioSemReset<EstadoCadastro>(
    salvarContratante,
    undefined,
  );

  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-4">
      {padrao && <input type="hidden" name="id" value={padrao.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo id="nome" rotulo="Nome / razão social">
            <input
              id="nome"
              name="nome"
              required
              minLength={3}
              defaultValue={padrao?.nome}
              className={classeInput}
            />
          </Campo>
        </div>

        <Campo
          id="cnpj"
          rotulo="CNPJ"
          dica="Aceita o formato alfanumérico em vigor desde julho de 2026."
        >
          <input
            id="cnpj"
            name="cnpj"
            defaultValue={formatarCnpj(padrao?.cnpj)}
            placeholder="00.000.000/0000-00"
            className={classeInput}
          />
        </Campo>

        <Campo id="esfera" rotulo="Esfera">
          <select
            id="esfera"
            name="esfera"
            defaultValue={padrao?.esfera ?? ""}
            className={classeInput}
          >
            <option value="">Não informada</option>
            {ESFERAS.map((e) => (
              <option key={e} value={e}>
                {ROTULOS_ESFERA[e]}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id="contato" rotulo="Pessoa de contato">
          <input
            id="contato"
            name="contato"
            defaultValue={padrao?.contato ?? ""}
            className={classeInput}
          />
        </Campo>

        <Campo id="telefone" rotulo="Telefone">
          <input
            id="telefone"
            name="telefone"
            defaultValue={padrao?.telefone ?? ""}
            className={classeInput}
          />
        </Campo>

        <div className="sm:col-span-2">
          <Campo id="email" rotulo="E-mail">
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={padrao?.email ?? ""}
              className={classeInput}
            />
          </Campo>
        </div>
      </div>

      <CampoAtivo marcado={padrao?.ativo ?? true} />
      <Rodape
        pendente={pendente}
        voltarPara="/cadastros/contratantes"
        estado={estado}
      />
    </form>
  );
}

export type Setor = {
  id: string;
  nome: string;
  sigla: string | null;
  ativo: boolean;
};

export function FormSetor({ padrao }: { padrao?: Setor }) {
  const [estado, aoEnviar, pendente] = useEnvioSemReset<EstadoCadastro>(
    salvarSetor,
    undefined,
  );

  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-4">
      {padrao && <input type="hidden" name="id" value={padrao.id} />}

      <Campo id="nome" rotulo="Nome do setor">
        <input
          id="nome"
          name="nome"
          required
          minLength={2}
          defaultValue={padrao?.nome}
          className={classeInput}
        />
      </Campo>

      <Campo id="sigla" rotulo="Sigla">
        <input
          id="sigla"
          name="sigla"
          defaultValue={padrao?.sigla ?? ""}
          className={classeInput}
        />
      </Campo>

      <CampoAtivo marcado={padrao?.ativo ?? true} />
      <Rodape pendente={pendente} voltarPara="/cadastros/setores" estado={estado} />
    </form>
  );
}

/**
 * Exclusão fica separada do formulário: é ação imediata, sem "salvar", e a
 * ação recusa o pedido se o cadastro estiver em uso.
 */
export function BotaoExcluir({
  id,
  entidade,
}: {
  id: string;
  entidade: "Contratante" | "Setor";
}) {
  const [estado, acao, pendente] = useActionState<EstadoCadastro, FormData>(
    excluirCadastro,
    undefined,
  );

  return (
    <div className="flex flex-col gap-2">
      <form action={acao}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="entidade" value={entidade} />
        <Botao type="submit" variante="perigo" disabled={pendente}>
          {pendente ? "Excluindo…" : "Excluir"}
        </Botao>
      </form>
      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
    </div>
  );
}
