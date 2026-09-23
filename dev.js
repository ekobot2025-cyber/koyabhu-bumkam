import { spawn } from 'node:child_process';

console.log('Memulai KOMPLIT BUMKam (Backend Express & Frontend Vite)...');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

const server = spawn(npmCmd, ['run', 'dev:server'], {
  stdio: 'inherit',
  shell: true
});

const client = spawn(npmCmd, ['run', 'dev:client'], {
  stdio: 'inherit',
  shell: true
});

const cleanup = () => {
  server.kill();
  client.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
