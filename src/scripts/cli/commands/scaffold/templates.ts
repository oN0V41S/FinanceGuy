import { posix } from 'path';
import type { PlannedFile } from '../../core/plan';

export interface Names {
  /** kebab-case: pasta da feature (ex.: `wallet-card`) */
  kebab: string;
  /** PascalCase (ex.: `WalletCard`) */
  pascal: string;
  /** camelCase (ex.: `walletCard`) */
  camel: string;
}

export function toNames(kebab: string): Names {
  const pascal = kebab
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  return { kebab, pascal, camel: pascal.charAt(0).toLowerCase() + pascal.slice(1) };
}

const nie = (what: string): string => `throw new Error('NotImplemented: ${what}');`;

export function repositoryPiece(n: Names): PlannedFile[] {
  const dir = `src/features/${n.kebab}`;
  return [
    {
      path: `${dir}/I${n.pascal}.repository.ts`,
      content: `import { ${n.pascal}, ${n.pascal}Input } from './validations';

export interface I${n.pascal}Repository {
  getAll(userId: string): Promise<${n.pascal}[]>;
  getById(id: string, userId: string): Promise<${n.pascal} | null>;
  create(data: ${n.pascal}Input): Promise<${n.pascal}>;
  update(id: string, userId: string, data: Partial<${n.pascal}Input>): Promise<${n.pascal} | null>;
  delete(id: string, userId: string): Promise<boolean>;
}
`,
    },
    {
      path: `${dir}/postgres${n.pascal}.repository.ts`,
      content: `import { I${n.pascal}Repository } from './I${n.pascal}.repository';
import { ${n.pascal}, ${n.pascal}Input } from './validations';
// Use o singleton: import { prisma } from '@/lib/prisma';

export class Postgres${n.pascal}Repository implements I${n.pascal}Repository {
  async getAll(_userId: string): Promise<${n.pascal}[]> {
    ${nie(`Postgres${n.pascal}Repository.getAll`)}
  }

  async getById(_id: string, _userId: string): Promise<${n.pascal} | null> {
    ${nie(`Postgres${n.pascal}Repository.getById`)}
  }

  async create(_data: ${n.pascal}Input): Promise<${n.pascal}> {
    ${nie(`Postgres${n.pascal}Repository.create`)}
  }

  async update(_id: string, _userId: string, _data: Partial<${n.pascal}Input>): Promise<${n.pascal} | null> {
    ${nie(`Postgres${n.pascal}Repository.update`)}
  }

  async delete(_id: string, _userId: string): Promise<boolean> {
    ${nie(`Postgres${n.pascal}Repository.delete`)}
  }
}
`,
    },
    {
      path: `${dir}/__tests__/postgres${n.pascal}.repository.test.ts`,
      content: `describe('Postgres${n.pascal}Repository', () => {
  it.todo('getAll retorna apenas registros do usuário');
  it.todo('getById retorna null quando não existe');
  it.todo('create persiste e retorna o registro');
  it.todo('update retorna null quando o registro não é do usuário');
  it.todo('delete retorna false quando não existe');
  it.todo('propaga erro do Prisma sem vazar dados sensíveis');
});
`,
    },
  ];
}

export function servicePiece(n: Names): PlannedFile[] {
  const dir = `src/features/${n.kebab}`;
  return [
    {
      path: `${dir}/${n.camel}.service.ts`,
      content: `import { I${n.pascal}Repository } from './I${n.pascal}.repository';
import { ${n.pascal}, ${n.pascal}Input } from './validations';

export class ${n.pascal}Service {
  constructor(private readonly repository: I${n.pascal}Repository) {}

  async getAll(_userId: string): Promise<${n.pascal}[]> {
    void this.repository;
    ${nie(`${n.pascal}Service.getAll`)}
  }

  async getById(_id: string, _userId: string): Promise<${n.pascal} | null> {
    ${nie(`${n.pascal}Service.getById`)}
  }

  async create(_data: ${n.pascal}Input): Promise<${n.pascal}> {
    ${nie(`${n.pascal}Service.create`)}
  }

  async update(_id: string, _userId: string, _data: Partial<${n.pascal}Input>): Promise<${n.pascal} | null> {
    ${nie(`${n.pascal}Service.update`)}
  }

  async delete(_id: string, _userId: string): Promise<boolean> {
    ${nie(`${n.pascal}Service.delete`)}
  }
}
`,
    },
    {
      path: `${dir}/__tests__/${n.camel}.service.test.ts`,
      content: `describe('${n.pascal}Service', () => {
  it.todo('getAll delega ao repository com o userId');
  it.todo('create rejeita entrada inválida (Zod) sem chamar o repository');
  it.todo('create retorna o registro criado');
  it.todo('update/delete retornam null/false quando o registro não existe');
  it.todo('propaga erro do repository com mensagem amigável');
});
`,
    },
  ];
}

export function validationsPiece(n: Names): PlannedFile[] {
  const dir = `src/features/${n.kebab}`;
  return [
    {
      path: `${dir}/validations.ts`,
      content: `import { z } from 'zod';

export const ${n.camel}Schema = z.object({
  id: z.string(),
  userId: z.string(),
  // TODO: campos do domínio
});

export const ${n.camel}InputSchema = ${n.camel}Schema.omit({ id: true });

export type ${n.pascal} = z.infer<typeof ${n.camel}Schema>;
export type ${n.pascal}Input = z.infer<typeof ${n.camel}InputSchema>;
`,
    },
    {
      path: `${dir}/__tests__/validations.test.ts`,
      content: `describe('${n.camel}InputSchema', () => {
  it.todo('aceita entrada válida');
  it.todo('rejeita campos obrigatórios ausentes');
  it.todo('rejeita tipos inválidos com mensagem clara');
});
`,
    },
  ];
}

export function apiPiece(n: Names): PlannedFile[] {
  const dir = `src/features/${n.kebab}/api`;
  const handler = (method: string, withParams: boolean): string => `export async function ${method}(${
    withParams ? '_request: Request, _context: { params: Promise<{ id: string }> }' : '_request: Request'
  }): Promise<NextResponse> {
  return NextResponse.json({ error: 'Não implementado' }, { status: 501 });
}
`;
  return [
    {
      path: `${dir}/route.ts`,
      content: `import { NextResponse } from 'next/server';
// userId vem do header x-user-id injetado por src/proxy.ts; valide a entrada com Zod.

${handler('GET', false)}
${handler('POST', false)}`,
    },
    {
      path: `${dir}/[id]/route.ts`,
      content: `import { NextResponse } from 'next/server';

${handler('GET', true)}
${handler('PUT', true)}
${handler('DELETE', true)}`,
    },
    {
      path: `${dir}/__tests__/route.test.ts`,
      content: `describe('/api/${n.kebab}', () => {
  it.todo('GET retorna 401 sem x-user-id');
  it.todo('GET retorna a lista do usuário');
  it.todo('POST retorna 400 com payload inválido (Zod)');
  it.todo('POST retorna 201 com payload válido');
  it.todo('retorna 500 com mensagem amigável quando o service falha');
});
`,
    },
  ];
}

export function hookPiece(n: Names, hookName?: string): PlannedFile[] {
  const dir = `src/features/${n.kebab}/hooks`;
  const name = hookName ?? `use${n.pascal}`;
  return [
    {
      path: `${dir}/${name}.ts`,
      content: `import type { ${n.pascal} } from '../validations';

export function ${name}() {
  const items: ${n.pascal}[] = [];
  const isLoading = false;
  const error: string | null = null;

  const refresh = async (): Promise<void> => {
    ${nie(`${name}.refresh`)}
  };

  return { items, isLoading, error, refresh };
}
`,
    },
    {
      path: `${dir}/__tests__/${name}.test.ts`,
      content: `describe('${name}', () => {
  it.todo('carrega os dados e expõe isLoading durante a requisição');
  it.todo('expõe error amigável quando o fetch falha');
  it.todo('refresh recarrega os dados');
});
`,
    },
  ];
}

export function componentPiece(n: Names, component: string): PlannedFile[] {
  const dir = `src/features/${n.kebab}/components`;
  return [
    {
      path: `${dir}/${component}.tsx`,
      content: `export interface ${component}Props {
  className?: string;
}

export function ${component}({ className }: ${component}Props) {
  return <div data-testid="${component}" className={className} />;
}
`,
    },
    {
      path: `${dir}/__tests__/${component}.test.tsx`,
      content: `import { render, screen } from '@testing-library/react';
import { ${component} } from '../${component}';

describe('${component}', () => {
  it('renderiza sem quebrar', () => {
    render(<${component} />);
    expect(screen.getByTestId('${component}')).toBeInTheDocument();
  });

  it.todo('mostra estado de loading (Skeleton)');
  it.todo('mostra estado vazio');
  it.todo('mostra mensagem de erro amigável');
});
`,
    },
  ];
}

export function pagePiece(route: string, pascal: string): PlannedFile[] {
  return [
    {
      path: `src/app/${route}/page.tsx`,
      content: `export default function ${pascal}Page() {
  return (
    <main>
      <h1>${pascal}</h1>
    </main>
  );
}
`,
    },
    {
      path: `src/app/${route}/__tests__/page.test.tsx`,
      content: `import { render, screen } from '@testing-library/react';
import ${pascal}Page from '../page';

describe('${pascal}Page', () => {
  it('renderiza o título', () => {
    render(<${pascal}Page />);
    expect(screen.getByRole('heading', { name: '${pascal}' })).toBeInTheDocument();
  });

  it.todo('mostra loading, vazio e erro conforme docs/ui-guidelines.md');
});
`,
    },
  ];
}

/** Teste `it.todo` ao lado de um arquivo existente: `<dir>/__tests__/<base>.test.ts(x)`. */
export function testPiece(target: string): PlannedFile {
  const dir = posix.dirname(target);
  const ext = posix.extname(target) === '.tsx' ? '.tsx' : '.ts';
  const base = posix.basename(target).replace(/\.(ts|tsx)$/, '');
  return {
    path: `${dir}/__tests__/${base}.test${ext}`,
    content: `describe('${base}', () => {
  it.todo('caminho feliz');
  it.todo('entrada inválida');
  it.todo('falha de dependência com mensagem amigável');
});
`,
  };
}

export function containerSnippet(n: Names): string {
  return `// src/core/container.ts: registre manualmente
// import { Postgres${n.pascal}Repository } from '@/features/${n.kebab}/postgres${n.pascal}.repository';
// import { ${n.pascal}Service } from '@/features/${n.kebab}/${n.camel}.service';
// const ${n.camel}Service = new ${n.pascal}Service(new Postgres${n.pascal}Repository());`;
}
