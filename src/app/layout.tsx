import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Gestão de Obras — AJA",
    template: "%s · Gestão de Obras",
  },
  description:
    "Sistema de gestão de obras, medições, tramitação e documentos — AJA Grupo Empresarial.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
