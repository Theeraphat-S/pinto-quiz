import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
const readline = createInterface({ input: stdin, output: stdout });
async function secret(prompt) {
  if (!stdin.isTTY) throw new Error('Run this command in an interactive terminal.');
  stdout.write(prompt); readline.close(); stdin.setRawMode(true); stdin.resume();
  return new Promise((resolve, reject) => { let value = ''; function onData(chunk) { for (const c of chunk.toString()) { if (c === '\r' || c === '\n') { stdin.off('data', onData); stdin.setRawMode(false); stdin.pause(); stdout.write('\n'); resolve(value); return; } if (c === '\u0003') { stdin.off('data', onData); stdin.setRawMode(false); stdin.pause(); reject(new Error('Cancelled')); return; } if (c === '\u007f') value = value.slice(0, -1); else value += c; } } stdin.on('data', onData); });
}
try {
  const base = (await readline.question('Website URL: ')).trim().replace(/\/$/, '');
  const email = (await readline.question('Manager email: ')).trim();
  const name = (await readline.question('Manager name: ')).trim();
  const password = await secret('Manager password (hidden, at least 12 characters): ');
  const token = await secret('SETUP_TOKEN (hidden): ');
  const response = await fetch(base + '/api/accounts', { method: 'POST', headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ email, name, password }) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error);
  console.log('Manager account created. Public signup remains disabled.');
} catch (error) { console.error(error.message); process.exitCode = 1; } finally { readline.close(); }
