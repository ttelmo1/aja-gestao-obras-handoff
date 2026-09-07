"use client";

import { useId, useState } from "react";

import { classeInput } from "./formulario";

/**
 * Campo de senha com o olho para revelar o que está sendo digitado. Evita o
 * erro de digitação silencioso — principalmente na troca de senha, onde o
 * usuário digita duas vezes às cegas.
 *
 * O botão fica dentro do campo, por isso o input ganha espaço à direita.
 * `aria-pressed` + rótulo que muda deixam claro para o leitor de tela se a
 * senha está visível ou não.
 */
export function CampoSenha(
  props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">,
) {
  const [visivel, setVisivel] = useState(false);
  const idAviso = useId();

  return (
    <div className="relative">
      <input
        {...props}
        type={visivel ? "text" : "password"}
        className={`${classeInput} pr-11 ${props.className ?? ""}`}
      />
      <button
        type="button"
        onClick={() => setVisivel((atual) => !atual)}
        aria-pressed={visivel}
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        aria-describedby={idAviso}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-[var(--muted)] outline-none transition-colors hover:text-[var(--primary)] focus-visible:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/15"
      >
        <IconeOlho riscado={visivel} />
      </button>
      <span id={idAviso} className="sr-only" role="status">
        {visivel ? "Senha visível na tela." : "Senha oculta."}
      </span>
    </div>
  );
}

function IconeOlho({ riscado }: { riscado: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      {riscado ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 5.2A9.9 9.9 0 0 1 12 5c5 0 9 4.5 9 7a11.9 11.9 0 0 1-2.6 3.6" />
          <path d="M6.5 6.9C4.3 8.4 3 10.6 3 12c0 2.5 4 7 9 7a9.7 9.7 0 0 0 4.4-1" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </>
      ) : (
        <>
          <path d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}
