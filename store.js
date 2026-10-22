// store.js — dados locais no telemovel (localStorage). Sem servidor, sem conta.

import { hojeISO } from './format.js';

const CHAVE = 'caderno-obra-v1';

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

// Lavandeira: 2 lotes x 2 blocos x pisos -1..6 (do vault)
export function semearLavandeira() {
  const db = estruturaVazia();
  const obra = {
    id: uid(),
    nome: 'Lavandeira',
    morada: 'Em frente à Lavandeira',
    cliente: '',
    estado: 'Em andamento',
    locais: []
  };
  for (const lote of ['1A', '3A']) {
    for (const bloco of ['A', 'B']) {
      for (const piso of ['-1', '1', '2', '3', '4', '5', '6']) {
        obra.locais.push({ id: uid(), lote, bloco, piso });
      }
    }
  }
  db.obras.push(obra);
  const primeiro = obra.locais.find((l) => l.lote === '1A' && l.bloco === 'A' && l.piso === '1');
  db.ativo = { obraId: obra.id, localId: primeiro ? primeiro.id : obra.locais[0]?.id || null };
  return db;
}

export function carregar() {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (!raw) {
      const db = semearLavandeira();
      guardar(db);
      return db;
    }
    const db = JSON.parse(raw);
    if (!db || db.v !== 1) return semearLavandeira();
    db.obras ||= [];
    db.registos ||= [];
    db.encomendas ||= [];
    db.ferramentas ||= [];
    return db;
  } catch (erro) {
    console.error('Falha ao ler dados locais', erro);
    return estruturaVazia();
  }
}

export function guardar(db) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(db));
  } catch (erro) {
    console.error('Falha ao guardar', erro);
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
  const db = JSON.parse(texto);
  if (!db || !Array.isArray(db.obras)) throw new Error('Ficheiro não parece um caderno de obra.');
  db.v = 1;
  db.registos ||= [];
  db.encomendas ||= [];
  db.ferramentas ||= [];
  guardar(db);
  return db;
}
