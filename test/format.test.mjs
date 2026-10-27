// Testes do formato de números, locais e do texto da encomenda (format.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmtQtd, fmtLocal, textoEncomenda } from '../format.js';

test('fmtQtd: inteiros sem casas decimais e decimais com vírgula', () => {
  assert.equal(fmtQtd(10, 'un'), '10 un');
  assert.equal(fmtQtd(2.5, 'kg'), '2,5 kg');
  assert.equal(fmtQtd(3, 'm'), '3 m');
});

test('fmtQtd sem unidade ou com valor em falta', () => {
  assert.equal(fmtQtd(4, ''), '4');
  assert.equal(fmtQtd(null, 'un'), ' un'.trim());
});

test('fmtLocal: campos opcionais em falta são omitidos', () => {
  assert.equal(fmtLocal({ lote: '1A', bloco: 'A', piso: '2' }), 'Lote 1A · Bloco A · Piso 2');
  assert.equal(fmtLocal({ lote: '', bloco: 'B', piso: '' }), 'Bloco B');
  assert.equal(fmtLocal({ lote: '1A', bloco: '', piso: '0' }), 'Lote 1A · Piso 0');
  assert.equal(fmtLocal(null), '');
});

test('textoEncomenda: vazio quando não há itens', () => {
  assert.equal(textoEncomenda({ obra: 'Obra', itens: [] }), '');
  assert.equal(textoEncomenda({ obra: 'Obra', itens: null }), '');
});

test('textoEncomenda: cabeçalho com obra e local, itens agrupados por família', () => {
  const texto = textoEncomenda({
    obra: 'Lavandeira',
    local: { lote: '1A', bloco: 'A', piso: '2' },
    data: '2026-10-27',
    itens: [
      { nome: 'Curva 90 PPR', familia: 'PPR', qtd: 10, unidade: 'un', qtdExplicita: true },
      { nome: 'Tubo 110', familia: 'PVC', qtd: 2.5, unidade: 'm', qtdExplicita: true }
    ]
  });
  const linhas = texto.split('\n');
  assert.equal(linhas[0], 'Lavandeira · Lote 1A · Bloco A · Piso 2');
  assert.match(linhas[1], /^Encomenda /);
  assert.ok(texto.includes('PPR\n- Curva 90 PPR — 10 un'));
  assert.ok(texto.includes('PVC\n- Tubo 110 — 2,5 m'));
});

test('textoEncomenda: sem quantidade explícita e com qtd 1 não mostra quantidade', () => {
  const texto = textoEncomenda({
    obra: 'Obra',
    local: null,
    data: '2026-10-27',
    itens: [{ nome: 'Abraçadeira', familia: 'Abraçadeiras', qtd: 1, unidade: 'un', qtdExplicita: false }]
  });
  assert.ok(texto.includes('- Abraçadeira\n'));
  assert.ok(!texto.includes('— 1 un'));
});

test('textoEncomenda: termina com uma única quebra de linha', () => {
  const texto = textoEncomenda({
    obra: 'Obra',
    local: null,
    data: '2026-10-27',
    itens: [{ nome: 'X', familia: 'PPR', qtd: 1, unidade: 'un', qtdExplicita: true }]
  });
  assert.match(texto, /[^\n]\n$/);
});
