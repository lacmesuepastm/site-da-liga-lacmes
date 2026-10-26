import { ic, esc, avatar, acao } from './util.js';
import { S } from './store.js';

export const ui = { abertos: {} };

export const vazio = (msg, icone = 'info') => `<div class="vazio">${ic(icone)}<p>${esc(msg)}</p></div>`;

export function cabecalho(titulo, sub = '', acoes = '') {
  return `<div class="pg-cab"><div><h2>${esc(titulo)}</h2>${sub ? `<p class="pg-sub">${sub}</p>` : ''}</div>${acoes ? `<div class="pg-acoes">${acoes}</div>` : ''}</div>`;
}

export function btn(rotulo, action, { icone, classe = '', dados = {}, titulo = '' } = {}) {
  const attrs = Object.entries(dados).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
  return `<button type="button" class="btn ${classe}" data-action="${action}" ${attrs} ${titulo ? `title="${esc(titulo)}"` : ''}>${icone ? ic(icone) : ''}${rotulo ? `<span>${esc(rotulo)}</span>` : ''}</button>`;
}
export function btnIc(icone, action, dados = {}, titulo = '', classe = '') {
  const attrs = Object.entries(dados).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
  return `<button type="button" class="btn-ic ${classe}" data-action="${action}" ${attrs} title="${esc(titulo)}" aria-label="${esc(titulo)}">${ic(icone)}</button>`;
}

export function colapsavel(id, titulo, corpo, { padrao = true, extra = '', icone = '' } = {}) {
  const aberto = ui.abertos[id] ?? padrao;
  return `<section class="colap ${aberto ? 'aberto' : ''}" data-colap="${esc(id)}">
    <button type="button" class="colap-cab" data-action="alternarColap" data-id="${esc(id)}">
      ${icone ? ic(icone) : ''}<span class="colap-titulo">${titulo}</span>${extra}<span class="colap-seta">${ic('baixo')}</span>
    </button>
    <div class="colap-corpo"><div class="colap-interno">${corpo}</div></div>
  </section>`;
}
acao('alternarColap', ({ id }, el) => {
  const sec = el.closest('.colap');
  const aberto = !sec.classList.contains('aberto');
  sec.classList.toggle('aberto', aberto);
  ui.abertos[id] = aberto;
});

export function abas(lista, ativa, action, dados = {}) {
  const attrs = Object.entries(dados).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
  return `<div class="abas" role="tablist">${lista.map(a => `<button type="button" role="tab" class="aba ${a.id === ativa ? 'ativa' : ''}" data-action="${action}" data-aba="${a.id}" ${attrs}>${a.icone ? ic(a.icone) : ''}<span>${esc(a.nome)}</span>${a.badge ? `<span class="aba-badge">${a.badge}</span>` : ''}</button>`).join('')}</div>`;
}

export function seletorPessoas(nome, uids, selecionados = [], { todosOpcao = false } = {}) {
  const sel = new Set(selecionados);
  const linhas = uids.map(uid => {
    const u = S.usuarios[uid]; if (!u) return '';
    return `<label class="pessoa-opcao" data-busca="${esc((u.nome + ' ' + (u.email || '')).toLowerCase())}">
      <input type="checkbox" name="${nome}" value="${uid}" ${sel.has(uid) ? 'checked' : ''}>
      ${avatar(u, 28)}<span class="po-nome">${esc(u.nome)}<small>${esc(u.cargo || u.email || '')}</small></span>${ic('check', 'po-check')}
    </label>`;
  }).join('');
  return `<div class="seletor-pessoas">
    <div class="sp-topo"><span class="campo-busca">${ic('busca')}<input type="search" placeholder="Buscar pessoa…" data-input="filtrarPessoas"></span>
    ${todosOpcao ? `<label class="chk"><input type="checkbox" data-change="marcarTodasPessoas" data-nome="${nome}"> Todos</label>` : ''}</div>
    <div class="sp-lista">${linhas || '<p class="mudo">Ninguém disponível.</p>'}</div></div>`;
}
acao('filtrarPessoas', (d, el) => {
  const q = el.value.toLowerCase();
  el.closest('.seletor-pessoas').querySelectorAll('.pessoa-opcao').forEach(l => { l.style.display = l.dataset.busca.includes(q) ? '' : 'none'; });
});
acao('marcarTodasPessoas', ({ nome }, el) => { document.querySelectorAll(`input[name="${nome}"]`).forEach(c => { if (c.closest('.pessoa-opcao').style.display !== 'none') c.checked = el.checked; }); });

export function faseTracker(op) {
  return `<div class="fases">${op.fases.map((f, i) => `<div class="fase ${i < op.faseAtual ? 'feita' : ''} ${i === op.faseAtual ? 'atual' : ''}"><span class="fase-ponto">${i < op.faseAtual ? ic('check') : ''}</span><span class="fase-nome">${esc(f)}</span></div>`).join('')}</div>`;
}
export function faseBadge(op) {
  const fim = op.faseAtual >= op.fases.length - 1;
  return `<span class="status ${fim ? 'status-fim' : 'status-and'}">${ic(fim ? 'concluido' : 'andamento')}${esc(op.fases[op.faseAtual])}</span>`;
}

export const meta = (icone, texto) => texto ? `<span class="meta-item">${ic(icone)}${texto}</span>` : '';
export const campo = (rotulo, html, dica = '') => `<div class="campo"><label>${esc(rotulo)}</label>${html}${dica ? `<small class="dica">${dica}</small>` : ''}</div>`;
export const linhaCampos = (...cols) => `<div class="linha-campos">${cols.join('')}</div>`;
export const chk = (id, rotulo, marcado = false, extra = '') => `<label class="chk"><input type="checkbox" id="${id}" ${marcado ? 'checked' : ''} ${extra}><span>${esc(rotulo)}</span></label>`;
