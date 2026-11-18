import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('.', import.meta.url));

function listarFontes(dir: string): string[] {
  const resultado: string[] = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      resultado.push(...listarFontes(caminho));
    } else if (/\.(ts|tsx)$/.test(nome) && !/\.test\.(ts|tsx)$/.test(nome)) {
      resultado.push(caminho);
    }
  }
  return resultado;
}

function rel(caminho: string): string {
  return relative(SRC, caminho).replace(/\\/g, '/');
}

// main.tsx é a única exceção (ponto de entrada com as portas reais).
const fontes = listarFontes(SRC).filter((f) => rel(f) !== 'main.tsx');

describe('isolamento somente leitura (critério 12)', () => {
  it('encontra os módulos de produção para inspecionar', () => {
    expect(fontes.length).toBeGreaterThan(0);
  });

  it('nenhum módulo importa child_process', () => {
    const infratores = fontes.filter((f) => /child_process/.test(readFileSync(f, 'utf8')));
    expect(infratores.map(rel)).toEqual([]);
  });

  it('nenhum módulo usa writeFile, writeFileSync ou appendFile', () => {
    const infratores = fontes.filter((f) =>
      /\b(writeFile|writeFileSync|appendFile|appendFileSync)\b/.test(readFileSync(f, 'utf8')),
    );
    expect(infratores.map(rel)).toEqual([]);
  });

  it('nenhum módulo referencia arquivos .env', () => {
    const infratores = fontes.filter((f) => /['"`][^'"`]*\.env\b/.test(readFileSync(f, 'utf8')));
    expect(infratores.map(rel)).toEqual([]);
  });
});

describe('isolamento ampliado', () => {
  it('nenhum módulo (exceto main.tsx) usa APIs de escrita no sistema de arquivos', () => {
    const proibido =
      /\b(write\w*|mkdir\w*|rm\w*|unlink\w*|rename\w*|copyFile\w*|createWriteStream)\s*\(/;
    const infratores = fontes.filter((f) => {
      const codigo = readFileSync(f, 'utf8');
      return /node:fs|from 'fs'/.test(codigo) && proibido.test(codigo);
    });
    expect(infratores.map(rel)).toEqual([]);
  });

  it('child_process só aparece em main.tsx', () => {
    const todas = listarFontes(SRC).filter((f) => /child_process/.test(readFileSync(f, 'utf8')));
    expect(todas.map(rel)).toEqual(['main.tsx']);
  });
});
