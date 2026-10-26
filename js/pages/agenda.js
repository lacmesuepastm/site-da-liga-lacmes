import { Data } from '../data.js';
import { S } from '../store.js';
import { ic, esc, acao, abrirModal, fecharModal, confirmar, toast, val, opcoes, hojeISO, somarDias, inicioSemana, dataDeISO, isoDe, isoParaBR, dataExtensa, DIAS_CURTOS, MESES, periodoDe, rerender, debounce } from '../util.js';
import { cabecalho, vazio, btn, btnIc, campo, linhaCampos, chk } from '../ui.js';
import { podeGerirPublicado, lerPublicado, botoesGestao } from '../eventos.js';

const CAT_EVENTO = {
  'Aula da Liga': { cor: '#4c51bf', icone: 'livro' }, 'Aula ou Estágio Regular': { cor: '#0987a0', icone: 'maleta' },
  'Prova': { cor: '#b23b3b', icone: 'alerta' }, 'Estudo': { cor: '#2f855a', icone: 'lampada' },
  'Criação': { cor: '#b83280', icone: 'caneta' }, 'Outros': { cor: '#4a5568', icone: 'calendario' }
};
const SUB_REGULAR = ['Tutoria', 'Morfofuncional', 'Habilidades Profissionais', 'GIESC', 'Internato', 'Outros'];
const PERIODOS = [
  { id: 'manha', nome: 'Manhã', icone: 'sol', faixa: 'até 12h', hora: '08:00' },
  { id: 'tarde', nome: 'Tarde', icone: 'tarde', faixa: '12h–18h', hora: '14:00' },
  { id: 'noite', nome: 'Noite', icone: 'lua', faixa: 'após 18h', hora: '19:00' }
];
const estado = { visao: 'semana', base: null };

export function compromissos(ini, fim) {
  const r = [], uid = S.uid;
  const dentro = (d) => d && d >= ini && d <= fim;
  S.aulas.forEach(a => { if (!a.cancelada && (a.seguidores || []).includes(uid) && dentro(a.data)) r.push({ tipo: 'Aula', cor: '#6b46c1', icone: 'livro', titulo: a.titulo, data: a.data, hora: a.hora, local: a.local, url: '#/aulas', dest: 'aula', pubId: a.id }); });
  S.eventosLiga.forEach(e => {
    const part = e.participantes || [];
    if (!e.cancelada && (!part.length || part.includes(uid)) && dentro(e.data)) r.push({ tipo: e.categoria || 'Evento', cor: e.categoria === 'Reunião' ? '#0d9488' : '#AB9748', icone: e.categoria === 'Reunião' ? 'reuniao' : 'estrela', titulo: e.titulo, data: e.data, hora: e.hora, horaFim: e.horaFim, local: e.local || (e.link ? 'Online' : ''), link: e.link, url: '', dest: 'evento', pubId: e.id });
  });
  Object.values(S.oportunidades).forEach(o => {
    if (o.tipo === 'Estágio' && !o.cancelada && (o.confirmados || []).includes(uid) && dentro(o.data)) r.push({ tipo: 'Estágio', cor: '#b7791f', icone: 'maleta', titulo: o.titulo, data: o.data, hora: o.horaInicio, horaFim: o.horaFim, local: o.local, url: '#/inscricoes', extra: o.orientacoes, dest: 'oportunidade', pubId: o.id });
  });
  Object.values(S.projetos).forEach(p => {
    if (!(p.membroIds || []).includes(uid)) return;
    Object.entries(p.escala || {}).forEach(([d, e]) => { if ((e.equipe || []).includes(uid) && dentro(d)) r.push({ tipo: 'Escala', cor: '#163A5C', icone: 'calendario', titulo: p.titulo, data: d, hora: e.hora, local: e.local, url: `#/projetos/${p.id}/escala` }); });
    (p.reunioes || []).forEach(x => { if (!x.concluida && dentro(x.data)) r.push({ tipo: 'Reunião', cor: '#0d9488', icone: 'reuniao', titulo: `${x.titulo} — ${p.titulo}`, data: x.data, hora: x.hora, local: x.tipo === 'Online' ? 'Online' : x.local, link: x.link, url: `#/projetos/${p.id}/reunioes` }); });
    (p.tarefas || []).forEach(t => { if (!t.concluida && t.prazo && (t.resp || []).includes(uid) && dentro(t.prazo)) r.push({ tipo: 'Prazo', cor: '#c05621', icone: 'tarefa', titulo: `${t.titulo} — ${p.titulo}`, data: t.prazo, hora: '', url: `#/projetos/${p.id}/tarefas` }); });
  });
  S.eventos.forEach(ev => {
    const cat = CAT_EVENTO[ev.categoria] || CAT_EVENTO.Outros;
    const base = { tipo: ev.subcategoria || ev.categoria, cor: cat.cor, icone: cat.icone, titulo: ev.titulo, hora: ev.horaInicio, horaFim: ev.horaFim, local: ev.local || '', eventoId: ev.id, url: ev.projetoId ? `#/projetos/${ev.projetoId}/chat` : '' };
    if (ev.repetir === 'semanal') {
      let d = ev.data; const ate = ev.ate || somarDias(ev.data, 7 * 26);
      while (d <= fim && d <= ate) { if (dentro(d)) r.push({ ...base, data: d, repetido: true }); d = somarDias(d, 7); }
    } else if (dentro(ev.data)) r.push({ ...base, data: ev.data });
  });
  return r.sort((a, b) => (a.data + (a.hora || '00:00')).localeCompare(b.data + (b.hora || '00:00')));
}

const chipItem = (c, i) => `<button class="ag-item" style="--c:${c.cor}" data-action="verCompromisso" data-k="${i}">
  <span class="ag-hora">${esc(c.hora || 'dia todo')}</span><span class="ag-tit">${esc(c.titulo)}</span>${c.local ? `<span class="ag-local">${esc(c.local)}</span>` : ''}</button>`;
let cacheItens = [];

function semana(baseIso, mobile) {
  const ini = inicioSemana(baseIso), fim = somarDias(ini, 6);
  const itens = compromissos(ini, fim); cacheItens = itens;
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(ini, i));
  const doDia = (d, per) => itens.map((c, i) => [c, i]).filter(([c]) => c.data === d && periodoDe(c.hora) === per);
  const temDiaTodo = itens.some(c => !c.hora);
  const hoje = hojeISO();
  if (mobile) {
    return `<div class="ag-dias">${dias.map(d => {
      const vazioDia = !itens.some(c => c.data === d);
      return `<div class="ag-dia-card ${d === hoje ? 'hoje' : ''}"><div class="ag-dia-cab"><b>${DIAS_CURTOS[dataDeISO(d).getDay()]}</b><span>${isoParaBR(d).slice(0, 5)}</span>${btnIc('mais', 'novoEvento', { data: d }, 'Novo compromisso', 'mini')}</div>
        ${vazioDia ? '<p class="mudo pequeno">Livre</p>' : [...(temDiaTodo ? [{ id: 'dia', nome: 'Dia todo', icone: 'calendario' }] : []), ...PERIODOS].map(p => { const l = doDia(d, p.id); return l.length ? `<div class="ag-per-mobile"><span class="ag-per-rot">${ic(p.icone)}${p.nome}</span>${l.map(([c, i]) => chipItem(c, i)).join('')}</div>` : ''; }).join('')}</div>`;
    }).join('')}</div>`;
  }
  const linhas = [...(temDiaTodo ? [{ id: 'dia', nome: 'Dia todo', icone: 'calendario', faixa: 'prazos', hora: '' }] : []), ...PERIODOS];
  return `<div class="ag-grade" style="--linhas:${linhas.length}">
    <div class="ag-canto"></div>
    ${dias.map(d => `<div class="ag-cab ${d === hoje ? 'hoje' : ''}"><span>${DIAS_CURTOS[dataDeISO(d).getDay()]}</span><b>${dataDeISO(d).getDate()}</b></div>`).join('')}
    ${linhas.map(p => `<div class="ag-rot">${ic(p.icone)}<span>${p.nome}</span><small>${p.faixa}</small></div>
      ${dias.map(d => `<div class="ag-cel ${d === hoje ? 'hoje' : ''} ${p.id === 'dia' ? 'ag-cel-dia' : ''}" data-action="celulaAgenda" data-data="${d}" data-hora="${p.hora}">${doDia(d, p.id).map(([c, i]) => chipItem(c, i)).join('')}</div>`).join('')}`).join('')}
  </div>`;
}

function mes(baseIso) {
  const b = dataDeISO(baseIso); const ano = b.getFullYear(), m = b.getMonth();
  const ini = isoDe(new Date(ano, m, 1)), fim = isoDe(new Date(ano, m + 1, 0));
  const itens = compromissos(ini, fim); cacheItens = itens;
  const vazios = (new Date(ano, m, 1).getDay() + 6) % 7, nd = new Date(ano, m + 1, 0).getDate();
  let g = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => `<div class="cal-cab">${d}</div>`).join('') + '<div class="cal-vazio"></div>'.repeat(vazios);
  for (let d = 1; d <= nd; d++) {
    const iso = isoDe(new Date(ano, m, d)); const l = itens.map((c, i) => [c, i]).filter(([c]) => c.data === iso);
    const pontos = PERIODOS.map(p => l.some(([c]) => periodoDe(c.hora) === p.id) ? `<i class="pp pp-${p.id}" title="${p.nome}"></i>` : '').join('');
    g += `<button class="cal-dia ${iso === hojeISO() ? 'hoje' : ''} ${l.length ? 'tem' : ''}" data-action="irDia" data-data="${iso}"><span class="cal-num">${d}</span>
      <span class="cal-itens">${l.slice(0, 3).map(([c]) => `<i style="--c:${c.cor}">${esc(c.titulo)}</i>`).join('')}${l.length > 3 ? `<i class="mais">+${l.length - 3}</i>` : ''}</span><span class="cal-pp">${pontos}</span></button>`;
  }
  return `<div class="cal cal-agenda">${g}</div>`;
}

function listaProx() {
  const ini = hojeISO(), fim = somarDias(ini, 45);
  const itens = compromissos(ini, fim); cacheItens = itens;
  if (!itens.length) return vazio('Nada agendado para as próximas semanas.', 'calendario');
  let atual = '';
  return `<div class="ag-lista">${itens.map((c, i) => { const cab = c.data !== atual ? `<h5 class="ag-lista-dia">${c.data === ini ? 'Hoje' : (c.data === somarDias(ini, 1) ? 'Amanhã' : dataExtensa(c.data))}</h5>` : ''; atual = c.data; return cab + chipItem(c, i); }).join('')}</div>`;
}

function render(params) {
  if (params[0] && dataDeISO(params[0])) estado.base = params[0];
  const base = estado.base || hojeISO();
  const mobile = matchMedia('(max-width: 760px)').matches;
  let rotulo;
  if (estado.visao === 'semana') { const ini = inicioSemana(base); rotulo = `${isoParaBR(ini).slice(0, 5)} – ${isoParaBR(somarDias(ini, 6))}`; }
  else if (estado.visao === 'mes') { const d = dataDeISO(base); rotulo = `${MESES[d.getMonth()]} ${d.getFullYear()}`; }
  else rotulo = 'Próximas semanas';
  const corpo = estado.visao === 'semana' ? semana(base, mobile) : (estado.visao === 'mes' ? mes(base) : listaProx());
  return `${cabecalho('Agenda', 'Aulas que você acompanha, estágios confirmados, escalas, reuniões, prazos e seus compromissos.', btn('Novo compromisso', 'novoEvento', { icone: 'mais', classe: 'btn-pri' }))}
    <div class="ag-barra">
      <div class="seg">${[['semana', 'Semana'], ['mes', 'Mês'], ['lista', 'Lista']].map(([v, n]) => `<button class="seg-btn ${estado.visao === v ? 'ativo' : ''}" data-action="visaoAgenda" data-v="${v}">${n}</button>`).join('')}</div>
      ${estado.visao !== 'lista' ? `<div class="nav-mes">${btnIc('esq', 'navAgenda', { d: -1 }, 'Anterior')}<button class="link" data-action="hojeAgenda">${esc(rotulo)}</button>${btnIc('dir', 'navAgenda', { d: 1 }, 'Próximo')}</div>` : ''}
      <div class="ag-legenda">${PERIODOS.map(p => `<span>${ic(p.icone)}${p.nome} <small>${p.faixa}</small></span>`).join('')}</div>
    </div>
    <div class="ag-corpo">${corpo}</div>`;
}

acao('visaoAgenda', ({ v }) => { estado.visao = v; rerender(); });
acao('navAgenda', ({ d }) => { const b = estado.base || hojeISO(); if (estado.visao === 'semana') estado.base = somarDias(b, 7 * Number(d)); else { const x = dataDeISO(b); x.setDate(1); x.setMonth(x.getMonth() + Number(d)); estado.base = isoDe(x); } if (location.hash !== '#/agenda') location.hash = '#/agenda'; else rerender(); });
acao('hojeAgenda', () => { estado.base = hojeISO(); location.hash = '#/agenda'; rerender(); });
acao('irDia', ({ data }) => { estado.base = data; estado.visao = 'semana'; rerender(); });
acao('celulaAgenda', ({ data, hora }, el, ev) => { if (ev.target.closest('.ag-item')) return; abrirFormEvento({ data, horaInicio: hora }); });
acao('novoEvento', ({ data }) => abrirFormEvento({ data: data || estado.base || hojeISO() }));
acao('verCompromisso', ({ k }) => {
  const c = cacheItens[Number(k)]; if (!c) return;
  abrirModal({ titulo: c.titulo, largura: 440, corpo: `<div class="det-comp" style="--c:${c.cor}"><span class="tag-linha" style="--tc:${c.cor}">${ic(c.icone)}${esc(c.tipo)}</span>
    <div class="meta">${`<span class="meta-item">${ic('calendario')}${dataExtensa(c.data)}</span>`}${c.hora ? `<span class="meta-item">${ic('relogio')}${esc(c.hora)}${c.horaFim ? '–' + esc(c.horaFim) : ''}</span>` : ''}${c.local ? `<span class="meta-item">${ic('local')}${esc(c.local)}</span>` : ''}</div>
    ${c.extra ? `<div class="aviso-ok">${ic('info')}<p>${esc(c.extra)}</p></div>` : ''}${c.repetido ? '<p class="mudo pequeno">Repete toda semana.</p>' : ''}
    <div class="acoes-form">${c.dest && podeGerirPublicado(c.dest, lerPublicado(c.dest, c.pubId)) ? botoesGestao(c.dest, c.pubId, false, '') : ''}${c.eventoId ? btn('Excluir', 'apagarEvento', { classe: 'btn-perigo-txt', icone: 'lixeira', dados: { id: c.eventoId } }) + btn('Editar', 'editarEvento', { icone: 'lapis', dados: { id: c.eventoId } }) : ''}
      ${c.link ? `<a class="btn" href="${esc(c.link)}" target="_blank" rel="noopener">${ic('reuniao')}Entrar</a>` : ''}${c.url ? `<a class="btn btn-pri" href="${c.url}" data-action="fecharModal">Abrir ${ic('dir')}</a>` : ''}</div></div>` });
});

function abrirFormEvento(ev = {}) {
  const projs = Object.values(S.projetos).filter(p => (p.membroIds || []).includes(S.uid));
  abrirModal({ titulo: ev.id ? 'Editar compromisso' : 'Novo compromisso', largura: 520, corpo: `
    ${campo('Título', `<input id="ev-titulo" value="${esc(ev.titulo || '')}">`)}
    ${linhaCampos(campo('Data', `<input type="date" id="ev-data" value="${esc(ev.data || hojeISO())}">`), campo('Início', `<input type="time" id="ev-ini" value="${esc(ev.horaInicio || '')}">`), campo('Fim', `<input type="time" id="ev-fim" value="${esc(ev.horaFim || '')}">`))}
    <p class="dica">Sem horário, o compromisso vai para a linha "Dia todo". O período (manhã/tarde/noite) é definido pelo horário de início.</p>
    ${linhaCampos(campo('Categoria', `<select id="ev-cat" data-change="evCat">${opcoes(Object.keys(CAT_EVENTO), ev.categoria || 'Outros')}</select>`), `<div id="ev-sub-wrap" ${ev.categoria === 'Aula ou Estágio Regular' ? '' : 'hidden'}>${campo('Qual?', `<select id="ev-sub">${opcoes(SUB_REGULAR, ev.subcategoria)}</select>`)}</div>`)}
    ${campo('Local (opcional)', `<input id="ev-local" value="${esc(ev.local || '')}">`)}
    ${campo('Relativo a um projeto? (opcional)', `<select id="ev-proj"><option value="">Nenhum</option>${opcoes(projs.map(p => ({ v: p.id, t: p.titulo })), ev.projetoId)}</select>`)}
    <div class="linha-chk">${chk('ev-repetir', 'Repetir toda semana', ev.repetir === 'semanal', 'data-change="evRepetir"')}<span id="ev-ate-wrap" ${ev.repetir === 'semanal' ? '' : 'hidden'}>até <input type="date" id="ev-ate" value="${esc(ev.ate || '')}"></span></div>
    <div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Salvar', 'salvarEvento', { classe: 'btn-pri', icone: 'check', dados: { id: ev.id || '' } })}</div>` });
}
acao('evCat', (d, el) => { document.getElementById('ev-sub-wrap').hidden = el.value !== 'Aula ou Estágio Regular'; });
acao('evRepetir', (d, el) => { document.getElementById('ev-ate-wrap').hidden = !el.checked; });
acao('editarEvento', ({ id }) => abrirFormEvento(S.eventos.find(e => e.id === id)));
acao('salvarEvento', async ({ id }) => {
  const titulo = val('ev-titulo'), data = val('ev-data'); if (!titulo || !data) { toast('Informe título e data.', 'erro'); return; }
  const cat = val('ev-cat');
  const d = { titulo, data, horaInicio: val('ev-ini'), horaFim: val('ev-fim'), categoria: cat, subcategoria: cat === 'Aula ou Estágio Regular' ? val('ev-sub') : null, local: val('ev-local'), projetoId: val('ev-proj') || null, repetir: val('ev-repetir') ? 'semanal' : null, ate: val('ev-repetir') ? val('ev-ate') || null : null };
  if (id) await Data.update(`usuarios/${S.uid}/eventos/${id}`, d); else await Data.add(`usuarios/${S.uid}/eventos`, { ...d, criadoEm: Date.now() });
  fecharModal(); estado.base = data;
});
acao('apagarEvento', async ({ id }) => { if (await confirmar('Excluir este compromisso?', { ok: 'Excluir', perigo: true })) { await Data.del(`usuarios/${S.uid}/eventos/${id}`); fecharModal(); } });

let largAnterior = matchMedia('(max-width: 760px)').matches;
window.addEventListener('resize', debounce(() => { const m = matchMedia('(max-width: 760px)').matches; if (m !== largAnterior && location.hash.startsWith('#/agenda')) { largAnterior = m; rerender(); } }, 200));

export default { titulo: 'Agenda', render };
