// serve.mjs — servidor estatico minimo para usar a app no telemovel pela rede local.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PORTA = Number(process.env.PORTA || 8080);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
};

function ips() {
  const out = [];
  for (const lista of Object.values(os.networkInterfaces())) {
    for (const i of lista || []) {
      if (i.family === 'IPv4' && !i.internal) out.push(i.address);
    }
  }
  return out;
}

const servidor = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let relativo = url.replace(/^\/+/, '');
  if (relativo === '' || relativo.endsWith('/')) relativo += 'index.html';
  const ficheiro = path.join(RAIZ, relativo);

  if (!ficheiro.startsWith(RAIZ)) {
    res.writeHead(403).end('403');
    return;
  }

  fs.readFile(ficheiro, (erro, dados) => {
    if (erro) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Não encontrado: ' + relativo);
      return;
    }
    res.writeHead(200, {
      'content-type': TIPOS[path.extname(ficheiro).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache'
    });
    res.end(dados);
  });
});

servidor.listen(PORTA, '0.0.0.0', () => {
  console.log('Caderno de Obra no ar:');
  console.log(`  neste PC   http://localhost:${PORTA}/`);
  for (const ip of ips()) console.log(`  telemovel  http://${ip}:${PORTA}/`);
  console.log('  (telemovel e PC na mesma rede Wi-Fi)');
});
