/**
 * Marca do sistema: quadrado com a sigla contornada em dourado, como no
 * mockup aprovado pelo cliente. Fica em componente próprio porque aparece na
 * faixa superior da área interna e também nas telas de login.
 */
export function Marca({
  subtitulo = "Portal AJA Grupo Empresarial",
  compacto = false,
}: {
  subtitulo?: string;
  compacto?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className={`grid shrink-0 place-items-center rounded-[10px] border-2 border-[var(--gold)] font-bold text-[var(--gold)] ${
          compacto ? "size-9 text-sm" : "size-11 text-base"
        }`}
      >
        AJA
      </span>
      <span className="leading-tight">
        <span
          className={`block font-bold ${compacto ? "text-base" : "text-lg"}`}
        >
          Gestão de Obras
        </span>
        <span className="block text-xs opacity-75">{subtitulo}</span>
      </span>
    </div>
  );
}
