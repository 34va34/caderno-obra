// app.js — interface do caderno de obra.

import {
  parseLinha,
  normalizar,
  TIPO_META,
  TIPOS,
  FAMILIAS,
  detectarTipo,
  canonicalizarNome
} from './parser.js';
import { hojeISO, fmtData, fmtDataLonga, fmtQtd, fmtLocal, textoEncomenda } from './format.js';
import { icone, ICONE_TIPO } from './icons.js';
import * as store from './store.js';

const $vista = document.getElementById('vista');
const $topo = document.getElementById('topo');
const $barra = document.getElementById('barra');
const $modal = document.getElementById('modal');
const $modalConteudo = document.getElementById('modal-conteudo');
const $toast = document.getElementById('toast');

const UNIDADES = ['un', 'm', 'kg', 'caixa', 'rolo', 'saco', 'L', 'pacote', 'fardo', 'h'];
const ESTADOS_POR_TIPO = {
  preciso: ['preciso', 'pedido', 'entrada', 'anulado'],
  tarefa: ['pendente', 'feito', 'anulado'],
  ferramenta: ['comigo', 'emprestada', 'preciso', 'extraviada', 'reparacao'],
  gasto: [''],
  nota: ['']
};
const ROTULO_ESTADO = {
  preciso: 'Falta',
  pedido: 'Pedido',
  entrada: 'Entrada',
  anulado: 'Anulado',
  pendente: 'Pendente',
  feito: 'Feito',
  comigo: 'Comigo',
  emprestada: 'Emprestada',
  extraviada: 'Extraviada',
  reparacao: 'Em reparação'
};
const ROTULO_FERRAMENTA = ['comigo', 'emprestada', 'preciso', 'extraviada', 'reparacao'];
const ROTULO_GRUPO_FERRAMENTA = {
  comigo: 'Comigo',
  emprestada: 'Emprestadas',
  preciso: 'A precisar',
  extraviada: 'Extraviadas',
  reparacao: 'Em reparação'
};
const PALAVRAS_SEM_INFO = new Set([
  'falta', 'faltam', 'usei', 'gastei', 'usamos', 'gastamos', 'preciso', 'precisa', 'pedir', 'pede', 'encomendar',
  'de', 'do', 'da', 'dos', 'das', 'a', 'o', 'as', 'os', 'e', 'em', 'no', 'na', 'nos', 'nas', 'para', 'ao', 'aos',
  'iniciar', 'iniciei', 'comecei', 'comecar', 'tarefa', 'ferramenta', 'maquina', 'un', 'unid', 'und', 'm', 'mts',
  'kg', 'caixa', 'caixas', 'piso', 'bloco', 'lote', 'com', 'por', 'que', 'ja', 'mais', 'menos', 'cm', 'mm', 'todos', 'todas'
]);

let db = store.carregar();
let tipoForcado = '';
let selecionados = new Set();
let rota = 'hoje';

// ------------------------------------------------------------------ tema

const CHAVE_TEMA = 'caderno-obra-tema';

function temaGuardado() {
  try {
    return localStorage.getItem(CHAVE_TEMA) || 'auto';
  } catch {
    return 'auto';
  }
}

function aplicarTema(tema, persistir = false) {
  document.documentElement.dataset.tema = tema;
  if (persistir) {
    try {
      localStorage.setItem(CHAVE_TEMA, tema);
    } catch {
      /* fica só nesta sessão */
    }
  }
}

function alternarTema() {
  const atual = document.documentElement.dataset.tema || 'auto';
  const proximo = atual === 'auto' ? 'escuro' : atual === 'escuro' ? 'claro' : 'auto';
  aplicarTema(proximo, true);
  render();
  toast(proximo === 'auto' ? 'Tema automático' : proximo === 'claro' ? 'Tema claro' : 'Tema escuro');
}

aplicarTema(new URLSearchParams(location.search).get('tema') || temaGuardado());

// ------------------------------------------------------------------ utils

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('visivel');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => $toast.classList.remove('visivel'), 2200);
}

function abrirModal(html) {
  $modalConteudo.innerHTML = html;
  $modal.classList.remove('escondido');
  $modal.setAttribute('aria-hidden', 'false');
}

function fecharModal() {
  $modal.classList.add('escondido');
  $modal.setAttribute('aria-hidden', 'true');
  $modalConteudo.innerHTML = '';
}

function contexto() {
  return store.ativo(db);
}

function vistaSemObra() {
  return `
    <div class="cartao">
      <h2>Começar</h2>
      <p class="meta">Ainda não há obra. Cria a primeira para começar a apontar.</p>
      <div class="acoes-linha" style="margin-top:12px">
        <button class="btn largo" data-acao="nova-obra">＋ Nova obra</button>
      </div>
    </div>`;
}

function selosEstado(r, { familia = true } = {}) {
  const partes = [];
  if (familia && r.familia) partes.push(`<span class="selo familia">${esc(r.familia)}</span>`);
  if (r.estado && ROTULO_ESTADO[r.estado]) {
    partes.push(`<span class="selo ${r.estado}">${esc(ROTULO_ESTADO[r.estado])}</span>`);
  }
  return partes.join(' ');
}

// ------------------------------------------------------------------ topo

const NAV = [
  { rota: 'hoje', rotulo: 'Hoje', icone: 'hoje' },
  { rota: 'preciso', rotulo: 'Preciso', icone: 'preciso' },
  { rota: 'medidas', rotulo: 'Medidas', icone: 'medidas' },
  { rota: 'ferramentas', rotulo: 'Ferramentas', icone: 'ferramenta' },
  { rota: 'mais', rotulo: 'Mais', icone: 'mais' }
];

function renderTopo() {
  const { obra, local } = contexto();
  const tema = document.documentElement.dataset.tema || 'auto';
  $topo.innerHTML = `
    <button class="contexto" data-acao="abrir-contexto" aria-label="Mudar de obra ou local">
      <span class="rotulo">${esc(fmtDataLonga(hojeISO()))}</span>
      <span class="obra">${esc(obra ? obra.nome : 'Sem obra')}${icone('seta', { tamanho: 15 })}</span>
      <span class="local">${esc(local ? fmtLocal(local) : 'Escolhe o local')}</span>
    </button>
    <button class="botao-redondo" data-acao="alternar-tema" aria-label="Mudar tema">${icone(tema === 'escuro' ? 'sol' : 'tema', { tamanho: 20 })}</button>`;
}

// ------------------------------------------------------------------ barra

function renderBarra() {
  const { obra } = contexto();
  const falta = obra ? store.registosPreciso(db, obra.id).filter((r) => !r.estado || r.estado === 'preciso').length : 0;
  $barra.innerHTML = NAV.map(
    (item) => `
    <a href="#/${item.rota}" class="${item.rota === rota ? 'ativo' : ''}" aria-label="${item.rotulo}">
      ${icone(item.icone, { tamanho: 21 })}
      <span>${item.rotulo}</span>
      ${item.rota === 'preciso' && falta > 0 ? `<span class="contador">${falta}</span>` : ''}
    </a>`
  ).join('');
}

// ------------------------------------------------------------------ registos: linha

function subtituloRegisto(r) {
  const partes = [];
  const local = store.localPorId(db, r.localId);
  const { local: localAtivo } = contexto();
  if (local && local.id !== localAtivo?.id) partes.push(fmtLocal(local));
  if (r.data !== hojeISO()) partes.push(fmtData(r.data));
  return partes.join(' · ');
}

// mostra o texto original so quando acrescenta informacao que o nome nao tem
// (ex.: "emprestada ao Diogo", "falta abrir carotes")
function textoExtra(r) {
  if (!r.texto || (r.cotas && r.cotas.length)) return '';
  const semInfo = [r.nome || '', r.familia || ''].map(normalizar).join(' ');
  let resto = ' ' + normalizar(r.texto) + ' ';
  for (const palavra of semInfo.split(/\s+/)) {
    if (!palavra) continue;
    resto = resto.split(palavra).join(' ');
  }
  resto = resto
    .replace(/[Øø⌀]?\s*\d+(?:[.,]\d+)?(?:\s*[x×/]\s*\d+(?:[.,]\d+)?)*/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/[^\p{L} ]/gu, ' ');
  const uteis = resto.split(/\s+/).filter((w) => w.length > 2 && !PALAVRAS_SEM_INFO.has(w));
  return uteis.length ? r.texto : '';
}

function cotasHtml(r) {
  if (!r.cotas || !r.cotas.length) return '';
  return `<ul class="cotas">${r.cotas
    .map((c) => `<li><b>${esc(String(c.valor).replace('.', ','))} ${esc(c.unidade)}</b>${c.referencia ? ' · ' + esc(c.referencia) : ''}</li>`)
    .join('')}</ul>`;
}

function linhaRegisto(r, { checkbox = false, semFamilia = false, acoes = '' } = {}) {
  const qtd = r.qtdExplicita ? `<span class="qtd"> — ${esc(fmtQtd(r.qtd, r.unidade))}</span>` : '';
  const sub = subtituloRegisto(r);
  const nome = r.tipo === 'nota' && r.cotaAssunto ? r.cotaAssunto : r.nome || r.texto;
  const extra = textoExtra(r);
  return `
    <div class="linha t-${r.tipo} tocavel ${r.estado === 'anulado' ? 'anulado' : ''}" data-acao="editar-registo" data-id="${r.id}">
      ${
        checkbox
          ? `<input type="checkbox" data-selecao="${r.id}" ${selecionados.has(r.id) ? 'checked' : ''} aria-label="Selecionar" />`
          : `<div class="tipo-icone">${ICONE_TIPO[r.tipo] || ICONE_TIPO.nota}</div>`
      }
      <div class="corpo">
        <div class="nome">${esc(nome || '(sem nome)')}${qtd}</div>
        <div class="sub">${selosEstado(r, { familia: !semFamilia })}${sub ? `<span>${esc(sub)}</span>` : ''}</div>
        ${cotasHtml(r)}
        ${extra ? `<div class="sub">“${esc(extra)}”</div>` : ''}
      </div>
      ${acoes ? `<div class="acoes">${acoes}</div>` : ''}
    </div>`;
}

// ------------------------------------------------------------------ ecra HOJE

function vistaHoje() {
  const { obra, local } = contexto();
  if (!obra) return vistaSemObra();
  const registos = store.registosDoDia(db, hojeISO(), obra.id);

  const chips = TIPOS.map(
    (t) =>
      `<button type="button" data-acao="tipo-chip" data-tipo="${t}" class="${tipoForcado === t ? 'on' : ''}">${ICONE_TIPO[t]} ${TIPO_META[t].etiqueta}</button>`
  ).join('');

  return `
    <section class="captura">
      <form id="form-linha" autocomplete="off">
        <div class="linha-entrada">
          <input id="entrada" type="text" enterkeyhint="send" placeholder="Dita ou escreve uma linha…" aria-label="Nova linha do caderno" />
          <button class="botao-mais" type="submit" aria-label="Adicionar linha">${icone('mais2', { tamanho: 24 })}</button>
        </div>
        <div class="quick">${chips}</div>
      </form>
      <div class="dica">Dita com o <b>microfone do teclado</b> · <b>//</b> herda a linha anterior</div>
    </section>

    <div class="grupo-titulo">Página de hoje <span class="risco"></span><span class="meta">${registos.length} linha${registos.length === 1 ? '' : 's'}</span></div>

    ${
      registos.length
        ? `<div class="lista">${registos.map((r) => linhaRegisto(r)).join('')}</div>`
        : `<div class="cartao vazio"><span class="grande">${icone('hoje', { tamanho: 26 })}</span>Página em branco.<br>Escreve ou dita a primeira linha do dia.</div>`
    }
  `;
}

function adicionarLinha() {
  const input = document.getElementById('entrada');
  if (!input) return;
  const texto = input.value.trim();
  if (!texto) return;
  const { obra, local } = contexto();
  if (!obra) {
    toast('Cria primeiro uma obra');
    return;
  }
  const ctx = { tipo: tipoForcado || undefined, ...store.contextoCaptura(db, obra.id) };
  const p = parseLinha(texto, ctx);
  if (!p) return;
  if (!p.nome && !(p.cotas || []).length) {
    toast('Não percebi — escreve o material ou o assunto');
    return;
  }

  let localId = local ? local.id : null;
  if (p.local && Object.keys(p.local).length) {
    const encontrado = store.encontrarLocal(db, { obraId: obra.id, lote: p.local.lote, bloco: p.local.bloco, piso: p.local.piso });
    if (encontrado) localId = encontrado.id;
  }

  store.addRegisto(db, { ...p, obraId: obra.id, localId });
  tipoForcado = '';

  render();
  const novo = document.getElementById('entrada');
  if (novo) novo.focus();

  const meta = TIPO_META[p.tipo];
  toast(`${meta.etiqueta}: ${p.nome}${p.qtdExplicita ? ' — ' + fmtQtd(p.qtd, p.unidade) : ''}`);
}

// ------------------------------------------------------------------ modal registo

function modalRegisto(id) {
  const r = db.registos.find((x) => x.id === id);
  if (!r) return;
  const meta = TIPO_META[r.tipo] || TIPO_META.nota;
  const estados = ESTADOS_POR_TIPO[r.tipo] || [''];
  const opcoesEstado = estados
    .filter(Boolean)
    .map((e) => `<option value="${e}" ${r.estado === e ? 'selected' : ''}>${ROTULO_ESTADO[e] || e}</option>`)
    .join('');
  const local = store.localPorId(db, r.localId);

  abrirModal(`
    <button class="modal-fechar" data-acao="fechar" aria-label="Fechar">${icone('fechar', { tamanho: 17 })}</button>
    <h3><span class="tipo-icone">${ICONE_TIPO[r.tipo] || ICONE_TIPO.nota}</span> Editar linha</h3>

    <label class="campo"><span>Tipo</span>
      <select id="e-tipo">${TIPOS.map((t) => `<option value="${t}" ${r.tipo === t ? 'selected' : ''}>${TIPOS.indexOf(t) + 1}. ${TIPO_META[t].etiqueta}</option>`).join('')}</select>
    </label>

    <label class="campo"><span>Nome</span><input id="e-nome" value="${esc(r.nome)}" /></label>

    <div class="linha-campos">
      <label class="campo"><span>Quantidade</span><input id="e-qtd" inputmode="decimal" value="${esc(r.qtdExplicita ? r.qtd : '')}" placeholder="—" /></label>
      <label class="campo"><span>Unidade</span>
        <select id="e-unidade">${UNIDADES.map((u) => `<option value="${u}" ${r.unidade === u ? 'selected' : ''}>${u}</option>`).join('')}</select>
      </label>
    </div>

    <label class="campo"><span>Família</span>
      <select id="e-familia">${['', ...FAMILIAS].map((f) => `<option value="${esc(f)}" ${r.familia === f ? 'selected' : ''}>${esc(f || '(sem família)')}</option>`).join('')}</select>
    </label>

    ${opcoesEstado ? `<label class="campo"><span>Estado</span><select id="e-estado">${opcoesEstado}</select></label>` : ''}

    ${r.cotas && r.cotas.length ? `<div class="campo"><span>Medidas</span>${cotasHtml(r)}</div>` : ''}

    <p class="meta">Escrito: “${esc(r.texto)}”${local ? ' · ' + esc(fmtLocal(local)) : ''} · ${esc(fmtData(r.data))}</p>

    <div class="acoes-linha">
      <button class="btn sec" data-acao="fechar">Fechar</button>
      <button class="btn perigo" data-acao="apagar-registo" data-id="${r.id}">Apagar</button>
    </div>
    <div class="acoes-linha">
      <button class="btn largo" data-acao="guardar-registo" data-id="${r.id}">Guardar</button>
    </div>
    ${r.tipo === 'ferramenta' ? `<div class="acoes-linha"><button class="btn sec largo" data-acao="para-ferramentas" data-id="${r.id}">Guardar em Ferramentas</button></div>` : ''}
  `);
}

function guardarRegisto(id) {
  const r = db.registos.find((x) => x.id === id);
  if (!r) return;
  const tipo = document.getElementById('e-tipo')?.value || r.tipo;
  const nome = document.getElementById('e-nome')?.value.trim() || '';
  const qtdTxt = document.getElementById('e-qtd')?.value.trim() || '';
  const unidade = document.getElementById('e-unidade')?.value || 'un';
  const familia = document.getElementById('e-familia')?.value || '';
  const estado = document.getElementById('e-estado')?.value ?? r.estado;
  const qtd = qtdTxt ? parseFloat(qtdTxt.replace(',', '.')) : 1;

  store.atualizarRegisto(db, id, {
    tipo,
    nome: canonicalizarNome(nome),
    qtd: Number.isFinite(qtd) ? qtd : 1,
    qtdExplicita: Boolean(qtdTxt),
    unidade,
    familia,
    estado
  });
  fecharModal();
  render();
  toast('Linha guardada');
}

function apagarRegisto(id) {
  if (!confirm('Apagar esta linha? Não se recupera.')) return;
  store.apagarRegisto(db, id);
  selecionados.delete(id);
  fecharModal();
  render();
  toast('Linha apagada');
}

// ------------------------------------------------------------------ ecra PRECISO

function vistaPreciso() {
  const { obra } = contexto();
  if (!obra) return vistaSemObra();
  const todos = store.registosPreciso(db, obra.id);
  const falta = todos.filter((r) => !r.estado || r.estado === 'preciso');
  const pedidos = todos.filter((r) => r.estado === 'pedido');
  const anulados = todos.filter((r) => r.estado === 'anulado');

  // mantem a selecao apenas em itens que continuam em falta
  for (const id of [...selecionados]) {
    if (!falta.some((r) => r.id === id)) selecionados.delete(id);
  }

  const porFamilia = (lista) => {
    const grupos = new Map();
    for (const r of lista) {
      const f = r.familia || '';
      if (!grupos.has(f)) grupos.set(f, []);
      grupos.get(f).push(r);
    }
    return [...grupos.entries()].sort((a, b) => (a[0] || 'zzz').localeCompare(b[0] || 'zzz'));
  };

  const blocosFalta = porFamilia(falta)
    .map(
      ([familia, itens]) => `
      <div class="grupo-titulo">${esc(familia || 'Sem família')}<span class="risco"></span><span class="meta">${itens.length}</span></div>
      <div class="lista">${itens.map((r) => linhaRegisto(r, { checkbox: true, semFamilia: true })).join('')}</div>`
    )
    .join('');

  const blocosPedidos = pedidos.length
    ? `<div class="grupo-titulo">Pedido<span class="risco"></span><span class="meta">${pedidos.length} · à espera de chegar</span></div>
       <div class="lista">${pedidos.map((r) => linhaRegisto(r)).join('')}</div>`
    : '';

  const blocosAnulados = anulados.length
    ? `<details style="margin-top:14px"><summary>Anulados (${anulados.length})</summary><div class="lista" style="margin-top:8px">${anulados.map((r) => linhaRegisto(r)).join('')}</div></details>`
    : '';

  return `
    <div class="cartao">
      <h2>Encomenda ao armazém</h2>
      <p class="meta">Seleciona o que falta. A app monta o texto por família e abre o WhatsApp — envias tu.</p>
      <div class="acoes-linha">
        <button class="btn whats largo" data-acao="gerar-encomenda" ${selecionados.size ? '' : 'disabled'}>
          ${icone('whatsapp', { tamanho: 19 })} Enviar ao armazém ${selecionados.size ? `(${selecionados.size})` : ''}
        </button>
      </div>
      <div class="acoes-linha">
        <button class="btn-mini" data-acao="selecionar-tudo">Selecionar tudo (${falta.length})</button>
        <button class="btn-mini" data-acao="limpar-selecao">Limpar seleção</button>
        <button class="btn-mini" data-acao="ir" data-rota="encomendas">Encomendas ${icone('setaDireita', { tamanho: 14 })}</button>
      </div>
    </div>

    ${falta.length ? blocosFalta : `<div class="cartao vazio"><span class="grande">${icone('preciso', { tamanho: 26 })}</span>Nada em falta.<br>Diz no ecrã <b>Hoje</b>: “falta …”.</div>`}
    ${blocosPedidos}
    ${blocosAnulados}
  `;
}

function gerarEncomenda() {
  const { obra, local } = contexto();
  if (!obra) return;
  const itens = [...selecionados]
    .map((id) => db.registos.find((r) => r.id === id))
    .filter(Boolean)
    .sort((a, b) => a.ts - b.ts);
  if (!itens.length) {
    toast('Seleciona primeiro o que falta');
    return;
  }
  const texto = textoEncomenda({ obra: obra.nome, local, data: hojeISO(), itens });

  abrirModal(`
    <button class="modal-fechar" data-acao="fechar" aria-label="Fechar">${icone('fechar', { tamanho: 17 })}</button>
    <h3><span class="tipo-icone">${ICONE_TIPO.preciso}</span> Encomenda</h3>
    <p class="meta">${itens.length} linha${itens.length === 1 ? '' : 's'} de ${esc(obra.nome)}${local ? ' · ' + esc(fmtLocal(local)) : ''}</p>
    <pre class="pre-texto" id="texto-enc">${esc(texto)}</pre>
    <div class="acoes-linha">
      <button class="btn whats largo" data-acao="whatsapp">${icone('whatsapp', { tamanho: 19 })} Abrir WhatsApp</button>
    </div>
    <div class="acoes-linha">
      <button class="btn sec" data-acao="copiar" data-texto="${esc(texto)}">${icone('copiar', { tamanho: 18 })} Copiar</button>
      <button class="btn sec" data-acao="fechar">Fechar</button>
    </div>
    <div class="acoes-linha">
      <button class="btn largo" data-acao="marcar-pedido">${icone('check', { tamanho: 19 })} Já enviei — marcar como pedido</button>
    </div>
  `);
  window.__textoEncomenda = texto;
}

function marcarPedido() {
  const { obra, local } = contexto();
  if (!obra) return;
  const itens = [...selecionados]
    .map((id) => db.registos.find((r) => r.id === id))
    .filter(Boolean)
    .sort((a, b) => a.ts - b.ts);
  if (!itens.length) return;
  const texto = window.__textoEncomenda || textoEncomenda({ obra: obra.nome, local, data: hojeISO(), itens });
  store.criarEncomenda(db, { obraId: obra.id, localId: local ? local.id : null, data: hojeISO(), itens, texto });
  selecionados.clear();
  fecharModal();
  render();
  toast(`Pedido registado (${itens.length})`);
}

// ------------------------------------------------------------------ ecra ENCOMENDAS

function vistaEncomendas() {
  const { obra } = contexto();
  if (!obra) return vistaSemObra();
  const lista = db.encomendas.filter((e) => e.obraId === obra.id).sort((a, b) => b.data.localeCompare(a.data));
  if (!lista.length) {
    return `<div class="cartao vazio"><span class="grande">${icone('gasto', { tamanho: 26 })}</span>Ainda não há encomendas enviadas.</div>`;
  }
  return lista
    .map((e) => {
      const local = store.localPorId(db, e.localId);
      return `
      <div class="cartao">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
          <span class="forte">${esc(fmtData(e.data))} · ${e.itens.length} linha${e.itens.length === 1 ? '' : 's'}</span>
          <span class="selo ${e.estado}">${esc(ROTULO_ESTADO[e.estado] || e.estado)}</span>
        </div>
        <p class="meta" style="margin:4px 0 0">${local ? esc(fmtLocal(local)) : ''}${e.dataEntrega ? ' · entregue ' + esc(fmtData(e.dataEntrega)) : ''}</p>
        <details><summary>Ver texto enviado</summary><pre class="pre-texto">${esc(e.texto)}</pre></details>
        ${e.estado === 'pedido' ? `<div class="acoes-linha"><button class="btn sec largo" data-acao="marcar-entrada" data-id="${e.id}">${icone('check', { tamanho: 18 })} Já chegou — marcar entrada</button></div>` : ''}
      </div>`;
    })
    .join('');
}

// ------------------------------------------------------------------ ecra MEDIDAS

function vistaMedidas() {
  const { obra } = contexto();
  if (!obra) return vistaSemObra();
  const lista = store.registosComCotas(db, obra.id).sort((a, b) => b.ts - a.ts);
  if (!lista.length) {
    return `
      <div class="cartao vazio"><span class="grande">${icone('medidas', { tamanho: 26 })}</span>
        Ainda não há medidas.<br>Escreve por exemplo:<br><i>“esgoto da cozinha: 45 cm do pronto, 1,90 m da parede da direita”</i>
      </div>`;
  }
  return `<div class="lista">${lista
    .map((r) => {
      const local = store.localPorId(db, r.localId);
      const assunto = r.cotaAssunto || r.texto;
      return `
      <div class="linha t-nota tocavel" data-acao="editar-registo" data-id="${r.id}">
        <div class="tipo-icone">${icone('medidas', { tamanho: 18 })}</div>
        <div class="corpo">
          <div class="nome">${esc(assunto)}</div>
          <div class="sub"><span>${esc(local ? fmtLocal(local) : '')} · ${esc(fmtData(r.data))}</span></div>
          ${cotasHtml(r)}
        </div>
      </div>`;
    })
    .join('')}</div>`;
}

// ------------------------------------------------------------------ ecra GASTO

function vistaGasto() {
  const { obra } = contexto();
  if (!obra) return vistaSemObra();
  const lista = store.registosGasto(db, obra.id).sort((a, b) => b.ts - a.ts);
  if (!lista.length) {
    return `<div class="cartao vazio"><span class="grande">${icone('gasto', { tamanho: 26 })}</span>Nada gasto apontado.<br>Diz no ecrã <b>Hoje</b>: “usei 30 m tubo ppr 25”.</div>`;
  }
  return `<div class="grupo-titulo">Gasto <span class="risco"></span><span class="meta">${lista.length}</span></div>
    <div class="lista">${lista.map((r) => linhaRegisto(r)).join('')}</div>`;
}

// ------------------------------------------------------------------ ecra FERRAMENTAS

function vistaFerramentas() {
  const lista = [...db.ferramentas];
  const grupos = ROTULO_FERRAMENTA.map((estado) => [estado, lista.filter((f) => f.estado === estado)]);

  return `
    <div class="cartao">
      <h2>Ferramentas</h2>
      <p class="meta">Da empresa, à tua responsabilidade · emprestadas · extraviadas · a precisar.</p>
      <div class="acoes-linha"><button class="btn largo" data-acao="nova-ferramenta">${icone('mais2', { tamanho: 19 })} Nova ferramenta</button></div>
    </div>
    ${
      lista.length
        ? grupos
            .filter(([, itens]) => itens.length)
            .map(
              ([estado, itens]) => `
        <div class="grupo-titulo">${esc(ROTULO_GRUPO_FERRAMENTA[estado] || ROTULO_ESTADO[estado])}<span class="risco"></span><span class="meta">${itens.length}</span></div>
        <div class="lista">${itens
          .map(
            (f) => `
          <div class="linha t-ferramenta tocavel" data-acao="editar-ferramenta" data-id="${f.id}">
            <div class="tipo-icone">${icone('ferramenta', { tamanho: 18 })}</div>
            <div class="corpo">
              <div class="nome">${esc(f.nome)}</div>
              <div class="sub"><span>${f.aQuem ? 'a ' + esc(f.aQuem) : ''}${f.aQuem && f.local ? ' · ' : ''}${f.local ? esc(f.local) : ''}${(f.aQuem || f.local) ? ' · ' : ''}desde ${esc(fmtData(f.desde))}</span></div>
              ${f.nota ? `<div class="sub">“${esc(f.nota)}”</div>` : ''}
            </div>
          </div>`
          )
          .join('')}</div>`
            )
            .join('')
        : `<div class="cartao vazio"><span class="grande">${icone('ferramenta', { tamanho: 26 })}</span>Nenhuma ferramenta registada.</div>`
    }
  `;
}

function modalFerramenta(id) {
  const f = id ? db.ferramentas.find((x) => x.id === id) : null;
  abrirModal(`
    <button class="modal-fechar" data-acao="fechar" aria-label="Fechar">${icone('fechar', { tamanho: 17 })}</button>
    <h3><span class="tipo-icone">${icone('ferramenta', { tamanho: 18 })}</span> ${f ? 'Editar' : 'Nova'} ferramenta</h3>
    <label class="campo"><span>Nome</span><input id="f-nome" value="${esc(f?.nome || '')}" placeholder="Polifusora, furadeira, máquina PPR…" /></label>
    <div class="linha-campos">
      <label class="campo"><span>Tipo</span>
        <select id="f-tipo">
          <option value="ferramenta" ${f?.tipo !== 'maquina' ? 'selected' : ''}>Ferramenta</option>
          <option value="maquina" ${f?.tipo === 'maquina' ? 'selected' : ''}>Máquina</option>
        </select>
      </label>
      <label class="campo"><span>Estado</span>
        <select id="f-estado">${ROTULO_FERRAMENTA.map((e) => `<option value="${e}" ${f?.estado === e ? 'selected' : ''}>${ROTULO_ESTADO[e]}</option>`).join('')}</select>
      </label>
    </div>
    <label class="campo"><span>Emprestada a / responsável</span><input id="f-aquem" value="${esc(f?.aQuem || '')}" /></label>
    <div class="linha-campos">
      <label class="campo"><span>Desde</span><input id="f-desde" type="date" value="${esc(f?.desde || hojeISO())}" /></label>
      <label class="campo"><span>Onde está</span><input id="f-local" value="${esc(f?.local || '')}" placeholder="Bloco A, carrinha…" /></label>
    </div>
    <label class="campo"><span>Nota</span><input id="f-nota" value="${esc(f?.nota || '')}" /></label>
    <div class="acoes-linha">
      <button class="btn sec" data-acao="fechar">Fechar</button>
      ${f ? `<button class="btn perigo" data-acao="apagar-ferramenta" data-id="${f.id}">Apagar</button>` : ''}
    </div>
    <div class="acoes-linha"><button class="btn largo" data-acao="guardar-ferramenta" data-id="${f?.id || ''}">Guardar</button></div>
  `);
}

function guardarFerramenta(id) {
  const dados = {
    nome: document.getElementById('f-nome')?.value.trim() || 'Ferramenta',
    tipo: document.getElementById('f-tipo')?.value || 'ferramenta',
    estado: document.getElementById('f-estado')?.value || 'comigo',
    aQuem: document.getElementById('f-aquem')?.value.trim() || '',
    desde: document.getElementById('f-desde')?.value || hojeISO(),
    local: document.getElementById('f-local')?.value.trim() || '',
    nota: document.getElementById('f-nota')?.value.trim() || ''
  };
  if (id) store.atualizarFerramenta(db, id, dados);
  else store.addFerramenta(db, dados);
  fecharModal();
  render();
  toast('Ferramenta guardada');
}

function registoParaFerramenta(id) {
  const r = db.registos.find((x) => x.id === id);
  if (!r) return;
  const texto = r.texto || '';
  let estado = 'comigo';
  if (/emprest|emprestei/i.test(texto)) estado = 'emprestada';
  else if (/perdi|desapareceu|extravi/i.test(texto)) estado = 'extraviada';
  else if (/avari|reparar/i.test(texto)) estado = 'reparacao';
  else if (/preciso|falta/i.test(texto)) estado = 'preciso';
  const m = texto.match(/(?:ao|à|para o|para a)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+(?:\s+[A-ZÀ-Þ][\wÀ-ÿ]+)?)/);
  store.addFerramenta(db, {
    nome: r.nome || 'Ferramenta',
    tipo: /maq|máquina/i.test(texto) ? 'maquina' : 'ferramenta',
    estado,
    aQuem: m ? m[1] : '',
    desde: r.data,
    nota: texto
  });
  fecharModal();
  render();
  toast('Guardado em Ferramentas');
}

// ------------------------------------------------------------------ ecra MAIS

function vistaMais() {
  const { obra } = contexto();
  const obras = db.obras.map((o) => `<option value="${o.id}" ${o.id === obra?.id ? 'selected' : ''}>${esc(o.nome)}</option>`).join('');
  const totais = {
    registos: db.registos.length,
    encomendas: db.encomendas.length,
    ferramentas: db.ferramentas.length,
    obras: db.obras.length
  };
  const tema = document.documentElement.dataset.tema || 'auto';
  const rotuloTema = tema === 'auto' ? 'automático' : tema === 'claro' ? 'claro' : 'escuro';

  const descricao = {
    preciso: 'material em falta; é o que vai na encomenda',
    gasto: 'o que usaste na obra',
    ferramenta: 'emprestada, perdida, a precisar, em reparação',
    tarefa: 'trabalho a fazer',
    nota: 'o resto, incluindo medidas e cotas'
  };

  return `
    <div class="cartao">
      <h2>Obra</h2>
      ${db.obras.length > 1 ? `<label class="campo"><span>Obra ativa</span><select id="m-obra">${obras}</select></label>` : `<p class="forte">${esc(obra?.nome || '—')}</p>`}
      <div class="acoes-linha">
        <button class="btn sec" data-acao="nova-obra">${icone('mais2', { tamanho: 18 })} Nova obra</button>
        <button class="btn sec" data-acao="ir" data-rota="locais">${icone('obra', { tamanho: 18 })} Locais (${obra ? obra.locais.length : 0})</button>
      </div>
    </div>

    <div class="cartao">
      <h2>Registos</h2>
      <p class="meta">${totais.registos} linhas · ${totais.encomendas} encomendas · ${totais.ferramentas} ferramentas · ${totais.obras} obras</p>
      <div class="acoes-linha">
        <button class="btn sec" data-acao="ir" data-rota="gasto">${icone('gasto', { tamanho: 18 })} Gasto</button>
        <button class="btn sec" data-acao="ir" data-rota="encomendas">${icone('preciso', { tamanho: 18 })} Encomendas</button>
      </div>
    </div>

    <div class="cartao">
      <h2>Aspeto</h2>
      <p class="meta">Tema ${esc(rotuloTema)} · segue o do telemóvel quando está em automático.</p>
      <div class="acoes-linha">
        <button class="btn sec largo" data-acao="alternar-tema">${icone(tema === 'escuro' ? 'sol' : 'tema', { tamanho: 18 })} Mudar tema (${esc(rotuloTema)})</button>
      </div>
    </div>

    <div class="cartao">
      <h2>Cópia de segurança</h2>
      <p class="meta">Os dados vivem neste telemóvel. Exporta de vez em quando — se o telemóvel cair, o caderno perde-se.</p>
      <div class="acoes-linha">
        <button class="btn sec" data-acao="exportar">${icone('gasto', { tamanho: 18 })} Exportar</button>
        <button class="btn sec" data-acao="importar">${icone('copiar', { tamanho: 18 })} Importar</button>
      </div>
      <input id="fich-importar" type="file" accept="application/json,.json" style="display:none" />
    </div>

    <div class="cartao">
      <h2>Como funciona</h2>
      ${TIPOS.map(
        (t) => `
        <div class="linha t-${t}" style="border-bottom:1px solid var(--linha);padding:10px 0">
          <div class="tipo-icone">${ICONE_TIPO[t]}</div>
          <div class="corpo">
            <div class="nome" style="font-size:14.5px">${TIPO_META[t].etiqueta}</div>
            <div class="sub"><span>${esc(descricao[t])}</span></div>
          </div>
        </div>`
      ).join('')}
      <p class="meta mt">
        Regras: <b>//</b> herda o nome da linha anterior · <b>piso/bloco</b> na linha muda o local ·
        “45 cm do pronto” vira medida · <b>do pronto</b> = chão acabado.
      </p>
      <p class="meta">Versão 1.1 · dados só neste dispositivo.</p>
    </div>
  `;
}

// ------------------------------------------------------------------ ecra LOCAIS

function vistaLocais() {
  const { obra } = contexto();
  if (!obra) return vistaSemObra();

  const porLote = new Map();
  for (const l of obra.locais) {
    if (!porLote.has(l.lote || '—')) porLote.set(l.lote || '—', []);
    porLote.get(l.lote || '—').push(l);
  }

  return `
    <div class="cartao">
      <h2>${esc(obra.nome)} · locais</h2>
      <p class="meta">${obra.locais.length} locais. O contexto do topo decide onde cada linha cai.</p>
      <div class="linha-campos" style="margin-top:10px">
        <label class="campo"><span>Lote</span><input id="l-lote" placeholder="1A" /></label>
        <label class="campo"><span>Bloco</span><input id="l-bloco" placeholder="A" /></label>
        <label class="campo"><span>Piso</span><input id="l-piso" placeholder="1" inputmode="numeric" /></label>
      </div>
      <div class="acoes-linha"><button class="btn largo" data-acao="adicionar-local">${icone('mais2', { tamanho: 19 })} Adicionar local</button></div>
    </div>
    ${[...porLote.entries()]
      .map(
        ([lote, locais]) => `
      <div class="grupo-titulo">${esc(lote === '—' ? 'Sem lote' : 'Lote ' + lote)}<span class="risco"></span><span class="meta">${locais.length}</span></div>
      <div class="cartao" style="display:flex;flex-wrap:wrap;gap:6px">
        ${locais
          .map(
            (l) => `
          <button class="btn-mini" data-acao="usar-local" data-id="${l.id}" title="Usar este local">
            ${esc((l.bloco ? 'Bloco ' + l.bloco + ' ' : '') + 'Piso ' + l.piso)}
            <span data-acao="remover-local" data-id="${l.id}" style="margin-left:6px;color:var(--vermelho)">✕</span>
          </button>`
          )
          .join('')}
      </div>`
      )
      .join('')}
  `;
}

// ------------------------------------------------------------------ modais de contexto e obra

function modalContexto() {
  const { obra } = contexto();
  const blocos = db.obras
    .map((o) => {
      const porLote = new Map();
      for (const l of o.locais) {
        if (!porLote.has(l.lote || '—')) porLote.set(l.lote || '—', []);
        porLote.get(l.lote || '—').push(l);
      }
      return `
        <div class="grupo-titulo">${esc(o.nome)}<span class="risco"></span><span class="meta">${o.locais.length} locais</span></div>
        <div class="cartao" style="display:flex;flex-wrap:wrap;gap:6px">
          ${[...porLote.entries()]
            .flatMap(([lote, locais]) =>
              locais.map(
                (l) => `<button class="btn-mini ${l.id === db.ativo?.localId ? 'on' : ''}" data-acao="usar-local" data-id="${l.id}">
                  ${esc((lote && lote !== '—' ? 'L' + lote + ' · ' : '') + (l.bloco ? 'B' + l.bloco + ' · ' : '') + 'P' + l.piso)}
                </button>`
              )
            )
            .join('')}
        </div>`;
    })
    .join('');

  abrirModal(`
    <button class="modal-fechar" data-acao="fechar" aria-label="Fechar">${icone('fechar', { tamanho: 17 })}</button>
    <h3><span class="tipo-icone">${icone('obra', { tamanho: 18 })}</span> Onde estás?</h3>
    <p class="meta">Tudo o que escreveres fica neste local até mudares.</p>
    ${blocos || `<p class="vazio">Sem obras.</p>`}
    <div class="acoes-linha"><button class="btn largo" data-acao="nova-obra">${icone('mais2', { tamanho: 19 })} Nova obra</button></div>
    <div class="acoes-linha"><button class="btn sec largo" data-acao="ir" data-rota="locais">Gerir locais</button></div>
  `);
}

function modalNovaObra() {
  abrirModal(`
    <button class="modal-fechar" data-acao="fechar" aria-label="Fechar">${icone('fechar', { tamanho: 17 })}</button>
    <h3><span class="tipo-icone">${icone('obra', { tamanho: 18 })}</span> Nova obra</h3>
    <label class="campo"><span>Nome</span><input id="o-nome" placeholder="Lavandeira, Ouro Valley…" /></label>
    <label class="campo"><span>Morada</span><input id="o-morada" /></label>
    <label class="campo"><span>Cliente</span><input id="o-cliente" /></label>
    <p class="meta">Depois acrescentas lotes, blocos e pisos em <b>Locais</b>.</p>
    <div class="acoes-linha"><button class="btn largo" data-acao="guardar-obra">Criar obra</button></div>
  `);
}

function guardarObra() {
  const nome = document.getElementById('o-nome')?.value.trim() || 'Obra';
  const morada = document.getElementById('o-morada')?.value.trim() || '';
  const cliente = document.getElementById('o-cliente')?.value.trim() || '';
  const obra = store.criarObra(db, { nome, morada, cliente });
  db.ativo = { obraId: obra.id, localId: null };
  store.guardar(db);
  fecharModal();
  render();
  toast('Obra criada — acrescenta os locais');
}

// ------------------------------------------------------------------ partilha / backup

function abrirWhatsApp() {
  const texto = window.__textoEncomenda || '';
  if (!texto) return;
  const url = 'https://wa.me/?text=' + encodeURIComponent(texto);
  window.open(url, '_blank', 'noopener');
  toast('Abre no WhatsApp — envia ao armazém e volta para marcar como pedido');
}

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    toast('Texto copiado');
  } catch {
    toast('Não foi possível copiar aqui — usa o botão WhatsApp');
  }
}

function exportar() {
  const blob = new Blob([store.exportarJSON(db)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `caderno-obra-${hojeISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Cópia exportada');
}

function importarFicheiro(ficheiro) {
  const leitor = new FileReader();
  leitor.onload = () => {
    try {
      db = store.importarJSON(String(leitor.result));
      fecharModal();
      render();
      toast('Cópia importada');
    } catch (erro) {
      toast('Ficheiro inválido');
    }
  };
  leitor.readAsText(ficheiro);
}

// ------------------------------------------------------------------ render

function render() {
  renderTopo();
  const html = {
    hoje: vistaHoje,
    preciso: vistaPreciso,
    medidas: vistaMedidas,
    ferramentas: vistaFerramentas,
    gasto: vistaGasto,
    encomendas: vistaEncomendas,
    locais: vistaLocais,
    mais: vistaMais
  }[rota] || vistaHoje;
  $vista.innerHTML = html();
  renderBarra();
}

function navegar() {
  const bruto = (location.hash || '#/hoje').replace(/^#\//, '') || 'hoje';
  rota = ['hoje', 'preciso', 'medidas', 'ferramentas', 'gasto', 'encomendas', 'locais', 'mais'].includes(bruto) ? bruto : 'hoje';
  fecharModal();
  render();
  window.scrollTo({ top: 0 });
}

// ------------------------------------------------------------------ eventos

document.addEventListener('submit', (e) => {
  if (e.target.id === 'form-linha') {
    e.preventDefault();
    adicionarLinha();
  }
});

document.addEventListener('change', (e) => {
  const cb = e.target.closest('input[type="checkbox"][data-selecao]');
  if (cb) {
    if (cb.checked) selecionados.add(cb.dataset.selecao);
    else selecionados.delete(cb.dataset.selecao);
    render();
    return;
  }
  if (e.target.id === 'fich-importar' && e.target.files && e.target.files[0]) {
    importarFicheiro(e.target.files[0]);
  }
  if (e.target.id === 'm-obra') {
    const obraId = e.target.value;
    const obra = store.obraPorId(db, obraId);
    store.definirAtivo(db, obraId, obra?.locais[0]?.id || null);
    selecionados.clear();
    render();
  }
});

document.addEventListener('click', (e) => {
  const alvo = e.target.closest('[data-acao]');
  if (!alvo) return;
  const acao = alvo.dataset.acao;
  const id = alvo.dataset.id;

  // deixa o clique do checkbox de selecao seguir o caminho normal
  if (acao === 'editar-registo' && e.target.closest('input[type="checkbox"]')) return;

  switch (acao) {
    case 'fechar':
      fecharModal();
      break;
    case 'tipo-chip': {
      e.preventDefault();
      tipoForcado = tipoForcado === alvo.dataset.tipo ? '' : alvo.dataset.tipo;
      render();
      document.getElementById('entrada')?.focus();
      break;
    }
    case 'abrir-contexto':
      modalContexto();
      break;
    case 'alternar-tema':
      alternarTema();
      break;
    case 'usar-local': {
      const local = store.localPorId(db, id);
      const obra = local ? store.obraDoLocal(db, id) : null;
      if (obra && local) {
        store.definirAtivo(db, obra.id, local.id);
        selecionados.clear();
        fecharModal();
        render();
        toast(obra.nome + ' · ' + fmtLocal(local));
      }
      break;
    }
    case 'remover-local': {
      e.stopPropagation();
      if (!confirm('Remover este local?')) return;
      store.removerLocal(db, id);
      fecharModal();
      render();
      break;
    }
    case 'editar-registo':
      modalRegisto(id);
      break;
    case 'guardar-registo':
      guardarRegisto(id);
      break;
    case 'apagar-registo':
      apagarRegisto(id);
      break;
    case 'para-ferramentas':
      registoParaFerramenta(id);
      break;
    case 'selecionar-tudo': {
      const { obra } = contexto();
      const falta = store.registosPreciso(db, obra?.id).filter((r) => !r.estado || r.estado === 'preciso');
      selecionados = new Set(falta.map((r) => r.id));
      render();
      break;
    }
    case 'limpar-selecao':
      selecionados.clear();
      render();
      break;
    case 'gerar-encomenda':
      gerarEncomenda();
      break;
    case 'whatsapp':
      abrirWhatsApp();
      break;
    case 'copiar':
      copiarTexto(alvo.dataset.texto || window.__textoEncomenda || '');
      break;
    case 'marcar-pedido':
      marcarPedido();
      break;
    case 'marcar-entrada':
      if (store.marcarEntrada(db, id)) {
        render();
        toast('Entrada registada');
      }
      break;
    case 'nova-ferramenta':
      modalFerramenta(null);
      break;
    case 'editar-ferramenta':
      modalFerramenta(id);
      break;
    case 'guardar-ferramenta':
      guardarFerramenta(id);
      break;
    case 'apagar-ferramenta':
      if (confirm('Apagar esta ferramenta?')) {
        store.apagarFerramenta(db, id);
        fecharModal();
        render();
      }
      break;
    case 'nova-obra':
      modalNovaObra();
      break;
    case 'guardar-obra':
      guardarObra();
      break;
    case 'adicionar-local': {
      const { obra } = contexto();
      if (!obra) return;
      const local = store.adicionarLocal(db, obra.id, {
        lote: document.getElementById('l-lote')?.value || '',
        bloco: document.getElementById('l-bloco')?.value || '',
        piso: document.getElementById('l-piso')?.value || ''
      });
      if (local) {
        store.definirAtivo(db, obra.id, local.id);
        render();
        toast('Local adicionado');
      } else {
        toast('Esse local já existe');
      }
      break;
    }
    case 'ir':
      location.hash = '#/' + alvo.dataset.rota;
      break;
    case 'exportar':
      exportar();
      break;
    case 'importar':
      document.getElementById('fich-importar')?.click();
      break;
    default:
      break;
  }
});

// fechar ao tocar no fundo
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-fundo')) fecharModal();
});

window.addEventListener('hashchange', navegar);

// primeiro desenho
if (!location.hash) location.hash = '#/hoje';
navegar();

// service worker (só quando servido por https ou localhost)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
