#!/usr/bin/env node
/**
 * Internal validation tool — READ-ONLY (não modifica nada no projeto).
 *
 * Mede a carga de contexto (tokens aproximados) dos documentos de governança
 * e valida a estrutura esperada antes/depois da refatoração do AGENTS.md.
 *
 * Uso:
 *   node .opencode/scripts/context-audit.js before   # baseline (AGENTS.md monolítico)
 *   node .opencode/scripts/context-audit.js after    # pós-otimização (split + router)
 *   node .opencode/scripts/context-audit.js after --json
 *
 * Exit code: 0 = PASS, 1 = FAIL (arquivos obrigatórios ausentes).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

const MANIFEST = {
  before: {
    files: ['AGENTS.md'],
    required: ['AGENTS.md'],
  },
  after: {
    files: [
      'AGENTS.md',
      '.opencode/AUDIT.md',
      'docs/architecture.md',
      'docs/code-style.md',
      'docs/security.md',
      'docs/testing.md',
      'docs/ui-guidelines.md',
      'docs/git-workflow.md',
      'docs/auth.md',
      'docs/debugging.md',
    ],
    required: [
      'AGENTS.md',
      '.opencode/AUDIT.md',
      'docs/architecture.md',
      'docs/code-style.md',
      'docs/security.md',
      'docs/testing.md',
      'docs/ui-guidelines.md',
      'docs/git-workflow.md',
      'docs/auth.md',
      'docs/debugging.md',
    ],
  },
};

function analyze(file) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) {
    return { file, exists: false };
  }
  const content = fs.readFileSync(abs, 'utf8');
  const lines = content.split('\n').length;
  const chars = content.length;
  const words = content.split(/\s+/).filter(Boolean).length;
  const tokens = Math.ceil(chars / 4);
  return { file, exists: true, lines, chars, words, tokens };
}

function main() {
  const mode = process.argv[2] || 'after';
  const json = process.argv.includes('--json');
  const manifest = MANIFEST[mode];

  if (!manifest) {
    console.error(`Unknown mode: ${mode} (use 'before' ou 'after')`);
    process.exit(1);
  }

  const results = manifest.files.map(analyze);
  const existing = results.filter((r) => r.exists);
  const totalTokens = existing.reduce((s, r) => s + r.tokens, 0);
  const missing = manifest.required.filter(
    (f) => !fs.existsSync(path.join(ROOT, f))
  );
  const ok = missing.length === 0;

  if (json) {
    console.log(
      JSON.stringify({ mode, totalTokens, existing: existing.length, total: results.length, ok, missing }, null, 2)
    );
    process.exit(ok ? 0 : 1);
  }

  console.log(`\n=== Context Audit (${mode}) ===`);
  console.log(`Total files: ${results.length} | Existing: ${existing.length}`);
  console.log(`Approx total tokens (chars/4): ${totalTokens}`);
  console.log(`\nPer-file:`);
  for (const r of results) {
    if (r.exists) {
      console.log(`  ${r.file.padEnd(28)} ${String(r.lines).padStart(5)} lines  ${String(r.chars).padStart(6)} chars  ~${r.tokens} tokens`);
    } else {
      console.log(`  ${r.file.padEnd(28)} MISSING`);
    }
  }
  if (missing.length) {
    console.log(`\nMISSING REQUIRED: ${missing.join(', ')}`);
  }
  console.log(`Result: ${ok ? 'PASS' : 'FAIL'}`);
  process.exit(ok ? 0 : 1);
}

main();
