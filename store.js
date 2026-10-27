// store.js — dados locais no telemovel (localStorage). Sem servidor, sem conta.

import { hojeISO } from './format.js';

const CHAVE = 'caderno-obra-v1';
const PREFIXO_COPIA = 'caderno-obra-v1-copia-';

// chave da cópia criada no arranque quando os dados guardados estavam ilegíveis
let avisoRecuperacao = null;
// se não foi possível pôr a cópia de segurança, não se grava por cima dos dados originais
let gravacaoBloqueada = false;
let aoFalharGravacao = () => {};

export function definirAvisoGravacao(fn) {
  aoFalharGravacao = fn;
}

export function avisoDeRecuperacao() {
  return avisoRecuperacao;
}

export function uid() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function estruturaVazia() {
  return {
    v: 1,
    obras: [],
    ativo: null, // { obraId, localId }
    registos: [],
    encomendas: [],
    ferramentas: [],
    criadoEm: hojeISO()
  };
}

// ------------------------------------------------------------ validação

const RE_ID = /^[A-Za-z0-9_-]{1,80}$/;
const RE_CODIGO = /^[a-z_-]{0,30}$/;

const ehId = (v) => typeof v === 'string' && RE_ID.test(v);
const ehCodigo = (v) => typeof v === 'string' && RE_CODIGO.test(v);

// devolve null se a base está bem formada, ou a descrição do primeiro problema encontrado
export function problemaNaBase(db) {
  if (!db || typeof db !== 'object') return 'não é um objeto';
  if (db.v !== 1) return 'versão desconhecida';
  if (!Array.isArray(db.obras)) return 'obras em falta';
  for (const lista of [db.registos, db.encomendas, db.ferramentas]) {
    if (lista !== undefined && !Array.isArray(lista)) return 'lista inválida';
  }
  for (const o of db.obras) {
    if (!o || !ehId(o.id) || typeof o.nome !== 'string' || !Array.isArray(o.locais)) return 'obra inválida';
    for (const l of o.locais) {
      if (!l || !ehId(l.id) || typeof l.lote !== 'string' || typeof l.bloco !== 'string' || typeof l.piso !== 'string') {
        return 'local inválido';
      }
    }
  }
  for (const r of db.registos || []) {
    if (!r || !ehId(r.id) || !ehId(r.obraId) || !ehCodigo(r.tipo) || !ehCodigo(r.estado ?? '')) return 'registo inválido';
    if (r.localId != null && !ehId(r.localId)) return 'registo com local inválido';
  }
  for (const e of db.encomendas || []) {
    if (!e || !ehId(e.id) || !ehCodigo(e.estado) || !Array.isArray(e.itens)) return 'encomenda inválida';
  }
  for (const f of db.ferramentas || []) {
    if (!f || !ehId(f.id)) return 'ferramenta inválida';
  }
  return null;
}

// guarda um texto numa chave de cópia de segurança; devolve a chave ou null se falhar
function guardarCopia(texto) {
  const chave = PREFIXO_COPIA + Date.now();
  try {
    localStorage.setItem(chave, texto);
    return chave;
  } catch (erro) {
    console.error('Falha ao criar cópia de segurança', erro);
    return null;
  }
}

// ------------------------------------------------------------ carregar e guardar

export function carregar() {
  let bruto = null;
  try {
    bruto = localStorage.getItem(CHAVE);
  } catch (erro) {
    console.error('Falha ao ler dados locais', erro);
    gravacaoBloqueada = true;
    return estruturaVazia();
  }
  // primeira utilização: sem dados de exemplo, a obra é criada pelo utilizador
  if (bruto === null) return estruturaVazia();

  let db = null;
  try {
    db = JSON.parse(bruto);
  } catch {
    db = null;
  }
  const problema = problemaNaBase(db);
  if (problema) {
    console.error('Dados locais ilegíveis: ' + problema);
    avisoRecuperacao = guardarCopia(bruto);
    gravacaoBloqueada = avisoRecuperacao === null;
    return estruturaVazia();
  }
  db.registos ||= [];
  db.encomendas ||= [];
  db.ferramentas ||= [];
  return db;
}

export function guardar(db) {
  if (gravacaoBloqueada) {
    aoFalharGravacao();
    return false;
  }
  try {
    localStorage.setItem(CHAVE, JSON.stringify(db));
    return true;
  } catch (erro) {
    console.error('Falha ao guardar', erro);
    aoFalharGravacao();
    return false;
  }
}

// ------------------------------------------------------------ contexto

export function obraPorId(db, id) {
  return db.obras.find((o) => o.id === id) || null;
}

export function localPorId(db, id) {
  for (const obra of db.obras) {
    const local = obra.locais.find((l) => l.id === id);
    if (local) return local;
  }
  return null;
}

export function obraDoLocal(db, localId) {
  for (const obra of db.obras) {
    if (obra.locais.some((l) => l.id === localId)) return obra;
  }
  return null;
}

export function ativo(db) {
  const obra = obraPorId(db, db.ativo?.obraId) || db.obras[0] || null;
  if (!obra) return { obra: null, local: null };
  const local = obra.locais.find((l) => l.id === db.ativo?.localId) || obra.locais[0] || null;
  return { obra, local };
}

export function definirAtivo(db, obraId, localId) {
  db.ativo = { obraId, localId };
  guardar(db);
}

export function encontrarLocal(db, { obraId, lote, bloco, piso }) {
  const obra = obraPorId(db, obraId);
  if (!obra) return null;
  return (
    obra.locais.find(
      (l) =>
        (!lote || l.lote === String(lote)) &&
        (!bloco || l.bloco === String(bloco).toUpperCase()) &&
        (piso === undefined || piso === null || l.piso === String(piso))
    ) || null
  );
}

// ------------------------------------------------------------ obras e locais

export function criarObra(db, { nome, morada = '', cliente = '' }) {
  const obra = { id: uid(), nome: nome || 'Obra', morada, cliente, estado: 'Em andamento', locais: [] };
  db.obras.push(obra);
  guardar(db);
  return obra;
}

export function adicionarLocal(db, obraId, local) {
  const obra = obraPorId(db, obraId);
  if (!obra) return null;
  const novo = { id: uid(), lote: String(local.lote || ''), bloco: String(local.bloco || '').toUpperCase(), piso: String(local.piso ?? '') };
  const jaExiste = obra.locais.some((l) => l.lote === novo.lote && l.bloco === novo.bloco && l.piso === novo.piso);
  if (jaExiste) return null;
  obra.locais.push(novo);
  guardar(db);
  return novo;
}

export function removerLocal(db, localId) {
  for (const obra of db.obras) {
    const antes = obra.locais.length;
    obra.locais = obra.locais.filter((l) => l.id !== localId);
    if (obra.locais.length !== antes) {
      if (db.ativo?.localId === localId) db.ativo.localId = obra.locais[0]?.id || null;
      guardar(db);
      return true;
    }
  }
  return false;
}

// ------------------------------------------------------------ registos

export function addRegisto(db, dados) {
  const registo = {
    id: uid(),
    ts: Date.now(),
    data: dados.data || hojeISO(),
    obraId: dados.obraId,
    localId: dados.localId ?? null,
    tipo: dados.tipo || 'nota',
    familia: dados.familia || '',
    nome: dados.nome || '',
    qtd: dados.qtd ?? 1,
    qtdExplicita: Boolean(dados.qtdExplicita),
    unidade: dados.unidade || 'un',
    estado: dados.estado || '',
    cotas: dados.cotas || [],
    cotaAssunto: dados.cotaAssunto || '',
    texto: dados.texto || '',
    encomendaId: null,
    nota: dados.nota || ''
  };
  db.registos.push(registo);
  guardar(db);
  return registo;
}

export function atualizarRegisto(db, id, campos) {
  const registo = db.registos.find((r) => r.id === id);
  if (!registo) return null;
  Object.assign(registo, campos);
  guardar(db);
  return registo;
}

export function apagarRegisto(db, id) {
  db.registos = db.registos.filter((r) => r.id !== id);
  guardar(db);
}

export function registosDoDia(db, data = hojeISO(), obraId = null) {
  return db.registos
    .filter((r) => r.data === data && (!obraId || r.obraId === obraId))
    .sort((a, b) => a.ts - b.ts);
}

export function registosPreciso(db, obraId = null) {
  return db.registos.filter((r) => r.tipo === 'preciso' && (!obraId || r.obraId === obraId));
}

export function registosComCotas(db, obraId = null) {
  return db.registos.filter((r) => (r.cotas || []).length > 0 && (!obraId || r.obraId === obraId));
}

export function registosGasto(db, obraId = null) {
  return db.registos.filter((r) => r.tipo === 'gasto' && (!obraId || r.obraId === obraId));
}

// contexto para o parser: ultima linha do dia (nome e familia)
export function contextoCaptura(db, obraId) {
  const doDia = registosDoDia(db, hojeISO(), obraId);
  const ultima = [...doDia].reverse().find((r) => r.nome);
  return {
    familia: ultima?.familia || '',
    ultimoNome: ultima?.nome || ''
  };
}

// ------------------------------------------------------------ encomendas

export function criarEncomenda(db, { obraId, localId, data, itens, texto }) {
  const encomenda = {
    id: uid(),
    data: data || hojeISO(),
    obraId,
    localId: localId ?? null,
    texto,
    estado: 'pedido',
    dataEntrega: null,
    itens: itens.map((i) => ({
      registoId: i.id,
      nome: i.nome,
      qtd: i.qtd,
      unidade: i.unidade,
      familia: i.familia,
      localId: i.localId ?? null,
      qtdExplicita: i.qtdExplicita
    }))
  };
  db.encomendas.push(encomenda);
  for (const item of itens) {
    const registo = db.registos.find((r) => r.id === item.id);
    if (registo) {
      registo.estado = 'pedido';
      registo.encomendaId = encomenda.id;
    }
  }
  guardar(db);
  return encomenda;
}

export function marcarEntrada(db, encomendaId) {
  const enc = db.encomendas.find((e) => e.id === encomendaId);
  if (!enc) return null;
  enc.estado = 'entrada';
  enc.dataEntrega = hojeISO();
  for (const r of db.registos) {
    if (r.encomendaId === encomendaId) r.estado = 'entrada';
  }
  guardar(db);
  return enc;
}

// ------------------------------------------------------------ ferramentas

export function addFerramenta(db, dados) {
  const f = {
    id: uid(),
    nome: dados.nome || 'Ferramenta',
    tipo: dados.tipo || 'ferramenta',
    estado: dados.estado || 'comigo',
    aQuem: dados.aQuem || '',
    desde: dados.desde || hojeISO(),
    local: dados.local || '',
    nota: dados.nota || ''
  };
  db.ferramentas.push(f);
  guardar(db);
  return f;
}

export function atualizarFerramenta(db, id, campos) {
  const f = db.ferramentas.find((x) => x.id === id);
  if (!f) return null;
  Object.assign(f, campos);
  guardar(db);
  return f;
}

export function apagarFerramenta(db, id) {
  db.ferramentas = db.ferramentas.filter((f) => f.id !== id);
  guardar(db);
}

// ------------------------------------------------------------ backup

export function exportarJSON(db) {
  return JSON.stringify(db, null, 2);
}

export function importarJSON(texto) {
  let db = null;
  try {
    db = JSON.parse(texto);
  } catch {
    throw new Error('o ficheiro não é JSON válido');
  }
  const problema = problemaNaBase(db);
  if (problema) throw new Error('não parece um caderno de obra (' + problema + ')');

  // o estado atual fica numa cópia antes de ser substituído
  const atual = localStorage.getItem(CHAVE);
  if (atual !== null && guardarCopia(atual) === null) {
    throw new Error('não foi possível criar a cópia de segurança');
  }
  db.registos ||= [];
  db.encomendas ||= [];
  db.ferramentas ||= [];
  if (!guardar(db)) throw new Error('não foi possível gravar os dados importados');
  return db;
}
