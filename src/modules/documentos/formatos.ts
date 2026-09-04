/**
 * Allowlist de formatos aceitos no upload.
 *
 * PDF, XLSX, XLS, CSV, JPG, PNG são os formatos CONFIRMADOS em contrato.
 *
 * Formatos de engenharia (DWG, RVT) estão em `FORMATOS_ENGENHARIA` e
 * permanecem DESLIGADOS: o cliente ainda não decidiu se esses arquivos moram
 * no sistema (requisitos.md 1.6 e seção 3). Liberar é mudar a constante
 * `ENGENHARIA_HABILITADA` — não exige migration.
 */
export type FormatoAceito = {
  extensao: string;
  mimeTypes: string[];
  rotulo: string;
};

export const FORMATOS_CONFIRMADOS: FormatoAceito[] = [
  { extensao: "pdf", mimeTypes: ["application/pdf"], rotulo: "PDF" },
  {
    extensao: "xlsx",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    rotulo: "Excel (XLSX)",
  },
  {
    extensao: "xls",
    mimeTypes: ["application/vnd.ms-excel"],
    rotulo: "Excel (XLS)",
  },
  {
    extensao: "csv",
    mimeTypes: ["text/csv", "application/csv", "text/plain"],
    rotulo: "CSV",
  },
  { extensao: "jpg", mimeTypes: ["image/jpeg"], rotulo: "JPEG" },
  { extensao: "jpeg", mimeTypes: ["image/jpeg"], rotulo: "JPEG" },
  { extensao: "png", mimeTypes: ["image/png"], rotulo: "PNG" },
];

/** NÃO habilitar sem confirmação escrita do cliente. */
export const FORMATOS_ENGENHARIA: FormatoAceito[] = [
  { extensao: "dwg", mimeTypes: ["image/vnd.dwg", "application/acad"], rotulo: "AutoCAD (DWG)" },
  { extensao: "rvt", mimeTypes: ["application/octet-stream"], rotulo: "Revit (RVT)" },
];

export const ENGENHARIA_HABILITADA = false;

export function formatosAceitos(): FormatoAceito[] {
  return ENGENHARIA_HABILITADA
    ? [...FORMATOS_CONFIRMADOS, ...FORMATOS_ENGENHARIA]
    : FORMATOS_CONFIRMADOS;
}

/**
 * Limite por arquivo. Os requisitos citam até ~300MB e o armazenamento é local,
 * então o teto existe para conter engano de usuário, não por custo de storage.
 */
export const TAMANHO_MAXIMO_BYTES = 300 * 1024 * 1024;

export function extensaoDe(nomeArquivo: string): string {
  const i = nomeArquivo.lastIndexOf(".");
  return i < 0 ? "" : nomeArquivo.slice(i + 1).toLowerCase();
}

export type ResultadoValidacao =
  | { ok: true; formato: FormatoAceito }
  | { ok: false; motivo: string };

export function validarArquivo(
  nomeArquivo: string,
  mimeType: string,
  tamanhoBytes: number,
): ResultadoValidacao {
  const extensao = extensaoDe(nomeArquivo);
  if (!extensao) {
    return { ok: false, motivo: "Arquivo sem extensão." };
  }

  const formato = formatosAceitos().find((f) => f.extensao === extensao);
  if (!formato) {
    const bloqueadoPorEngenharia =
      !ENGENHARIA_HABILITADA &&
      FORMATOS_ENGENHARIA.some((f) => f.extensao === extensao);
    return {
      ok: false,
      motivo: bloqueadoPorEngenharia
        ? `Formato .${extensao} ainda não liberado pelo cliente (arquivos de engenharia).`
        : `Formato .${extensao} não é aceito.`,
    };
  }

  // O mime enviado pelo navegador é dica, não prova; a extensão manda.
  // Rejeitamos só quando o mime contradiz um formato conhecido.
  if (mimeType && !formato.mimeTypes.includes(mimeType)) {
    const conhecidoEmOutro = formatosAceitos().some((f) =>
      f.mimeTypes.includes(mimeType),
    );
    if (conhecidoEmOutro) {
      return {
        ok: false,
        motivo: `Conteúdo do arquivo (${mimeType}) não corresponde à extensão .${extensao}.`,
      };
    }
  }

  if (tamanhoBytes <= 0) {
    return { ok: false, motivo: "Arquivo vazio." };
  }
  if (tamanhoBytes > TAMANHO_MAXIMO_BYTES) {
    const mb = Math.round(TAMANHO_MAXIMO_BYTES / 1024 / 1024);
    return { ok: false, motivo: `Arquivo excede o limite de ${mb}MB.` };
  }

  return { ok: true, formato };
}

/** Lista para o atributo `accept` do input file. */
export function acceptHtml(): string {
  return formatosAceitos()
    .flatMap((f) => [`.${f.extensao}`, ...f.mimeTypes])
    .join(",");
}
