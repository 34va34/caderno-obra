// Testes de consistência do service worker com os ficheiros do projeto.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sw = await readFile(path.join(raiz, 'sw.js'), 'utf8');
const bloco = sw.match(/const FICHEIROS = \[([\s\S]*?)\];/);
const listados = [...bloco[1].matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean);

test('todos os ficheiros listados no service worker existem', async () => {
  for (const ficheiro of listados) {
    await readFile(path.join(raiz, ficheiro));
  }
});

test('todos os módulos e estilos da raiz estão no cache do service worker', async () => {
  const ficheiros = (await readdir(raiz)).filter((f) => /\.(js|css)$/.test(f) && f !== 'sw.js' && f !== 'serve.mjs');
  for (const ficheiro of ficheiros) {
    assert.ok(listados.includes(ficheiro), `${ficheiro} em falta em FICHEIROS`);
  }
});

test('os imports relativos dos módulos estão no cache', async () => {
  const modulos = (await readdir(raiz)).filter((f) => f.endsWith('.js') && f !== 'sw.js');
  for (const modulo of modulos) {
    const texto = await readFile(path.join(raiz, modulo), 'utf8');
    for (const [, alvo] of texto.matchAll(/from '\.\/([^']+)'/g)) {
      assert.ok(listados.includes(alvo), `${modulo} importa ${alvo}, que não está em FICHEIROS`);
    }
  }
});

test('o service worker só ativa uma nova versão quando a app pedir', () => {
  const instalacao = sw.match(/addEventListener\('install'[\s\S]*?\n\}\);/)[0];
  assert.doesNotMatch(instalacao, /skipWaiting/);
  assert.match(sw, /SKIP_WAITING/);
});
