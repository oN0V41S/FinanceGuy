/** Erros de domínio das ações do agente. Mapeados para HTTP em `api/errors.ts`. */

/** 404: ação inexistente OU de outro usuário (mesma resposta, sem vazar existência). */
export class ActionNotFoundError extends Error {
  constructor() {
    super('Ação não encontrada');
    this.name = 'ActionNotFoundError';
  }
}

/** 409: ação já resolvida (confirmada, cancelada) ou fora do estado esperado. */
export class ActionConflictError extends Error {
  constructor(message = 'Esta ação já foi resolvida.') {
    super(message);
    this.name = 'ActionConflictError';
  }
}

/** 410: ação expirada. */
export class ActionExpiredError extends Error {
  constructor(message = 'Esta ação expirou. Peça novamente ao assistente.') {
    super(message);
    this.name = 'ActionExpiredError';
  }
}

/** 400: pedido inválido para a ação (índice fora do intervalo, lote inválido). */
export class ActionInvalidError extends Error {
  constructor(message = 'Pedido inválido para esta ação.') {
    super(message);
    this.name = 'ActionInvalidError';
  }
}
