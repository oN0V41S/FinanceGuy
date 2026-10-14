import { CliError } from '../core/errors';
import { applyCreatePlan } from '../core/plan';
import type { Command } from '../core/types';

const SLUG = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export function specTemplate(slug: string, date: string): string {
  const title = slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return `# Spec: ${title}

**Status**: Draft
**Versão**: 1.0
**Última atualização**: ${date}

## 1. Visão Geral
### 1.1 Objetivo de Negócio
### 1.2 Dependências
### 1.3 Referências

## 2. Arquitetura
### 2.1 Estrutura de Arquivos
### 2.2 Fluxo de Dados
### 2.3 Estados (loading/empty/error/success/...)

## 3. Componentes / Contratos

## 4. API (se aplicável)

## 5. Edge Cases & Tratamento de Erro

## 6. Critérios de Aceitação

## 7. Mapa de Execução
`;
}

export const specCommand: Command = {
  name: 'spec',
  summary: 'Cria docs/specs/<slug>.md com o esqueleto do grill-me',
  usage: ['fg spec new <slug> [--write]'],
  async run(args, ctx) {
    const [action, slug] = args.positionals;
    if (action !== 'new' || !slug) {
      throw new CliError('invalid-args', 'Use: fg spec new <slug-em-kebab-case>.');
    }
    if (!SLUG.test(slug)) {
      throw new CliError('invalid-args', `Slug inválido: "${slug}". Use kebab-case, ex.: metas-recorrentes.`);
    }
    const date = new Date().toISOString().slice(0, 10);
    return applyCreatePlan(
      'spec',
      [{ path: `docs/specs/${slug}.md`, content: specTemplate(slug, date) }],
      args,
      ctx,
      ['Conduza a grelha (skill grill-me) e preencha as seções.'],
    );
  },
};
