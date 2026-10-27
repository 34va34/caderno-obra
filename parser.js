// parser.js — regras de captura do caderno.
// Funcoes puras, sem DOM: testaveis em Node.

export const TIPOS = ['preciso', 'gasto', 'ferramenta', 'tarefa', 'nota'];

export const TIPO_META = {
  preciso: { icone: '⛔', etiqueta: 'Preciso' },
  gasto: { icone: '📦', etiqueta: 'Gasto' },
  ferramenta: { icone: '🧰', etiqueta: 'Ferramenta' },
  tarefa: { icone: '📌', etiqueta: 'Tarefa' },
  nota: { icone: '📝', etiqueta: 'Nota' }
};

export const ESTADOS_PRECISO = ['preciso', 'pedido', 'entrada', 'anulado'];
export const ESTADOS_FERRAMENTA = ['comigo', 'emprestada', 'preciso', 'extraviada', 'reparacao'];

// ---------------------------------------------------------------- normalizacao

const ACENTOS = /[\u0300-\u036f]/g;
const DIA = /[\u00d8\u00f8\u2300\u03a6\u03c6]/g; // Ø ø ⌀ Φ φ

export function normalizar(t) {
  return String(t ?? '')
    .replace(DIA, 'Ø')
    .toLowerCase()
    .normalize('NFD')
    .replace(ACENTOS, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function numero(s) {
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------- dicionario

// chave normalizada (sem acentos) -> nome canonico acentuado
const ALIASES = {
  casq: 'casquilho', casqs: 'casquilho', casquilho: 'casquilho', casquilhos: 'casquilho',
  te: 'tê', tes: 'tê',
  uniao: 'união', unioes: 'união', uni: 'união',
  curva: 'curva', curvas: 'curva',
  joelho: 'joelho', joelhos: 'joelho',
  tubo: 'tubo', tubos: 'tubo',
  abracadeira: 'abraçadeira', abracadeiras: 'abraçadeira',
  isolamento: 'isolamento', isolamentos: 'isolamento',
  valvula: 'válvula', valvulas: 'válvula',
  luva: 'luva', luvas: 'luva',
  tampao: 'tampão', tampoes: 'tampão',
  sifao: 'sifão', sifoes: 'sifão',
  ralo: 'ralo', ralos: 'ralo',
  reducao: 'redução', reducoes: 'redução',
  terminal: 'terminal', terminais: 'terminal',
  macho: 'macho', machos: 'macho',
  femea: 'fêmea', femeas: 'fêmea',
  maquina: 'máquina', maquinas: 'máquina', maq: 'máquina', maqs: 'máquina',
  polifusora: 'polifusora', polifusoras: 'polifusora', holefusora: 'polifusora',
  eletrossolda: 'eletrossolda', eletrossoldas: 'eletrossolda',
  furadeira: 'furadeira', furadeiras: 'furadeira',
  berbequim: 'berbequim', berbequins: 'berbequim',
  martelo: 'martelo', martelos: 'martelo',
  nivel: 'nível', niveis: 'nível',
  laser: 'laser', kit: 'kit', kits: 'kit',
  tesoura: 'tesoura', tesouras: 'tesoura',
  carote: 'carote', carotes: 'carote',
  prumada: 'prumada', prumadas: 'prumada',
  bomba: 'bomba', bombas: 'bomba',
  contador: 'contador', contadores: 'contador',
  flexivel: 'flexível', flexiveis: 'flexível',
  cabo: 'cabo', cabos: 'cabo',
  tinta: 'tinta', saco: 'saco', sacos: 'saco',
  cimento: 'cimento', areia: 'areia', rede: 'rede',
  parafuso: 'parafuso', parafusos: 'parafuso',
  bucha: 'bucha', buchas: 'bucha'
};

const NOMES_CONHECIDOS = new Set(Object.values(ALIASES));

const UNIDADES = {
  un: 'un', unid: 'un', unidade: 'un', unidades: 'un', und: 'un', uds: 'un', uni: 'un',
  m: 'm', mt: 'm', mts: 'm', metro: 'm', metros: 'm',
  kg: 'kg', kilos: 'kg', quilo: 'kg', quilos: 'kg',
  caixa: 'caixa', caixas: 'caixa', cx: 'caixa',
  rolo: 'rolo', rolos: 'rolo',
  saco: 'saco', sacos: 'saco',
  litro: 'L', litros: 'L', l: 'L',
  pacote: 'pacote', pacotes: 'pacote',
  fardo: 'fardo', fardos: 'fardo',
  h: 'h', hora: 'h', horas: 'h'
};

const UNIDADES_COMPRIMENTO = { cm: 'cm', mm: 'mm', m: 'm', mt: 'm', mts: 'm', metro: 'm', metros: 'm' };

export const FAMILIAS = ['PPR', 'PVC', 'Esgotos', 'Pluviais', 'Abraçadeiras', 'Isolamento', 'Águas'];

// ---------------------------------------------------------------- nome

function mapearToken(palavra) {
  const chave = normalizar(palavra).replace(/[^a-z0-9]/g, '');
  const canon = ALIASES[chave];
  if (!canon) return palavra;
  // mantem pontuacao a volta, troca so o nucleo
  const nucleo = String(palavra).match(/^[^\p{L}\p{N}]*([\p{L}\p{N}]+)[^\p{L}\p{N}]*$/u);
  if (!nucleo) return palavra;
  return String(palavra).replace(nucleo[1], canon);
}

export function canonicalizarNome(nomeBruto) {
  let s = String(nomeBruto ?? '')
    .replace(/[⌀∅Φφø]/g, 'Ø')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s.,;:\-–—]+/, '')
    .replace(/[\s.,;:\-–—]+$/, '')
    .replace(/^(?:de|do|da|dos|das)\s+/i, '');
  if (!s) return '';
  s = s.split(' ').map(mapearToken).join(' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// nome so com especificacao (ex.: "Ø32", "32", "40x32x40") -> precisa de herdar o substantivo
export function apenasEspecificacao(nome) {
  const n = normalizar(nome).replace(/Ø/g, ' ');
  return !/[a-z]{2,}/.test(n);
}

export function baseDoNome(nome) {
  const palavras = String(nome ?? '').split(/\s+/);
  for (const p of palavras) {
    const chave = normalizar(p).replace(/[^a-z0-9]/g, '');
    if (NOMES_CONHECIDOS.has(ALIASES[chave])) return ALIASES[chave];
  }
  const primeira = palavras[0];
  return primeira ? canonicalizarNome(primeira) : '';
}

// ---------------------------------------------------------------- tipo

const RE_FERRAMENTA = /\b(ferramenta|ferramentas|maq|maqs|maquina|maquinas|polifusora|holefusora|eletrossolda|furadeira|berbequim|martelo|nivel|emprestei|emprestou|emprestada|emprestado|perdi|perdeu|desapareceu|sumiu|roubaram|desviou|devolvi|devolvida|quebrou|avariou)\b/;
const RE_GASTO = /\b(usei|usamos|usei ja|gastei|gastou|gastamos|consumi|consumimos|apliquei|aplicamos|levou|levamos|meti|metemos)\b/;
const RE_PRECISO = /\b(falta|faltam|acabou|acabaram|acabouse|preciso de|precisa de|pedir|pede|encomendar|encomenda de|manda|mandar)\b/;
const RE_TAREFA = /\b(tarefa|iniciar|iniciei|comecar|comecei|comecamos|fazer|fiz|tem de|e preciso|arranjar|corrigir|trocar|montar|acabar|terminar|verificar|vistoria|limpar|desentupir)\b/;

export function detectarTipo(texto) {
  const n = normalizar(texto);
  if (RE_FERRAMENTA.test(n)) return 'ferramenta';
  if (RE_GASTO.test(n)) return 'gasto';
  if (RE_PRECISO.test(n)) return 'preciso';
  if (RE_TAREFA.test(n)) return 'tarefa';
  return 'nota';
}

// ---------------------------------------------------------------- familia

export function detectarFamilia(texto) {
  const n = normalizar(texto);
  if (/\bppr\b/.test(n)) return 'PPR';
  if (/\bpvc\b/.test(n)) return 'PVC';
  if (/\besgotos?\b/.test(n)) return 'Esgotos';
  if (/\bpluvia(?:l|is)\b/.test(n) || /\blaranja\b/.test(n)) return 'Pluviais';
  if (/\babracadeiras?\b/.test(n)) return 'Abraçadeiras';
  if (/\bisolamentos?\b/.test(n)) return 'Isolamento';
  if (/\baguas?\b/.test(n)) return 'Águas';
  return '';
}

// ---------------------------------------------------------------- quantidade

const RE_ESPEC = /[Øø⌀]\s*\d+(?:[.,]\d+)?(?:\s*[x×/]\s*\d+(?:[.,]\d+)?)*/gi;
const RE_TRACO = /\b\d+(?:[.,]\d+)?\s*[x×]\s*\d+(?:[.,]\d+)?\b/gi;
const RE_GRAU = /\b\d+\s*[°º]\b/g;
const RE_UNID_TRAIL = /(?:[-–—:]\s*)?(\d+(?:[.,]\d+)?)\s*(un|unid|unidade|unidades|und|uds|uni|m|mt|mts|metros?|kg|caixas?|cx|rolos?|sacos?|litros?|l|pacotes?|fardos?)\b\.?\s*$/i;
const RE_UNID_MEIO = /\b(\d+(?:[.,]\d+)?)\s*(un|unid|unidade|unidades|und|uds|uni|m|mt|mts|metros?|kg|caixas?|cx|rolos?|sacos?|litros?|l|pacotes?|fardos?)\b/i;
const RE_NUM_TRAIL = /(\d+(?:[.,]\d+)?)\s*$/;
const RE_LEAD_MULT = /^\s*(\d+)\s*[x×]\s+/i;
// um numero no fim precedido de ppr/pvc/dn/Ø e diametro, nao quantidade
const RE_ANTES_DIAMETRO = /(?:ppr|pvc|dn|Ø|ø|\/)\s*$/i;

// mascara especificacoes tecnicas mantendo o comprimento, para nao as cortar do nome
function mascarar(str) {
  return str
    .replace(RE_ESPEC, (m) => ' '.repeat(m.length))
    .replace(RE_TRACO, (m) => ' '.repeat(m.length))
    .replace(RE_GRAU, (m) => ' '.repeat(m.length));
}

export function extrairQuantidade(corpo) {
  const s = ' ' + String(corpo ?? '') + ' ';
  const mask = mascarar(s);

  let qtd = null;
  let unidade = 'un';
  let ini = -1;
  let fim = -1;

  const unidTrail = mask.match(RE_UNID_TRAIL);
  if (unidTrail) {
    ini = unidTrail.index;
    fim = unidTrail.index + unidTrail[0].length;
    qtd = numero(unidTrail[1]);
    unidade = UNIDADES[normalizar(unidTrail[2])] || 'un';
  } else {
    const lead = mask.match(RE_LEAD_MULT);
    if (lead) {
      ini = lead.index;
      fim = lead.index + lead[0].length;
      qtd = numero(lead[1]);
    } else {
      const unidMeio = mask.match(RE_UNID_MEIO);
      if (unidMeio) {
        ini = unidMeio.index;
        fim = unidMeio.index + unidMeio[0].length;
        qtd = numero(unidMeio[1]);
        unidade = UNIDADES[normalizar(unidMeio[2])] || 'un';
      } else {
        const numTrail = mask.match(RE_NUM_TRAIL);
        if (numTrail && !RE_ANTES_DIAMETRO.test(mask.slice(0, numTrail.index))) {
          ini = numTrail.index;
          fim = numTrail.index + numTrail[0].length;
          qtd = numero(numTrail[1]);
        }
      }
    }
  }

  const bruto = ini >= 0 ? s.slice(0, ini) + ' ' + s.slice(fim) : s;

  const resto = bruto
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[-–—:]\s*$/, '')
    .replace(/^[\s.,;:/\\"']+/, '')
    .replace(/[\s.,;:/\\"']+$/, '')
    .trim();

  return { qtd, unidade, resto };
}

// ---------------------------------------------------------------- cotas

const RE_COTA = /(\d+(?:[.,]\d+)?)\s*(cm|mm|metros?|mts?|m)\b(?:\s*(?:d[oa]s?|à|ao|ate|até|entre)\s+([^,;.\n]{2,40}))?/gi;

export function normalizarReferencia(ref) {
  const n = normalizar(ref);
  if (!n) return '';
  if (/\bpronto\b/.test(n) || /chao acabado/.test(n) || /\bacabado\b/.test(n)) return 'pronto (chão acabado)';
  if (/\bprumo\b/.test(n)) return 'prumo';
  return String(ref).trim();
}

// Uma cota precisa de referencia explicita ("45 cm do pronto", "1,90 m da parede da direita").
export function extrairCotas(texto) {
  const t = String(texto ?? '');
  const out = [];
  RE_COTA.lastIndex = 0;
  let m;
  while ((m = RE_COTA.exec(t)) !== null) {
    const unidade = UNIDADES_COMPRIMENTO[normalizar(m[2])];
    const refBruta = (m[3] || '').trim();
    if (!unidade || !refBruta) continue;
    out.push({
      valor: numero(m[1]),
      unidade,
      referencia: normalizarReferencia(refBruta),
      bruto: m[0]
    });
  }
  return out;
}

export function removerCotas(texto, cotas) {
  let s = String(texto ?? '');
  for (const c of cotas || []) {
    if (c.bruto) s = s.split(c.bruto).join(' ');
  }
  return s
    .replace(/\s+/g, ' ')
    .replace(/\s*([,;.])\s*$/g, '')
    .replace(/\s*[,;]\s*,/g, ',')
    .replace(/[:]\s*$/, '')
    .trim();
}

// ---------------------------------------------------------------- local na linha

export function extrairLocalInline(texto) {
  const n = normalizar(texto);
  const out = {};
  let m = n.match(/\bpiso\s*(-?\d+)\b/);
  if (m) out.piso = String(numero(m[1]));
  m = n.match(/\bbloco\s*([a-z])\b/);
  if (m) out.bloco = m[1].toUpperCase();
  m = n.match(/\blote\s*(\d+[a-z]?)\b/);
  if (m) out.lote = m[1].toUpperCase();
  return out;
}

function removerLocalInline(texto) {
  return String(texto ?? '')
    .replace(/\b(?:no|na|do|da|para o|para a)?\s*piso\s*-?\d+\b/gi, ' ')
    .replace(/\b(?:no|na|do|da|para o|para a)?\s*bloco\s*[a-z]\b/gi, ' ')
    .replace(/\b(?:no|na|do|da|para o|para a)?\s*lote\s*\d+[a-z]?\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------- prefixos de tipo

const PREFIXOS = [
  /^(?:falta|faltam|preciso de|preciso|precisa de|acabou|acabaram|acabouse|pedir|pede|encomendar|encomenda de)\s+/i,
  /^(?:usei|usamos|gastei|gastou|gastamos|consumi|consumimos|apliquei|aplicamos|levou|levamos|meti|metemos)\s+/i,
  /^(?:ferramenta|maquina|emprestei|emprestou|emprestada|emprestado|perdi|perdeu|desapareceu|sumiu|roubaram|devolvi|quebrou|avariou)\s+/i,
  /^(?:tarefa|iniciar|iniciei|comecar|comecei|comecamos|fazer|fiz|tem de|e preciso|arranjar|corrigir|trocar|montar|acabar|terminar|verificar|limpar|desentupir)\s+/i
];

function tirarPrefixos(texto) {
  let s = String(texto ?? '').trim();
  let mudou = true;
  let guardas = 0;
  while (mudou && guardas++ < 4) {
    mudou = false;
    for (const re of PREFIXOS) {
      const novo = s.replace(re, '');
      if (novo !== s) {
        s = novo.trim();
        mudou = true;
      }
    }
    // "falta de cimento" -> "cimento"
    const semDe = s.replace(/^(?:de|do|da|dos|das)\s+/i, '');
    if (semDe !== s) {
      s = semDe.trim();
      mudou = true;
    }
  }
  return s;
}

// ---------------------------------------------------------------- parse principal

/**
 * @param {string} texto linha escrita ou ditada
 * @param {{tipo?:string, familia?:string, ultimoNome?:string}} ctx contexto da pagina
 */
export function parseLinha(texto, ctx = {}) {
  const original = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (!original) return null;

  const tipo = TIPOS.includes(ctx.tipo) ? ctx.tipo : detectarTipo(original);

  const cotas = extrairCotas(original);
  let corpo = cotas.length ? removerCotas(original, cotas) : original;

  const local = extrairLocalInline(original);
  if (Object.keys(local).length) corpo = removerLocalInline(corpo);

  // marcas de repeticao: // " '' idem
  corpo = corpo.replace(/^(?:\/\/+|\/\/|''|"|idem\b)\s*/i, '').trim();
  const repeticao = corpo !== original && /^(?:\/\/+|\/\/|''|"|idem\b)/i.test(original.trim());

  corpo = tirarPrefixos(corpo);
  const { qtd, unidade, resto } = extrairQuantidade(corpo);

  let nome = canonicalizarNome(resto);
  let herdado = false;

  // ferramenta: o nome e a ferramenta, o resto (a quem, estado) fica no texto
  if (tipo === 'ferramenta') {
    const base = baseDoNome(resto);
    const espec = (resto.match(/[Øø⌀]\s*\d+(?:[.,]\d+)?(?:\s*[x×/]\s*\d+(?:[.,]\d+)?)*/g) || []).join(' ');
    if (base) nome = canonicalizarNome(espec ? `${base} ${espec}` : base);
  }

  if (apenasEspecificacao(nome) && ctx.ultimoNome) {
    const base = baseDoNome(ctx.ultimoNome);
    if (base) {
      const espec = nome.replace(/[^\wØø.,x×/\s]/g, '').trim();
      nome = canonicalizarNome(espec ? `${base} ${espec}` : base);
      herdado = true;
    }
  }

  const familiaDetetada = detectarFamilia(original);
  const familia = familiaDetetada || ctx.familia || '';

  const estado = tipo === 'preciso' ? 'preciso' : tipo === 'tarefa' ? 'pendente' : '';

  return {
    texto: original,
    tipo,
    familia,
    familiaExplicita: Boolean(familiaDetetada),
    nome,
    qtd: qtd === null ? 1 : qtd,
    qtdExplicita: qtd !== null,
    unidade,
    cotas,
    cotaAssunto: cotas.length ? removerCotas(original, cotas) : '',
    local,
    repeticao,
    herdado,
    estado
  };
}
