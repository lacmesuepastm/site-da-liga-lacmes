import { Data } from './data.js';
import { WORKER_URL } from './config.js';

const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  forum: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  caso: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M8 13h2l1.2-2.5 1.8 5 1.2-2.5H16"/>',
  pasta: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"/>',
  maleta: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12.5h18"/>',
  ticket: '<path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z"/><path d="m9.5 12 1.7 1.7L14.5 10"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M16 3v4M8 3v4M3.5 10h17"/>',
  certificado: '<circle cx="12" cy="9" r="5.5"/><path d="M8.8 13.5 7.5 21l4.5-2.5 4.5 2.5-1.3-7.5"/>',
  livro: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2.5H20v19H6.5A2.5 2.5 0 0 1 4 19V5a2.5 2.5 0 0 1 2.5-2.5z"/>',
  carteira: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1"/>',
  ata: '<path d="M6 2.5h8.5L19 7v14.5H6z"/><path d="M14 2.5V7h5M9 12.5h7M9 16.5h7"/>',
  painel: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  usuarios: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2"/><circle cx="17.5" cy="9" r="2.4"/><path d="M16.5 14.1c2.8.3 5 2.4 5 5.4"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5c0-4.2 3.6-7.2 8-7.2s8 3 8 7.2"/>',
  sair: '<path d="M12 2.5v9"/><path d="M18.4 6.6a8 8 0 1 1-12.8 0"/>',
  sino: '<path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2H4.5z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  lapis: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  lixeira: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  baixo: '<path d="m6 9 6 6 6-6"/>',
  esq: '<path d="m15 6-6 6 6 6"/>',
  dir: '<path d="m9 6 6 6-6 6"/>',
  imagem: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9.5" r="1.8"/><path d="m21 16-5-5L5 20"/>',
  link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>',
  negrito: '<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>',
  italico: '<path d="M10 5h8M6 19h8M14.5 5l-5 14"/>',
  sublinhado: '<path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14"/>',
  tachado: '<path d="M5 12h14M16 7.5C15.4 5.5 13.8 4.5 12 4.5c-2.5 0-4 1.4-4 3.2M8 16.5c.6 2 2.2 3 4 3 2.5 0 4-1.4 4-3.2"/>',
  lista: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".9"/><circle cx="4.5" cy="12" r=".9"/><circle cx="4.5" cy="18" r=".9"/>',
  listaNum: '<path d="M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M3.8 13.5c.3-.9 2.7-1 2.7.4 0 1-2.7 1.8-2.7 3.1h2.8"/>',
  citacao: '<path d="M7 17c-2 0-3-1.5-3-3.5C4 10 6 8 8.5 7M17 17c-2 0-3-1.5-3-3.5 0-3.5 2-5.5 4.5-6.5"/>',
  titulo: '<path d="M5 5v14M14 5v14M5 12h9M18 10l2-1v10"/>',
  enquete: '<path d="M4 20h16"/><rect x="5" y="11" width="3.5" height="6" rx=".8"/><rect x="10.25" y="6" width="3.5" height="11" rx=".8"/><rect x="15.5" y="13" width="3.5" height="4" rx=".8"/>',
  comentario: '<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/>',
  coracao: '<path d="M20.5 5.7a5 5 0 0 0-7.1 0L12 7.1l-1.4-1.4a5 5 0 0 0-7.1 7.1L12 21.3l8.5-8.5a5 5 0 0 0 0-7.1z"/>',
  responder: '<path d="M10 8 4 13l6 5"/><path d="M4 13h10a6 6 0 0 1 6 6"/>',
  pin: '<path d="M9 3h6l-1 6 4 4H6l4-4z"/><path d="M12 13v8"/>',
  arroba: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a2.5 2.5 0 0 0 5 0v-1a9 9 0 1 0-3.5 7.1"/>',
  clipe: '<path d="m20 11.5-8.2 8.2a5 5 0 0 1-7.1-7.1L13 4.4a3.4 3.4 0 0 1 4.8 4.8l-8.2 8.2a1.7 1.7 0 0 1-2.4-2.4l7.5-7.5"/>',
  enviar: '<path d="M21 3 10.5 13.5"/><path d="M21 3 14.5 21l-4-7.5L3 9.5z"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  local: '<path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  baixar: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  subir: '<path d="M12 20V9M7 13.5l5-5 5 5M5 4h14"/>',
  olho: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  olhoFechado: '<path d="M3 3l18 18M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3 3.6M6.5 7.5A16 16 0 0 0 2.5 12S6 18 12 18c1.6 0 3-.4 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  cadeado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  pontos: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  busca: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
  lupa: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/><path d="M8.5 11h5M11 8.5v5"/>',
  extensao: '<circle cx="8" cy="9" r="3"/><path d="M2.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6"/><path d="M14 4.5h6.5V10H17l-2.5 2V4.5z"/>',
  artigo: '<path d="M6 2.5h8.5L19 7v14.5H6z"/><path d="M14 2.5V7h5M9 13h7M9 17h7M9 9h2"/>',
  resumo: '<path d="M4.5 3.5h12l3 3v14h-15z"/><path d="M8 9h7M8 12.5h7M8 16h4"/>',
  escudo: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  caneta: '<path d="M3 21c3-1 5-1 7 0s4 1 7 0"/><path d="M14.5 4.5 19.5 9.5 10 19l-5.5 1 1-5.5z"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  tarde: '<path d="M3 18h18M6 18a6 6 0 0 1 12 0"/><path d="M12 6.5v2M5.3 10.3l1.4 1.4M18.7 10.3l-1.4 1.4M3 14.5h1.5M19.5 14.5H21"/>',
  lua: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  lampada: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2V18h5v-2c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
  filtro: '<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>',
  instalar: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7v7M9 11l3 3 3-3M10.5 18.5h3"/>',
  alerta: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  tarefa: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  reuniao: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10.5 5-3v9l-5-3"/>',
  coleta: '<rect x="5" y="3.5" width="14" height="18" rx="2"/><path d="M9 3.5h6v3H9zM8.5 11h7M8.5 14.5h7M8.5 18h4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  andamento: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  concluido: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  vagas: '<circle cx="9" cy="8" r="3"/><path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6"/><path d="M18 8v6M15 11h6"/>',
  copiar: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  enviarDoc: '<path d="M6 2.5h8.5L19 7v14.5H6z"/><path d="M12 18v-6M9.5 14.5 12 12l2.5 2.5"/>',
  voltar: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  estrela: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  plano: '<rect x="4" y="4.5" width="16" height="16" rx="2"/><path d="M8 2.5v4M16 2.5v4M4 10h16M8 14h3M8 17h6"/>',
  cadeadoAberto: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 7.5-2"/>',
  grade: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/>'
};
export function ic(nome, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[nome] || P.info}</svg>`;
}
export const ICONES = P;

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const TAGS_OK = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'P', 'BR', 'DIV', 'SPAN', 'UL', 'OL', 'LI', 'A', 'IMG', 'H3', 'H4', 'BLOCKQUOTE', 'CODE', 'PRE', 'MARK', 'SUB', 'SUP', 'HR']);
const ATTRS_OK = { A: ['href'], IMG: ['src', 'alt'], SPAN: ['data-mention', 'data-kind', 'data-id', 'class'] };
const urlSegura = (u, img) => /^(https?:|mailto:|#)/i.test(u) || (img && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(u));

export function sanitizar(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const limpar = (no) => {
    [...no.childNodes].forEach(filho => {
      if (filho.nodeType === 3) return;
      if (filho.nodeType !== 1) { filho.remove(); return; }
      const tag = filho.tagName;
      if (!TAGS_OK.has(tag)) {
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'svg', 'SVG'].includes(tag)) { filho.remove(); return; }
        limpar(filho); filho.replaceWith(...filho.childNodes); return;
      }
      [...filho.attributes].forEach(at => {
        const ok = (ATTRS_OK[tag] || []).includes(at.name);
        if (!ok) filho.removeAttribute(at.name);
        else if ((at.name === 'href' || at.name === 'src') && !urlSegura(at.value, tag === 'IMG')) filho.removeAttribute(at.name);
      });
      if (tag === 'A') { filho.setAttribute('target', '_blank'); filho.setAttribute('rel', 'noopener noreferrer'); }
      if (tag === 'IMG') filho.setAttribute('loading', 'lazy');
      limpar(filho);
    });
  };
  const raiz = doc.body.firstChild;
  limpar(raiz);
  return raiz.innerHTML;
}
export const textoPuro = (html) => { const d = document.createElement('div'); d.innerHTML = sanitizar(html); return d.textContent || ''; };
export const iniciais = (nome) => (nome || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
export function avatar(u, tam = 32) {
  if (u && u.foto) return `<img class="avatar" src="${esc(u.foto)}" alt="" style="width:${tam}px;height:${tam}px">`;
  return `<span class="avatar avatar-txt" style="width:${tam}px;height:${tam}px;font-size:${Math.round(tam * 0.38)}px">${esc(iniciais(u && u.nome))}</span>`;
}

const pad = (n) => String(n).padStart(2, '0');
export const isoDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hojeISO = () => isoDe(new Date());
export function dataDeISO(iso) { if (!iso) return null; const [a, m, d] = iso.split('-').map(Number); const r = new Date(a, m - 1, d); return isNaN(r) ? null : r; }
export const isoParaBR = (iso) => { if (!iso) return ''; const [a, m, d] = iso.split('-'); return `${d}/${m}/${a}`; };
export const brParaISO = (br) => { if (!br || !br.includes('/')) return br || ''; const [d, m, a] = br.split('/'); return `${a}-${pad(m)}-${pad(d)}`; };
export function somarDias(iso, n) { const d = dataDeISO(iso); d.setDate(d.getDate() + n); return isoDe(d); }
export function inicioSemana(iso) { const d = dataDeISO(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoDe(d); }
export const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export function dataExtensa(iso) { const d = dataDeISO(iso); if (!d) return ''; return `${DIAS_CURTOS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()}`; }
export function fmtDataHora(ms) { if (!ms) return ''; const d = new Date(ms); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
export function tempoRelativo(ms) {
  if (!ms) return '';
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 7) return `há ${Math.floor(s / 86400)} d`;
  return fmtDataHora(ms).slice(0, 10);
}
export function horasEntre(ini, fim) {
  if (!ini || !fim) return 0;
  const [h1, m1] = ini.split(':').map(Number), [h2, m2] = fim.split(':').map(Number);
  let min = (h2 * 60 + m2) - (h1 * 60 + m1); if (min < 0) min += 1440;
  return Math.round(min / 60 * 100) / 100;
}
export function periodoDe(hora) {
  if (!hora) return 'dia';
  const h = Number(hora.split(':')[0]);
  return h < 12 ? 'manha' : (h < 18 ? 'tarde' : 'noite');
}

const acoes = {};
export function acao(nome, fn) { acoes[nome] = fn; }
export function acoesMultiplas(mapa) { Object.assign(acoes, mapa); }
function despachar(tipo) {
  return (ev) => {
    const el = ev.target.closest(`[data-${tipo}]`);
    if (!el) return;
    const nome = el.dataset[tipo];
    const fn = acoes[nome];
    if (!fn) { console.warn('Ação não registrada:', nome); return; }
    if (tipo === 'action' && (el.tagName === 'A' && el.getAttribute('href') === '#')) ev.preventDefault();
    if (tipo === 'submit') ev.preventDefault();
    if (tipo === 'action') ev.stopPropagation();
    fn(el.dataset, el, ev);
  };
}
document.addEventListener('click', despachar('action'));
document.addEventListener('change', despachar('change'));
document.addEventListener('input', despachar('input'));
document.addEventListener('submit', despachar('submit'));

export function toast(msg, tipo = 'info', ms = 3200) {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.innerHTML = `${ic(tipo === 'erro' ? 'alerta' : (tipo === 'ok' ? 'concluido' : 'info'))}<span>${esc(msg)}</span>`;
  box.appendChild(t);
  setTimeout(() => { t.classList.add('saindo'); setTimeout(() => t.remove(), 300); }, ms);
}

let modalAtual = null;
export function abrirModal({ titulo, corpo, largura = 520, aoFechar } = {}) {
  fecharModal(true);
  const ov = document.createElement('div');
  ov.className = 'modal-ov';
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" style="max-width:${largura}px">
    <div class="modal-cab"><h4>${esc(titulo)}</h4><button class="btn-ic" data-action="fecharModal" aria-label="Fechar">${ic('x')}</button></div>
    <div class="modal-corpo">${corpo}</div></div>`;
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) fecharModal(); });
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('aberto'));
  modalAtual = { ov, aoFechar };
  const primeiro = ov.querySelector('input:not([type=hidden]):not([type=checkbox]), textarea, [contenteditable]');
  primeiro && setTimeout(() => primeiro.focus(), 60);
  return ov.querySelector('.modal-corpo');
}
export function fecharModal(imediato) {
  if (!modalAtual) return;
  const { ov, aoFechar } = modalAtual; modalAtual = null;
  aoFechar && aoFechar();
  if (imediato === true) { ov.remove(); return; }
  ov.classList.remove('aberto'); setTimeout(() => ov.remove(), 220);
}
export const modalAberto = () => !!modalAtual;
acao('fecharModal', () => fecharModal());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalAtual) fecharModal(); });

export function confirmar(msg, { ok = 'Confirmar', perigo = false } = {}) {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'modal-ov aberto-sobre';
    ov.innerHTML = `<div class="modal modal-confirm"><div class="modal-corpo"><p>${esc(msg)}</p>
      <div class="acoes-form"><button class="btn" data-r="0">Cancelar</button><button class="btn ${perigo ? 'btn-perigo' : 'btn-pri'}" data-r="1">${esc(ok)}</button></div></div></div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('aberto'));
    ov.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (b || e.target === ov) { e.stopPropagation(); ov.classList.remove('aberto'); setTimeout(() => ov.remove(), 200); resolve(!!b && b.dataset.r === '1'); }
    });
  });
}

export const val = (id) => { const el = document.getElementById(id); return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : ''; };
export const marcados = (sel) => [...document.querySelectorAll(sel)].filter(e => e.checked).map(e => e.value);
export const opcoes = (lista, sel) => lista.map(o => { const v = typeof o === 'string' ? o : o.v; const t = typeof o === 'string' ? o : o.t; return `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(t)}</option>`; }).join('');
export const novoId = (pref = '') => pref + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export async function chamarWorker(rota, corpo) {
  if (!WORKER_URL) return null;
  const token = await Data.auth.token();
  const r = await fetch(WORKER_URL.replace(/\/$/, '') + rota, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(corpo)
  });
  if (!r.ok) throw new Error(`Worker ${rota}: ${r.status}`);
  return r.json();
}

export function comprimirImagem(file, max = 1400, qualidade = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const fator = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * fator); c.height = Math.round(img.height * fator);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? resolve(b) : reject(new Error('Falha ao comprimir')), 'image/jpeg', qualidade);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')); };
    img.src = url;
  });
}
export const blobParaDataURL = (b) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });

export async function enviarArquivo(file, pasta = 'geral', { imagemMax = 1400 } = {}) {
  const ehImagem = /^image\//.test(file.type);
  let corpo = file;
  if (ehImagem && file.type !== 'image/gif') corpo = await comprimirImagem(file, imagemMax);
  if (WORKER_URL) {
    const token = await Data.auth.token();
    const fd = new FormData();
    fd.append('arquivo', corpo, file.name.replace(/\.(png|webp|heic)$/i, '.jpg'));
    fd.append('pasta', pasta);
    const r = await fetch(WORKER_URL.replace(/\/$/, '') + '/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    if (!r.ok) throw new Error('Falha no upload (' + r.status + ')');
    return (await r.json()).url;
  }
  if (ehImagem) {
    const b = corpo.size > 220000 ? await comprimirImagem(file, Math.min(imagemMax, 900), 0.72) : corpo;
    return blobParaDataURL(b);
  }
  if (file.size > 700000) throw new Error('Arquivo grande demais sem o Worker configurado (máx. 700 KB). Use um link do Drive.');
  return blobParaDataURL(file);
}

export const rerender = () => window.dispatchEvent(new Event('lacmes-render'));
export function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
export function baixarBlob(blob, nome) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
