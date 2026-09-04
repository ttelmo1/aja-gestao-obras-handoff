/** Estado vazio padrão — usado enquanto os módulos não têm dados. */
export function Vazio({ mensagem }: { mensagem: string }) {
  return (
    <p className="py-8 text-center text-sm text-[var(--muted)]">{mensagem}</p>
  );
}
