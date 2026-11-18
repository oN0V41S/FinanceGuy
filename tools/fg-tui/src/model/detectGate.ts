import type { Gate, PipelineState } from './types.js';

/** Detecta portões que exigem ação humana. A TUI só exibe o texto; nunca executa o comando. */
export function detectGate(state: PipelineState): Gate | null {
  if (state.state === 'committed') {
    return {
      kind: 'push',
      title: `Portão 2: dar push em ${state.code}?`,
      message: 'Commits prontos. Revise e, se estiver tudo certo, rode o comando abaixo no terminal.',
      command: `git push -u origin ${state.code}`,
    };
  }

  if (state.state === 'failed') {
    const where = state.failedAt ?? 'etapa desconhecida';
    const why = state.reason ?? 'motivo não informado';
    return {
      kind: 'failed',
      title: `Pipeline ${state.code} falhou`,
      message: `Falhou em ${where}: ${why}`,
    };
  }

  return null;
}
