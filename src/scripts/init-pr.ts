#!/usr/bin/env ts-node

import { execSync } from 'child_process';

const steps = [
  { name: 'Lint', cmd: 'pnpm run lint' },
  { name: 'Test Coverage', cmd: 'pnpm run test:coverage' },
  { name: 'Build', cmd: 'pnpm run build' },
  { name: 'Security Audit', cmd: 'pnpm audit' },
];

function runCommand(name: string, cmd: string) {
  console.log(`\x1b[36m--- Executing: ${name} ---\x1b[0m`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`\x1b[32m--- Finished: ${name} ---\x1b[0m\n`);
  } catch (error) {
    console.error(`\x1b[31m--- Failed: ${name} ---\x1b[0m\n`);
    process.exit(1);
  }
}

console.log('\x1b[35mStarting Init-PR Pipeline...\x1b[0m\n');

steps.forEach(({ name, cmd }) => runCommand(name, cmd));

console.log('\x1b[36m--- Project Review ---\x1b[0m');
console.log('Manual Review Required: Check Clean Architecture adherence.');
console.log('Ensure tests pass and UI follows VISUAL_IDENTITY.md.');

console.log('\n\x1b[32m--- Pipeline Finished Successfully. PR ready to open. ---\x1b[0m');
