/**
 * Freio de tentativas de login — a regra, sem o armazenamento.
 *
 * O estado de cada chave mora no banco (`FreioLogin`, gravado por
 * `lib/freio-login.ts`). Já morou num `Map` em memória, que bastava para um
 * processo Node único na rede local; na plataforma serverless cada requisição
 * pode cair numa instância diferente, o contador praticamente zerava a cada
 * tentativa e o freio deixava de frear (etapa 15).
 *
 * Mora em `modules/` e não em `lib/` porque é lógica pura e precisa de teste:
 * com a chave do freio sendo só o e-mail, ele é a única barreira contra força
 * bruta, e barreira sem teste não é barreira.
 */

/** Tempos em milissegundos desde a época, para a conta ficar simples. */
export type RegistroFreio = { tentativas: number; bloqueadoAte: number; visto: number };

export const TENTATIVAS_ATE_BLOQUEIO = 5;
export const BLOQUEIO_MS = 5 * 60 * 1000;

/**
 * Quanto tempo sem nova tentativa faz o contador ser esquecido.
 *
 * Sem isso o contador não decaía: quatro senhas erradas em janeiro somavam
 * com a quinta em março e bloqueavam alguém que não errou nada. A contagem é
 * por janela deslizante.
 */
export const JANELA_MS = 15 * 60 * 1000;

/** Segundos que faltam de bloqueio; 0 se pode tentar. */
export function segundosDeBloqueio(r: RegistroFreio | null, agora: number): number {
  if (!r || r.bloqueadoAte <= agora) return 0;
  return Math.ceil((r.bloqueadoAte - agora) / 1000);
}

/** Como o registro fica depois de mais uma senha errada. */
export function aposFalha(anterior: RegistroFreio | null, agora: number): RegistroFreio {
  // Tentativa isolada depois de muito tempo começa contagem nova — mas um
  // bloqueio em curso continua valendo.
  const r: RegistroFreio =
    anterior && agora - anterior.visto <= JANELA_MS
      ? { ...anterior }
      : { tentativas: 0, bloqueadoAte: anterior?.bloqueadoAte ?? 0, visto: agora };

  r.tentativas += 1;
  r.visto = agora;
  if (r.tentativas >= TENTATIVAS_ATE_BLOQUEIO) {
    r.bloqueadoAte = agora + BLOQUEIO_MS;
    r.tentativas = 0;
  }
  return r;
}

/**
 * Registro parado e já desbloqueado: pode sair da tabela sem mudar nada.
 * Sem limpeza a tabela só cresceria — uma linha por e-mail errado digitado.
 */
export function esquecivel(r: RegistroFreio, agora: number): boolean {
  return r.bloqueadoAte <= agora && agora - r.visto > JANELA_MS;
}
