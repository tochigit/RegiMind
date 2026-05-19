const { spawn } = require('child_process');

const env = { ...process.env, NODE_ENV: 'production' };
const child = spawn(process.execPath, ['.next/standalone/server.js'], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code) => {
  process.exit(code);
});
