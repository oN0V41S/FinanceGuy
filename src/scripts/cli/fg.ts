#!/usr/bin/env ts-node

import { createRealExec } from './core/exec-port';
import { createRealFs } from './core/fs-port';
import { runCli } from './run';

async function main(): Promise<void> {
  const cwd = process.cwd();
  const { output, exitCode } = await runCli(process.argv.slice(2), {
    fs: createRealFs(cwd),
    exec: createRealExec(cwd),
  });
  console.log(output);
  process.exit(exitCode);
}

void main();
