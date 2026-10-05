/**
 * Freio de tentativas de login, em memória.
 *
 * Em memória e não no banco de propósito: a instalação é um único processo
 * Node numa rede local fechada, então não há segundo servidor para
 * sincronizar, e reiniciar o serviço zerar o contador é aceitável. Uma tabela
 * aqui custaria migration e escrita a cada senha errada para resolver um
 * problema que esta instalação não tem.
 *
 * Mora em `modules/` e não em `lib/` porque é lógica pura e precisa de teste:
 * com a chave do freio passando a ser só o e-mail, ele virou a única barreira
 * contra força bruta, e barreira sem teste não é barreira.
 */

type Registro = { tentativas: number; bloqueadoAte: number; visto: number };

const g = globalThis as unknown as { __ajaThrottle?: Map<string, Registro> };
const registros = (g.__ajaThrottle ??= new Map<string, Registro>());

export const TENTATIVAS_ATE_BLOQUEIO = 5;
export const BLOQUEIO_MS = 5 * 60 * 1000;

/**
 * Quanto tempo sem nova tentativa faz o contador ser esquecido.
 *
 * Sem isso o `Map` só crescia — e, pior que o consumo de memória, o contador
 * não decaía: quatro senhas erradas em janeiro somavam com a quinta em março
 * e bloqueavam alguém que não errou nada. A contagem agora é por janela
 * deslizante.
 */
export const JANELA_MS = 15 * 60 * 1000;

/** Esquece registros parados e já desbloqueados. */
function limparVencidos(agora: number): void {
  for (const [chave, r] of registros) {
    if (r.bloqueadoAte <= agora && agora - r.visto > JANELA_MS) {
      registros.delete(chave);
    }
  }
}

/** Quantas chaves o freio guarda agora — existe para o teste enxergar a limpeza. */
export function tamanhoDoFreio(): number {
  return registros.size;
}

export function bloqueadoPor(chave: string, agora = Date.now()): number {
  const r = registros.get(chave);
  if (!r || r.bloqueadoAte <= agora) return 0;
  return Math.ceil((r.bloqueadoAte - agora) / 1000);
}

export function registrarFalha(chave: string, agora = Date.now()): void {
  limparVencidos(agora);

  const anterior = registros.get(chave);
  // Tentativa isolada depois de muito tempo começa contagem nova.
  const r =
    anterior && agora - anterior.visto <= JANELA_MS
      ? anterior
      : { tentativas: 0, bloqueadoAte: anterior?.bloqueadoAte ?? 0, visto: agora };

  r.tentativas += 1;
  r.visto = agora;
  if (r.tentativas >= TENTATIVAS_ATE_BLOQUEIO) {
    r.bloqueadoAte = agora + BLOQUEIO_MS;
    r.tentativas = 0;
  }
  registros.set(chave, r);
}

export function limparFalhas(chave: string): void {
  registros.delete(chave);
}
