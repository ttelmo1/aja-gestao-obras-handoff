import "server-only";

/**
 * Freio de tentativas de login, em memória.
 *
 * Em memória e não no banco de propósito: a instalação é um único processo
 * Node numa rede local fechada, então não há segundo servidor para
 * sincronizar, e reiniciar o serviço zerar o contador é aceitável. Uma tabela
 * aqui custaria migration e escrita a cada senha errada para resolver um
 * problema que esta instalação não tem.
 */

type Registro = { tentativas: number; bloqueadoAte: number };

const g = globalThis as unknown as { __ajaThrottle?: Map<string, Registro> };
const registros = (g.__ajaThrottle ??= new Map<string, Registro>());

export const TENTATIVAS_ATE_BLOQUEIO = 5;
export const BLOQUEIO_MS = 5 * 60 * 1000;

export function bloqueadoPor(chave: string, agora = Date.now()): number {
  const r = registros.get(chave);
  if (!r || r.bloqueadoAte <= agora) return 0;
  return Math.ceil((r.bloqueadoAte - agora) / 1000);
}

export function registrarFalha(chave: string, agora = Date.now()): void {
  const r = registros.get(chave) ?? { tentativas: 0, bloqueadoAte: 0 };
  r.tentativas += 1;
  if (r.tentativas >= TENTATIVAS_ATE_BLOQUEIO) {
    r.bloqueadoAte = agora + BLOQUEIO_MS;
    r.tentativas = 0;
  }
  registros.set(chave, r);
}

export function limparFalhas(chave: string): void {
  registros.delete(chave);
}
