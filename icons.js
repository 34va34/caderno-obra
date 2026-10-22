// icons.js — ícones em SVG (traço), sem dependências.

const FORMA = {
  hoje: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3h13A1.5 1.5 0 0 1 20 4.5v15A1.5 1.5 0 0 1 18.5 21h-13A1.5 1.5 0 0 1 4 19.5z"/><path d="M8 3v18"/><path d="M12 8h4.5M12 12h4.5"/>',
  preciso: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3h2.2l2.6 12.3a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.3L21.5 7H6"/>',
  gasto: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 12v6"/><path d="m9.5 15 2.5 2.5 2.5-2.5"/>',
  ferramenta: '<path d="M14.6 6.4a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.5-3.5a6 6 0 0 1-7.6 7.6l-6.6 6.6a2.1 2.1 0 0 1-3-3l6.6-6.6a6 6 0 0 1 7.6-7.6z"/>',
  tarefa: '<polyline points="9 12 11.5 14.5 20 6"/><path d="M20.5 12v6.5A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 5 4h9"/>',
  nota: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  medidas: '<path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4z"/><path d="m7.5 10.5 2 2M10.5 7.5l2 2M13.5 4.5l2 2M4.5 13.5l2 2"/>',
  mais: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  mais2: '<path d="M12 5v14M5 12h14"/>',
  fechar: '<path d="M18 6 6 18M6 6l12 12"/>',
  seta: '<path d="m6 9 6 6 6-6"/>',
  setaDireita: '<path d="m9 6 6 6-6 6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  tema: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  lixeira: '<path d="M3 6h18M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6M18.5 6 17.6 19a2 2 0 0 1-2 1.9H8.4a2 2 0 0 1-2-1.9L5.5 6"/>',
  whatsapp: '<path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z"/><path d="M8.7 7.9c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .6.4l.7 1.5c.1.2 0 .4-.1.6l-.5.6c-.1.1-.2.3-.1.5.3.6 1.6 2 2.7 2.4.2.1.4 0 .5-.1l.6-.7c.1-.2.3-.2.5-.1l1.5.7c.2.1.3.2.3.4v.5c0 .5-.4 1.2-1 1.5-.5.3-1.2.4-2 .2-1.6-.4-3.4-1.6-4.6-3.1-1-1.2-1.5-2.3-1.6-3.2-.1-.7.1-1.3.4-1.7z"/>',
  copiar: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/>',
  caixaVazia: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.4 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.1z"/>',
  obra: '<path d="M4 21V6l8-3 8 3v15"/><path d="M4 21h16"/><path d="M9 21v-5h6v5"/><path d="M8 9h2M14 9h2M8 12.5h2M14 12.5h2"/>',
  temaEscuro: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  ordenar: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  lupa: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'
};

/**
 * @param {keyof typeof FORMA} nome
 * @param {{tamanho?:number, classe?:string, preenchido?:boolean}} [opcoes]
 */
export function icone(nome, opcoes = {}) {
  const forma = FORMA[nome] || FORMA.nota;
  const tamanho = opcoes.tamanho || 20;
  const classe = opcoes.classe ? ` class="${opcoes.classe}"` : '';
  const preenchido = opcoes.preenchido;
  return `<svg${classe} width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="${preenchido ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${forma}</svg>`;
}

export const ICONE_TIPO = {
  preciso: icone('preciso'),
  gasto: icone('gasto'),
  ferramenta: icone('ferramenta'),
  tarefa: icone('tarefa'),
  nota: icone('nota')
};
