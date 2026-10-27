// Testes das regras de captura (parser.js). Funções puras, sem DOM.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLinha,
  detectarTipo,
  detectarFamilia,
  extrairQuantidade,
  extrairCotas,
  removerCotas,
  normalizarReferencia,
  extrairLocalInline,
  canonicalizarNome,
  apenasEspecificacao,
  baseDoNome,
  numero,
  normalizar
} from '../parser.js';

// ------------------------------------------------------------ normalizar e números

test('normalizar: minúsculas, sem acentos, espaços colapsados', () => {
  assert.equal(normalizar('  Máquina   de Ø  Cortar '), 'maquina de ø cortar');
  assert.equal(normalizar('Água'), 'agua');
  assert.equal(normalizar(null), '');
});

test('numero: vírgula decimal e valores inválidos', () => {
  assert.equal(numero('2,5'), 2.5);
  assert.equal(numero('10'), 10);
  assert.equal(numero('abc'), null);
});

test('numero: milhares com ponto e decimal com vírgula', () => {
  assert.equal(numero('1.234,50'), 1234.5);
});

// ------------------------------------------------------------ tipo

test('detectarTipo: ferramenta tem precedência sobre gasto', () => {
  assert.equal(detectarTipo('usei a furadeira'), 'ferramenta');
  assert.equal(detectarTipo('Usei a MÁQUINA'), 'ferramenta');
});

test('detectarTipo: gasto, preciso, tarefa e nota', () => {
  assert.equal(detectarTipo('usei 2 sacos de cimento'), 'gasto');
  assert.equal(detectarTipo('falta cimento'), 'preciso');
  assert.equal(detectarTipo('preciso de 3 caixas de isolamento'), 'preciso');
  assert.equal(detectarTipo('tem de fazer a ligação'), 'tarefa');
  assert.equal(detectarTipo('iniciar montagem do prumo'), 'tarefa');
  assert.equal(detectarTipo('chuva forte hoje'), 'nota');
});

test('detectarTipo: "preciso 10 curvas" sem "de" é preciso', () => {
  assert.equal(detectarTipo('preciso 10 curvas'), 'preciso');
});

test('detectarTipo: "é preciso 20 tubos" é preciso, não tarefa', () => {
  assert.equal(detectarTipo('é preciso 20 tubos'), 'preciso');
});

// ------------------------------------------------------------ família

test('detectarFamilia: as 7 famílias', () => {
  assert.equal(detectarFamilia('tubo PPR 32'), 'PPR');
  assert.equal(detectarFamilia('tubo PVC 110'), 'PVC');
  assert.equal(detectarFamilia('esgoto 110'), 'Esgotos');
  assert.equal(detectarFamilia('pluvial 90'), 'Pluviais');
  assert.equal(detectarFamilia('abraçadeira 20'), 'Abraçadeiras');
  assert.equal(detectarFamilia('isolamento 13mm'), 'Isolamento');
  assert.equal(detectarFamilia('tubo de águas'), 'Águas');
});

test('detectarFamilia: "laranja" é Pluviais e os plurais funcionam', () => {
  assert.equal(detectarFamilia('tubo laranja'), 'Pluviais');
  assert.equal(detectarFamilia('esgotos 50'), 'Esgotos');
  assert.equal(detectarFamilia('águas'), 'Águas');
  assert.equal(detectarFamilia('aguas'), 'Águas');
});

test('detectarFamilia: sem palavra de família devolve vazio e respeita o limite da palavra', () => {
  assert.equal(detectarFamilia('cimento'), '');
  assert.equal(detectarFamilia('paraguas'), '');
});

// ------------------------------------------------------------ quantidade

test('extrairQuantidade: unidade no fim', () => {
  assert.deepEqual(extrairQuantidade('10 m'), { qtd: 10, unidade: 'm', resto: '' });
  assert.deepEqual(extrairQuantidade('tubo - 5 un'), { qtd: 5, unidade: 'un', resto: 'tubo' });
});

test('extrairQuantidade: unidade a meio e vírgula decimal', () => {
  assert.deepEqual(extrairQuantidade('2,5 kg cola'), { qtd: 2.5, unidade: 'kg', resto: 'cola' });
  assert.deepEqual(extrairQuantidade('3 caixas de isolamento'), { qtd: 3, unidade: 'caixa', resto: 'de isolamento' });
});

test('extrairQuantidade: multiplicador à frente', () => {
  assert.deepEqual(extrairQuantidade('3x tubo'), { qtd: 3, unidade: 'un', resto: 'tubo' });
});

test('extrairQuantidade: especificações técnicas não são quantidades', () => {
  assert.equal(extrairQuantidade('curva PPR 90').qtd, null);
  assert.equal(extrairQuantidade('tubo Ø32').qtd, null);
  assert.equal(extrairQuantidade('20x25').qtd, null);
  assert.equal(extrairQuantidade('joelho 90°').qtd, null);
});

test('extrairQuantidade: valores vazios', () => {
  assert.deepEqual(extrairQuantidade(null), { qtd: null, unidade: 'un', resto: '' });
  assert.deepEqual(extrairQuantidade(''), { qtd: null, unidade: 'un', resto: '' });
});

test('extrairQuantidade: número no fim sem unidade é quantidade, exceto diâmetros e ângulos', () => {
  assert.equal(extrairQuantidade('cimento 3').qtd, 3);
  assert.equal(extrairQuantidade('curva 90').qtd, null);
  assert.equal(extrairQuantidade('joelho 45').qtd, null);
  assert.equal(extrairQuantidade('ralo 110').qtd, null);
});

// ------------------------------------------------------------ cotas

test('extrairCotas: cota com referência', () => {
  const [c] = extrairCotas('falta 45 cm do pronto');
  assert.equal(c.valor, 45);
  assert.equal(c.unidade, 'cm');
  assert.equal(c.referencia, 'pronto (chão acabado)');
});

test('extrairCotas: metros com vírgula e referência livre', () => {
  const [c] = extrairCotas('1,90 m da parede');
  assert.equal(c.valor, 1.9);
  assert.equal(c.unidade, 'm');
  assert.equal(c.referencia, 'parede');
});

test('extrairCotas: sem referência explícita não é cota', () => {
  assert.deepEqual(extrairCotas('falta 45 cm de tubo'), []);
});

test('extrairCotas: quantidade com "do" não é cota', () => {
  assert.deepEqual(extrairCotas('falta 20 m do tubo'), []);
});

test('removerCotas: tira a cota e mantém o resto', () => {
  const texto = 'falta 45 cm do pronto, cimento';
  const cotas = extrairCotas(texto);
  const sem = removerCotas(texto, cotas);
  assert.doesNotMatch(sem, /45/);
  assert.match(sem, /cimento/);
});

test('normalizarReferencia: pronto, prumo e texto livre', () => {
  assert.equal(normalizarReferencia('pronto'), 'pronto (chão acabado)');
  assert.equal(normalizarReferencia('chão acabado'), 'pronto (chão acabado)');
  assert.equal(normalizarReferencia('prumo'), 'prumo');
  assert.equal(normalizarReferencia('parede da direita'), 'parede da direita');
  assert.equal(normalizarReferencia(''), '');
});

// ------------------------------------------------------------ local

test('extrairLocalInline: piso, bloco e lote', () => {
  assert.deepEqual(extrairLocalInline('piso 2 bloco b lote 1a'), { piso: '2', bloco: 'B', lote: '1A' });
  assert.deepEqual(extrairLocalInline('piso -1'), { piso: '-1' });
  assert.deepEqual(extrairLocalInline('sem local'), {});
});

// ------------------------------------------------------------ nomes

test('canonicalizarNome: remove "de" inicial, pontuação e normaliza aliases', () => {
  assert.equal(canonicalizarNome('de tubos ppr'), 'Tubo ppr');
  assert.equal(canonicalizarNome('  -- Abracadeiras '), 'Abraçadeira');
  assert.equal(canonicalizarNome('TE'), 'Tê');
  assert.equal(canonicalizarNome(''), '');
});

test('apenasEspecificacao: só medidas ou também palavras', () => {
  assert.equal(apenasEspecificacao('Ø32'), true);
  assert.equal(apenasEspecificacao('40x32x40'), true);
  assert.equal(apenasEspecificacao('Curva Ø32'), false);
});

test('baseDoNome: procura o substantivo conhecido e cai na primeira palavra', () => {
  assert.equal(baseDoNome('Tubo PPR 32'), 'tubo');
  assert.equal(baseDoNome('Ø32 furadeira'), 'furadeira');
  assert.equal(baseDoNome(''), '');
});

// ------------------------------------------------------------ parseLinha

test('parseLinha: linha vazia devolve null', () => {
  assert.equal(parseLinha('   '), null);
  assert.equal(parseLinha(null), null);
});

test('parseLinha: preciso com quantidade, unidade e família', () => {
  const r = parseLinha('falta 10 m de tubo PPR');
  assert.equal(r.tipo, 'preciso');
  assert.equal(r.estado, 'preciso');
  assert.equal(r.familia, 'PPR');
  assert.equal(r.familiaExplicita, true);
  assert.equal(r.qtd, 10);
  assert.equal(r.unidade, 'm');
  assert.equal(r.qtdExplicita, true);
});

test('parseLinha: gasto com unidade e nome canónico', () => {
  const r = parseLinha('usei 2 sacos de cimento');
  assert.equal(r.tipo, 'gasto');
  assert.equal(r.nome, 'Cimento');
  assert.equal(r.qtd, 2);
  assert.equal(r.unidade, 'saco');
  assert.equal(r.estado, '');
});

test('parseLinha: ferramenta com o nome da ferramenta e o resto no texto', () => {
  const r = parseLinha('emprestei a furadeira ao Diogo');
  assert.equal(r.tipo, 'ferramenta');
  assert.equal(r.nome, 'Furadeira');
  assert.equal(r.texto, 'emprestei a furadeira ao Diogo');
});

test('parseLinha: tarefa fica pendente', () => {
  const r = parseLinha('iniciar montagem do prumo');
  assert.equal(r.tipo, 'tarefa');
  assert.equal(r.estado, 'pendente');
});

test('parseLinha: nota sem estado', () => {
  const r = parseLinha('chuva forte hoje');
  assert.equal(r.tipo, 'nota');
  assert.equal(r.estado, '');
});

test('parseLinha: tipo forçado pelo contexto tem precedência', () => {
  assert.equal(parseLinha('falta cimento', { tipo: 'nota' }).tipo, 'nota');
});

test('parseLinha: quantidade por omissão é 1 e não explícita', () => {
  const r = parseLinha('falta cimento');
  assert.equal(r.qtd, 1);
  assert.equal(r.qtdExplicita, false);
});

test('parseLinha: família herdada do contexto quando a linha não tem nenhuma', () => {
  const r = parseLinha('falta cimento', { familia: 'PPR' });
  assert.equal(r.familia, 'PPR');
  assert.equal(r.familiaExplicita, false);
});

test('parseLinha: local inline sai do nome', () => {
  const r = parseLinha('falta cimento no piso 2');
  assert.deepEqual(r.local, { piso: '2' });
  assert.equal(r.nome, 'Cimento');
});

test('parseLinha: linha só com especificação herda o nome da anterior', () => {
  const r = parseLinha('Ø32', { ultimoNome: 'Curva' });
  assert.equal(r.nome, 'Curva Ø32');
  assert.equal(r.herdado, true);
});

test('parseLinha: marca de repetição // é detetada', () => {
  const r = parseLinha('// tubo 32');
  assert.equal(r.repeticao, true);
});

test('parseLinha: cota fica separada do nome', () => {
  const r = parseLinha('falta 45 cm do pronto, cimento');
  assert.equal(r.cotas.length, 1);
  assert.equal(r.cotas[0].valor, 45);
  assert.equal(r.nome, 'Cimento');
});

test('parseLinha: quantidade vem de unidade no fim e não do diâmetro', () => {
  const r = parseLinha('falta curva PPR Ø32 10 un');
  assert.equal(r.qtd, 10);
  assert.equal(r.unidade, 'un');
  assert.equal(r.familia, 'PPR');
});

test('parseLinha: "curva PPR 90" sem unidade não gera quantidade 90', () => {
  const r = parseLinha('falta curva PPR 90');
  assert.equal(r.qtdExplicita, false);
});

test('parseLinha: "falta 20 m do tubo" deve ser quantidade e não cota', () => {
  const r = parseLinha('falta 20 m do tubo');
  assert.equal(r.cotas.length, 0);
  assert.equal(r.qtd, 20);
});
