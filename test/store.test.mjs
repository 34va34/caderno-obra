// Testes da camada de dados (store.js) com um localStorage falso.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const memoria = new Map();
const falso = {
  getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
  setItem: (k, v) => memoria.set(k, String(v)),
  removeItem: (k) => memoria.delete(k),
  clear: () => memoria.clear()
};
globalThis.localStorage = falso;

import { hojeISO } from '../format.js';

const store = await import('../store.js');
const CHAVE = 'caderno-obra-v1';
const copias = () => [...memoria.keys()].filter((k) => k.startsWith('caderno-obra-v1-copia-'));

beforeEach(() => {
  memoria.clear();
  store.definirAvisoGravacao(() => {});
});

// ------------------------------------------------------------ carregar

test('primeira utilização: sem obras de exemplo e sem gravar nada', () => {
  const db = store.carregar();
  assert.equal(db.obras.length, 0);
  assert.equal(db.v, 1);
  assert.equal(memoria.has(CHAVE), false);
  assert.equal(store.avisoDeRecuperacao(), null);
});

test('dados guardados voltam a ser lidos', () => {
  const db = store.carregar();
  const obra = store.criarObra(db, { nome: 'Teste' });
  store.adicionarLocal(db, obra.id, { lote: '1A', bloco: 'a', piso: '2' });
  const relido = store.carregar();
  assert.equal(relido.obras.length, 1);
  assert.equal(relido.obras[0].nome, 'Teste');
  assert.equal(relido.obras[0].locais[0].bloco, 'A');
});

test('JSON corrompido: cria cópia do conteúdo original antes de usar base vazia', () => {
  memoria.set(CHAVE, '{partido');
  const db = store.carregar();
  assert.equal(db.obras.length, 0);
  assert.equal(copias().length, 1);
  assert.equal(memoria.get(copias()[0]), '{partido');
  assert.equal(store.avisoDeRecuperacao(), copias()[0]);
});

test('versão desconhecida: os dados antigos ficam numa cópia', () => {
  const antigo = JSON.stringify({ v: 2, obras: [{ id: 'a1', nome: 'Antiga', locais: [] }] });
  memoria.set(CHAVE, antigo);
  store.carregar();
  assert.equal(copias().length, 1);
  assert.equal(memoria.get(copias()[0]), antigo);
});

test('arrays em falta são preenchidos sem perder obras', () => {
  memoria.set(CHAVE, JSON.stringify({ v: 1, obras: [{ id: 'o1', nome: 'X', locais: [] }] }));
  const db = store.carregar();
  assert.deepEqual(db.registos, []);
  assert.deepEqual(db.encomendas, []);
  assert.deepEqual(db.ferramentas, []);
  assert.equal(db.obras.length, 1);
});

// ------------------------------------------------------------ guardar

test('guardar devolve false e avisa quando o armazenamento falha', () => {
  const db = store.carregar();
  let avisado = false;
  store.definirAvisoGravacao(() => {
    avisado = true;
  });
  const original = falso.setItem;
  falso.setItem = () => {
    throw new Error('QuotaExceededError');
  };
  try {
    assert.equal(store.guardar(db), false);
    assert.equal(avisado, true);
  } finally {
    falso.setItem = original;
  }
});

test('guardar devolve true quando grava', () => {
  assert.equal(store.guardar(store.carregar()), true);
});

// ------------------------------------------------------------ importarJSON

function baseComObra() {
  const db = store.carregar();
  store.criarObra(db, { nome: 'Atual' });
  return db;
}

test('importação válida substitui os dados e cria cópia do estado anterior', () => {
  baseComObra();
  const anterior = memoria.get(CHAVE);
  const nova = JSON.stringify({ v: 1, obras: [{ id: 'nova1', nome: 'Importada', locais: [] }] });
  const db = store.importarJSON(nova);
  assert.equal(db.obras[0].nome, 'Importada');
  assert.equal(store.carregar().obras[0].nome, 'Importada');
  assert.equal(copias().length, 1);
  assert.equal(memoria.get(copias()[0]), anterior);
});

test('ficheiro que não é JSON é rejeitado sem tocar nos dados', () => {
  baseComObra();
  const anterior = memoria.get(CHAVE);
  assert.throws(() => store.importarJSON('isto não é json'), /JSON/);
  assert.equal(memoria.get(CHAVE), anterior);
  assert.equal(copias().length, 0);
});

test('schema inválido é rejeitado sem tocar nos dados', () => {
  baseComObra();
  const anterior = memoria.get(CHAVE);
  assert.throws(() => store.importarJSON(JSON.stringify({ v: 1, obras: [{ id: 'x' }] })), /caderno/);
  assert.equal(memoria.get(CHAVE), anterior);
});

test('ids com caracteres de atributo HTML são rejeitados', () => {
  const malicioso = JSON.stringify({
    v: 1,
    obras: [{ id: '" onmouseover="alert(1)', nome: 'X', locais: [] }]
  });
  assert.throws(() => store.importarJSON(malicioso));
});

test('versão diferente de 1 é rejeitada', () => {
  assert.throws(() => store.importarJSON(JSON.stringify({ v: 2, obras: [] })));
});

// ------------------------------------------------------------ encomendas

test('criarEncomenda marca os registos como pedido e liga-os à encomenda', () => {
  const db = baseComObra();
  const obra = db.obras[0];
  const registo = store.addRegisto(db, { obraId: obra.id, nome: 'Tubo', tipo: 'preciso' });
  const enc = store.criarEncomenda(db, { obraId: obra.id, itens: [registo], texto: 'x' });
  assert.equal(enc.estado, 'pedido');
  assert.equal(registo.estado, 'pedido');
  assert.equal(registo.encomendaId, enc.id);
});

test('marcarEntrada atualiza encomenda e registos e preenche dataEntrega', () => {
  const db = baseComObra();
  const obra = db.obras[0];
  const registo = store.addRegisto(db, { obraId: obra.id, nome: 'Tubo', tipo: 'preciso' });
  const enc = store.criarEncomenda(db, { obraId: obra.id, itens: [registo], texto: 'x' });
  store.marcarEntrada(db, enc.id);
  assert.equal(enc.estado, 'entrada');
  assert.ok(enc.dataEntrega);
  assert.equal(registo.estado, 'entrada');
});

test('marcarEntrada com id inexistente devolve null', () => {
  const db = baseComObra();
  assert.equal(store.marcarEntrada(db, 'nao-existe'), null);
});

// ------------------------------------------------------------ locais e remoções

test('removerLocal ajusta o local ativo e devolve false para id inexistente', () => {
  const db = baseComObra();
  const obra = db.obras[0];
  const a = store.adicionarLocal(db, obra.id, { lote: '1', bloco: 'A', piso: '0' });
  const b = store.adicionarLocal(db, obra.id, { lote: '1', bloco: 'A', piso: '1' });
  store.definirAtivo(db, obra.id, a.id);
  assert.equal(store.removerLocal(db, a.id), true);
  assert.equal(db.ativo.localId, b.id);
  assert.equal(store.removerLocal(db, 'nao-existe'), false);
});

test('adicionarLocal não cria duplicados', () => {
  const db = baseComObra();
  const obra = db.obras[0];
  store.adicionarLocal(db, obra.id, { lote: '1', bloco: 'A', piso: '0' });
  assert.equal(store.adicionarLocal(db, obra.id, { lote: '1', bloco: 'A', piso: '0' }), null);
});

test('encontrarLocal filtra por lote, bloco e piso', () => {
  const db = baseComObra();
  const obra = db.obras[0];
  store.adicionarLocal(db, obra.id, { lote: '1', bloco: 'A', piso: '0' });
  const alvo = store.adicionarLocal(db, obra.id, { lote: '1', bloco: 'B', piso: '0' });
  assert.equal(store.encontrarLocal(db, { obraId: obra.id, lote: '1', bloco: 'b', piso: '0' }).id, alvo.id);
  assert.equal(store.encontrarLocal(db, { obraId: obra.id, lote: '9' }), null);
});

test('apagarRegisto remove apenas o registo indicado', () => {
  const db = baseComObra();
  const obra = db.obras[0];
  const r1 = store.addRegisto(db, { obraId: obra.id, nome: 'A' });
  const r2 = store.addRegisto(db, { obraId: obra.id, nome: 'B' });
  store.apagarRegisto(db, r1.id);
  assert.deepEqual(db.registos.map((r) => r.id), [r2.id]);
});

// ------------------------------------------------------------ filtros

test('registosPreciso e registosGasto respeitam o filtro por obra', () => {
  const db = baseComObra();
  const outra = store.criarObra(db, { nome: 'Outra' });
  const obra = db.obras[0];
  store.addRegisto(db, { obraId: obra.id, tipo: 'preciso', nome: 'P1' });
  store.addRegisto(db, { obraId: outra.id, tipo: 'preciso', nome: 'P2' });
  store.addRegisto(db, { obraId: obra.id, tipo: 'gasto', nome: 'G1' });
  assert.equal(store.registosPreciso(db).length, 2);
  assert.equal(store.registosPreciso(db, obra.id).length, 1);
  assert.equal(store.registosGasto(db, obra.id).length, 1);
});

test('registosDoDia devolve só o dia pedido, ordenado por hora', () => {
  const db = baseComObra();
  const obra = db.obras[0];
  const tarde = store.addRegisto(db, { obraId: obra.id, data: '2026-01-02', nome: 'tarde' });
  tarde.ts = 200;
  const cedo = store.addRegisto(db, { obraId: obra.id, data: '2026-01-02', nome: 'cedo' });
  cedo.ts = 100;
  store.addRegisto(db, { obraId: obra.id, data: '2026-01-03', nome: 'outro dia' });
  assert.deepEqual(store.registosDoDia(db, '2026-01-02').map((r) => r.nome), ['cedo', 'tarde']);
});

test('contextoCaptura usa a última linha com nome do dia', () => {
  const db = baseComObra();
  const obra = db.obras[0];
  const hoje = hojeISO();
  store.addRegisto(db, { obraId: obra.id, data: hoje, nome: 'Curva', familia: 'PPR' });
  store.addRegisto(db, { obraId: obra.id, data: hoje, nome: '', familia: '' });
  assert.deepEqual(store.contextoCaptura(db, obra.id), { familia: 'PPR', ultimoNome: 'Curva' });
});

// ------------------------------------------------------------ ativo e uid

test('ativo devolve a primeira obra e o primeiro local quando não há seleção', () => {
  const db = baseComObra();
  const obra = db.obras[0];
  store.adicionarLocal(db, obra.id, { lote: '1', bloco: 'A', piso: '0' });
  db.ativo = null;
  const { obra: o, local } = store.ativo(db);
  assert.equal(o.id, obra.id);
  assert.equal(local.piso, '0');
});

test('ativo sem obras devolve nulos', () => {
  assert.deepEqual(store.ativo(store.carregar()), { obra: null, local: null });
});

test('uid sem crypto.randomUUID usa o fallback e continua único', () => {
  const original = globalThis.crypto;
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
  try {
    const a = store.uid();
    const b = store.uid();
    assert.match(a, /^id-/);
    assert.notEqual(a, b);
  } finally {
    Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
  }
});
