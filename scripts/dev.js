// agent-notes: { ctx: "Development orchestrator script running both Express Nodemailer backend and Vite frontend concurrently", deps: ["child_process"], state: "active", last: "antigravity@2026-09-07" }

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\x1b[36m%s\x1b[0m', '🚀 Starting SmartSympo Full-Stack Services (Backend Server + Frontend Client)...');

// 1. Start Express Email Backend Server
const serverProcess = spawn('node', ['server/index.js'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env },
});

// 2. Start Vite Frontend Client
const clientProcess = spawn('npm', ['run', 'dev', '--prefix', 'client'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env },
});

const cleanup = () => {
  console.log('\n\x1b[33m%s\x1b[0m', '🛑 Shutting down SmartSympo services...');
  try {
    serverProcess.kill('SIGTERM');
  } catch (e) {}
  try {
    clientProcess.kill('SIGTERM');
  } catch (e) {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
