// format.js — datas, numeros e o texto da encomenda para o WhatsApp.

import { FAMILIAS } from './parser.js';

export function hojeISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fmtData(iso) {
  if (!iso) return '';
  const [a, m, d] = String(iso).split('-');
  if (!a || !m || !d) return String(iso);
  return `${d}/${m}/${a.slice(2)}`;
}

export function fmtDataLonga(iso) {
  const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const d = iso ? new Date(iso + 'T12:00:00') : new Date();
  return `${dias[d.getDay()]}, ${d.getDate()} ${meses[d.getMonth()]}`;
}

export function fmtQtd(qtd, unidade) {
  const q = qtd === null || qtd === undefined ? '' : Number(qtd);
  const n = Number.isInteger(q) ? String(q) : String(q).replace('.', ',');
  const u = unidade && unidade !== 'un' ? ` ${unidade}` : unidade === 'un' ? ' un' : '';
  return `${n}${u}`.trim();
}

export function fmtLocal(local) {
  if (!local) return '';
  const partes = [];
  if (local.lote) partes.push(`Lote ${local.lote}`);
  if (local.bloco) partes.push(`Bloco ${local.bloco}`);
  if (local.piso !== undefined && local.piso !== null && local.piso !== '') partes.push(`Piso ${local.piso}`);
  return partes.join(' · ');
}

const ORDEM_FAMILIA = [...FAMILIAS];

function ordenarFamilias(familias) {
  const idx = (f) => {
    const i = ORDEM_FAMILIA.indexOf(f);
    return i === -1 ? 99 : i;
  };
  return [...familias].sort((a, b) => idx(a) - idx(b));
}

/**
 * Texto da encomenda, agrupado por familia.
 * @param {{obra:string, local?:{lote,bloco,piso}, data:string, itens:Array}} dados
 */
export function textoEncomenda({ obra, local, data, itens }) {
  const lista = (itens || []).filter(Boolean);
  if (!lista.length) return '';

  // cada item traz o seu local (i.local); sem ele, usa o local ativo
  const localDoItem = (i) => fmtLocal(i.local || local);
  const locais = new Set(lista.map(localDoItem).filter(Boolean));
  const linhas = [];

  const cabecalho = [obra || 'Obra'];
  if (locais.size === 1) {
    const unico = [...locais][0];
    if (unico) cabecalho.push(unico);
    else {
      const l = fmtLocal(local);
      if (l) cabecalho.push(l);
    }
  }
  linhas.push(cabecalho.join(' · '));
  linhas.push(`Encomenda ${fmtData(data)}`);
  linhas.push('');

  const grupos = new Map();
  for (const item of lista) {
    const familia = item.familia || 'Outros';
    if (!grupos.has(familia)) grupos.set(familia, []);
    grupos.get(familia).push(item);
  }

  for (const familia of ordenarFamilias([...grupos.keys()])) {
    linhas.push(familia);
    for (const item of grupos.get(familia)) {
      const nome = item.nome || item.texto || '(sem nome)';
      const qtd = item.qtdExplicita === false && (!item.qtd || item.qtd === 1)
        ? ''
        : ` — ${fmtQtd(item.qtd, item.unidade)}`;
      // com itens de locais diferentes, cada linha diz onde é preciso
      const onde = locais.size > 1 && localDoItem(item) ? ` (${localDoItem(item)})` : '';
      linhas.push(`- ${nome}${qtd}${onde}`);
    }
    linhas.push('');
  }

  return linhas.join('\n').replace(/\n+$/, '\n');
}
