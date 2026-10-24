// ============================================================================
// EDITOR DE TEXTO FORMATADO (negrito, itálico, sublinhado, listas, imagens…)
// e MENÇÕES com "@" (pessoas, arquivos, datas e tarefas).
// ============================================================================
import { ic, esc, sanitizar, textoPuro, acao, enviarArquivo, toast } from './util.js';

const BOTOES = [
  ['bold', 'negrito', 'Negrito (Ctrl+B)'], ['italic', 'italico', 'Itálico (Ctrl+I)'], ['underline', 'sublinhado', 'Sublinhado (Ctrl+U)'],
  ['strikeThrough', 'tachado', 'Tachado'], '|', ['h3', 'titulo', 'Subtítulo'], ['insertUnorderedList', 'lista', 'Lista'],
  ['insertOrderedList', 'listaNum', 'Lista numerada'], ['blockquote', 'citacao', 'Citação'], '|', ['link', 'link', 'Inserir link'], ['imagem', 'imagem', 'Inserir imagem']
];

export function editorHTML(id, { valor = '', placeholder = 'Escreva aqui…', imagens = true, altura = 140, compacto = false } = {}) {
  const botoes = BOTOES.filter(b => imagens || b === '|' || b[0] !== 'imagem')
    .filter(b => !compacto || b === '|' || ['bold', 'italic', 'underline', 'insertUnorderedList', 'link', 'imagem'].includes(b[0]))
    .map(b => b === '|' ? '<span class="editor-sep"></span>' :
      `<button type="button" class="editor-btn" data-action="editorCmd" data-cmd="${b[0]}" data-alvo="${id}" title="${b[2]}">${ic(b[1])}</button>`).join('');
  return `<div class="editor ${compacto ? 'editor-compacto' : ''}">
    <div class="editor-barra">${botoes}</div>
    <div class="editor-area rich" id="${id}" contenteditable="true" data-placeholder="${esc(placeholder)}" style="min-height:${altura}px">${sanitizar(valor)}</div>
    <input type="file" accept="image/*" id="${id}-arquivo" hidden data-change="editorImagem" data-alvo="${id}">
  </div>`;
}

export function lerEditor(id) {
  const el = document.getElementById(id); if (!el) return '';
  const html = sanitizar(el.innerHTML).replace(/(<br>|\s|&nbsp;)+$/g, '');
  return (textoPuro(html).trim() || /<img/i.test(html)) ? html : '';
}

// mantém a seleção ao clicar na barra
document.addEventListener('mousedown', (e) => { if (e.target.closest('.editor-btn')) e.preventDefault(); });

acao('editorCmd', ({ cmd, alvo }) => {
  const area = document.getElementById(alvo); if (!area) return;
  area.focus();
  if (cmd === 'imagem') { document.getElementById(alvo + '-arquivo').click(); return; }
  if (cmd === 'link') {
    const url = prompt('Endereço do link (https://…)');
    if (url && /^https?:\/\//i.test(url.trim())) document.execCommand('createLink', false, url.trim());
    return;
  }
  if (cmd === 'h3' || cmd === 'blockquote') {
    const atual = document.queryCommandValue('formatBlock').toLowerCase();
    document.execCommand('formatBlock', false, atual === cmd ? 'p' : cmd);
    return;
  }
  document.execCommand(cmd, false, null);
  atualizarBarra();
});

acao('editorImagem', async (d, input) => {
  const file = input.files[0]; input.value = '';
  if (!file) return;
  const area = document.getElementById(d.alvo);
  const marca = 'img-' + Date.now();
  area.focus();
  document.execCommand('insertHTML', false, `<span id="${marca}" class="enviando">Enviando imagem…</span>`);
  try {
    const url = await enviarArquivo(file, 'imagens');
    const ph = document.getElementById(marca);
    if (ph) ph.outerHTML = `<img src="${esc(url)}" alt="">`;
  } catch (e) {
    const ph = document.getElementById(marca); ph && ph.remove();
    toast(e.message, 'erro');
  }
});

function atualizarBarra() {
  const sel = document.getSelection(); if (!sel.rangeCount) return;
  const area = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement)?.closest('.editor-area');
  if (!area) return;
  const barra = area.parentElement.querySelector('.editor-barra');
  barra.querySelectorAll('.editor-btn').forEach(b => {
    const c = b.dataset.cmd;
    let on = false;
    try { on = ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'].includes(c) ? document.queryCommandState(c) : (['h3', 'blockquote'].includes(c) && document.queryCommandValue('formatBlock').toLowerCase() === c); } catch { }
    b.classList.toggle('ativo', !!on);
  });
}
document.addEventListener('selectionchange', atualizarBarra);

// colar: mantém só a formatação permitida
document.addEventListener('paste', (e) => {
  const area = e.target.closest && e.target.closest('[contenteditable="true"]');
  if (!area) return;
  const html = e.clipboardData.getData('text/html');
  const ehRico = area.classList.contains('rich');
  e.preventDefault();
  if (html && ehRico) document.execCommand('insertHTML', false, sanitizar(html));
  else document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
});

// ---------------------------------------------------------- MENÇÕES ----
// fontes() → [{ kind: 'user'|'file'|'date'|'task', id, label, sub }]
const ICONE_KIND = { user: 'usuario', file: 'clipe', date: 'calendario', task: 'tarefa' };
const GRUPO_KIND = { user: 'Pessoas', file: 'Arquivos', date: 'Datas', task: 'Tarefas' };

export function mencaoHTML({ kind, id, label }) {
  return `<span class="mencao mencao-${kind}" data-mention="1" data-kind="${kind}" data-id="${esc(id)}" contenteditable="false">${kind === 'user' ? '@' : ''}${esc(label)}</span>`;
}

export function ativarMencoes(el, fontes) {
  if (!el || el._mencoes) return;
  el._mencoes = true;
  let pop = null, itens = [], idx = 0, ctx = null;

  const fechar = () => { pop && pop.remove(); pop = null; ctx = null; };
  const normal = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function contexto() {
    const sel = document.getSelection();
    if (!sel.rangeCount || !sel.isCollapsed) return null;
    const no = sel.anchorNode;
    if (!no || no.nodeType !== 3 || !el.contains(no)) return null;
    const antes = no.textContent.slice(0, sel.anchorOffset);
    const m = antes.match(/(?:^|\s)@([^\s@]{0,30})$/);
    if (!m) return null;
    return { no, fim: sel.anchorOffset, inicio: sel.anchorOffset - m[1].length - 1, termo: m[1] };
  }

  function desenhar() {
    const termo = normal(ctx.termo);
    itens = fontes(ctx.termo).filter(f => !termo || normal(f.label).includes(termo) || normal(f.sub || '').includes(termo)).slice(0, 12);
    if (!itens.length) { fechar(); return; }
    idx = Math.min(idx, itens.length - 1);
    if (!pop) { pop = document.createElement('div'); pop.className = 'mencao-pop'; document.body.appendChild(pop); }
    let grupo = '';
    pop.innerHTML = itens.map((f, i) => {
      const cab = f.kind !== grupo ? `<div class="mencao-grupo">${GRUPO_KIND[f.kind]}</div>` : '';
      grupo = f.kind;
      return `${cab}<div class="mencao-item ${i === idx ? 'sel' : ''}" data-i="${i}">${ic(ICONE_KIND[f.kind])}<span>${esc(f.label)}</span>${f.sub ? `<small>${esc(f.sub)}</small>` : ''}</div>`;
    }).join('');
    const r = document.getSelection().getRangeAt(0).getBoundingClientRect();
    const base = r.height ? r : el.getBoundingClientRect();
    const alto = Math.min(300, itens.length * 40 + 60);
    const acima = base.bottom + alto > innerHeight;
    pop.style.left = Math.min(base.left, innerWidth - 290) + 'px';
    pop.style.top = (acima ? base.top - alto - 6 : base.bottom + 6) + 'px';
    pop.querySelectorAll('.mencao-item').forEach(n => n.addEventListener('mousedown', (e) => { e.preventDefault(); escolher(Number(n.dataset.i)); }));
  }

  function escolher(i) {
    const f = itens[i]; if (!f || !ctx) return;
    const { no, inicio, fim } = ctx;
    const range = document.createRange();
    range.setStart(no, inicio); range.setEnd(no, fim);
    range.deleteContents();
    const tmp = document.createElement('span'); tmp.innerHTML = mencaoHTML(f);
    const chip = tmp.firstChild;
    range.insertNode(chip);
    const espaco = document.createTextNode(' ');
    chip.after(espaco);
    const sel = document.getSelection(); const r2 = document.createRange();
    r2.setStart(espaco, 1); r2.collapse(true); sel.removeAllRanges(); sel.addRange(r2);
    fechar();
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  el.addEventListener('input', () => { ctx = contexto(); if (ctx) { idx = 0; desenhar(); } else fechar(); });
  el.addEventListener('keydown', (e) => {
    if (!pop) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); idx = (idx + 1) % itens.length; desenhar(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = (idx - 1 + itens.length) % itens.length; desenhar(); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopImmediatePropagation(); escolher(idx); }
    else if (e.key === 'Escape') { e.preventDefault(); fechar(); }
  }, true);
  el.addEventListener('blur', () => setTimeout(fechar, 150));
}

export function mencionados(html, kind = 'user') {
  const d = document.createElement('div'); d.innerHTML = html;
  return [...new Set([...d.querySelectorAll(`[data-kind="${kind}"]`)].map(s => s.dataset.id))];
}
