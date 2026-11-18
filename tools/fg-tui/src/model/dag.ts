export interface DagStep {
  index: number;
  status: 'pending' | 'running' | 'done' | 'failed';
  dependsOn?: number[];
}

export interface DagAnalysis {
  /** Dependências ainda não concluídas, por etapa (só etapas pendentes têm lista não vazia). */
  blockedBy: Map<number, number[]>;
  /** Etapas pendentes com todas as dependências concluídas (podem rodar em paralelo). */
  ready: number[];
  cycle: boolean;
}

function validDeps(step: DagStep, known: ReadonlySet<number>): number[] {
  return [...new Set(step.dependsOn ?? [])].filter((dep) => dep !== step.index && known.has(dep)).sort((a, b) => a - b);
}

function hasCycle(graph: ReadonlyMap<number, number[]>): boolean {
  const state = new Map<number, 1 | 2>();
  const visit = (node: number): boolean => {
    if (state.get(node) === 2) return false;
    if (state.get(node) === 1) return true;
    state.set(node, 1);
    for (const dep of graph.get(node) ?? []) if (visit(dep)) return true;
    state.set(node, 2);
    return false;
  };
  return [...graph.keys()].some(visit);
}

/** Analisa o DAG de `dependsOn` (puro). Referências inválidas são ignoradas; ciclo desliga o `ready`. */
export function analyzeDag(steps: readonly DagStep[]): DagAnalysis {
  const known = new Set(steps.map((step) => step.index));
  const statusOf = new Map(steps.map((step) => [step.index, step.status] as const));
  const graph = new Map(steps.map((step) => [step.index, validDeps(step, known)] as const));
  const cycle = hasCycle(graph);

  const blockedBy = new Map<number, number[]>();
  for (const step of steps) {
    const open = (graph.get(step.index) ?? []).filter((dep) => statusOf.get(dep) !== 'done');
    blockedBy.set(step.index, step.status === 'pending' ? open : []);
  }
  const ready = cycle
    ? []
    : steps
        .filter((step) => step.status === 'pending' && (blockedBy.get(step.index) ?? []).length === 0)
        .map((step) => step.index)
        .sort((a, b) => a - b);
  return { blockedBy, ready, cycle };
}
