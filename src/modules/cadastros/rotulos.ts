import { Esfera } from "@/generated/prisma/enums";

/**
 * Nomes que aparecem na tela para os cadastros de apoio. Ficam aqui, e não
 * espalhados nos componentes, porque o vocabulário é do setor público e o
 * cliente pode querer ajustar palavra por palavra na reunião.
 */
export const ROTULOS_ESFERA: Record<Esfera, string> = {
  MUNICIPAL: "Municipal",
  ESTADUAL: "Estadual",
  FEDERAL: "Federal",
};

export const ESFERAS = Object.values(Esfera);
