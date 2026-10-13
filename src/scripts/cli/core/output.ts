import type { CommandResult } from './types';

const ICONS: Record<CommandResult['status'], string> = {
  ok: '✅',
  'dry-run': '🔍',
  'invalid-args': '⚠️',
  blocked: '⛔',
  failed: '❌',
};

function section(title: string, items: string[]): string[] {
  return items.length === 0 ? [] : [`${title}:`, ...items.map((i) => `  - ${i}`)];
}

export function renderResult(result: CommandResult, json: boolean): string {
  if (json) return JSON.stringify(result, null, 2);

  const lines = [`${ICONS[result.status]} fg ${result.command}: ${result.message}`];
  lines.push(...section('Criados', result.created));
  lines.push(...section('Modificados', result.modified));
  lines.push(...section('Movidos', result.moved));
  lines.push(...section('Resultados', result.matches));
  lines.push(...section('Erros', result.errors));
  lines.push(...section('Próximos passos', result.nextSteps));
  return lines.join('\n');
}
