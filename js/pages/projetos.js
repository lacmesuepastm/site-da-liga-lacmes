import { Data } from '../data.js';
import { S, tela, ouvirTela, nomeDe, primeiroNome, usuariosAtivos, meusProjetos, souCoordenador, souMembro } from '../store.js';
import { P, CATEGORIAS, categoriaBadge, eixosChips, eixoPicker, lerEixos, PAPEIS_PROJETO, EIXOS } from '../dominio.js';
import { ic, esc, sanitizar, textoPuro, acao, avatar, tempoRelativo, fmtDataHora, abrirModal, fecharModal, confirmar, toast, val, opcoes, novoId, isoParaBR, hojeISO, somarDias, dataDeISO, isoDe, MESES, horasEntre, enviarArquivo, rerender } from '../util.js';
import { cabecalho, vazio, btn, btnIc, campo, linhaCampos, seletorPessoas, abas, chk, meta } from '../ui.js';
import { ativarMencoes, mencionados, mencaoHTML } from '../editor.js';
import { notificar } from '../notificar.js';
import { criarCertificados } from '../cert.js';
import { WORKER_URL } from '../config.js';
import { anexar, apagarAnexo, iconeArquivo, botaoAbrir, tipoDe, tamanho, LIMITE_LOCAL } from '../arquivos.js';

const ABAS = [
  { id: 'chat', nome: 'Chat', icone: 'comentario' }, { id: 'tarefas', nome: 'Tarefas', icone: 'tarefa' }, { id: 'escala', nome: 'Escala', icone: 'calendario' },
  { id: 'arquivos', nome: 'Arquivos', icone: 'clipe' }, { id: 'membros', nome: 'Membros', icone: 'usuarios' }, { id: 'reunioes', nome: 'Reuniões', icone: 'reuniao' },
  { id: 'coleta', nome: 'Coleta', icone: 'coleta' }, { id: 'sobre', nome: 'Sobre', icone: 'info' }
];
const filtro = { cat: 'todas', eixo: null };
let mesEscala = 0;
const upd = (pid, dados) => Data.update(`projetos/${pid}`, dados);
const naoLido = (p) => p.ultimaMensagem && p.ultimaMensagem.autor !== S.uid && p.ultimaMensagem.em > Number(localStorage.getItem('lacmes-lido-' + p.id) || 0);

function renderLista() {
  let lista = meusProjetos();
  if (filtro.cat !== 'todas') lista = lista.filter(p => p.categoria === filtro.cat);
  if (filtro.eixo) lista = lista.filter(p => (p.eixos || ['clinica']).includes(filtro.eixo));
  const podeCriar = P.tipos(S.eu).filter(t => t !== 'Estágio').length > 0;
  const cards = lista.map((p, i) => {
    const membros = (p.membros || []).slice(0, 5).map(m => avatar(S.usuarios[m.uid], 24)).join('');
    const pend = (p.tarefas || []).filter(t => !t.concluida && (t.resp || []).includes(S.uid)).length;
    return `<a class="card card-projeto" style="--i:${Math.min(i, 12)};--tc:${(CATEGORIAS[p.categoria] || {}).cor || '#4a5568'}" href="#/projetos/${p.id}/chat">
      <div class="cpj-topo">${categoriaBadge(p.categoria)}${p.concluido ? `<span class="status status-fim">${ic('concluido')}Concluído</span>` : ''}${naoLido(p) ? '<span class="ponto-novo" title="Mensagens novas"></span>' : ''}</div>
      <h3>${esc(p.titulo)}</h3>
      ${p.desc ? `<p class="cp-resumo">${esc(p.desc)}</p>` : ''}
      ${eixosChips(p.eixos, { mini: true })}
      <div class="cpj-rodape"><span class="pilha">${membros}</span>${(p.membros || []).length > 5 ? `<span class="mudo">+${p.membros.length - 5}</span>` : ''}${pend ? `<span class="pill-alerta">${ic('tarefa')}${pend} tarefa(s)</span>` : ''}</div>
    </a>`;
  }).join('');
  const cats = ['todas', ...Object.keys(CATEGORIAS).filter(c => c !== 'Estágio')];
  return `${cabecalho('Projetos', 'Grupos de pesquisa, extensão, artigos e resumos em que você participa.', podeCriar ? btn('Novo projeto', 'novoProjeto', { icone: 'mais', classe: 'btn-pri' }) : '')}
    <div class="filtros"><div class="seg">${cats.map(c => `<button class="seg-btn ${filtro.cat === c ? 'ativo' : ''}" data-action="projFiltro" data-cat="${c}">${c === 'todas' ? 'Todos' : c}</button>`).join('')}</div></div>
    <div class="filtro-eixos">${EIXOS.map(e => `<button class="eixo-filtro ${filtro.eixo === e.id ? 'ativo' : ''}" style="--ec:${e.c};--eb:${e.b}" data-action="projEixo" data-eixo="${e.id}">${e.svg}<span>${esc(e.nome)}</span></button>`).join('')}</div>
    <div class="grade-cards">${cards || vazio('Nenhum projeto por aqui ainda. Inscreva-se nas oportunidades para entrar em um grupo!', 'pasta')}</div>`;
}
acao('projFiltro', ({ cat }) => { filtro.cat = cat; rerender(); });
acao('projEixo', ({ eixo }) => { filtro.eixo = filtro.eixo === eixo ? null : eixo; rerender(); });

function formProjeto(p = {}) {
  const tipos = P.tipos(S.eu).filter(t => t !== 'Estágio');
  const orientadores = Object.values(S.usuarios).filter(u => u.tipo === 'orientador' || u.tipo === 'admin');
  return `${campo('Título', `<input id="np-titulo" value="${esc(p.titulo || '')}">`)}
    ${campo('Descrição curta', `<textarea id="np-desc" rows="3">${esc(p.desc || '')}</textarea>`)}
    ${linhaCampos(
      campo('Tipo', `<select id="np-tipo" data-change="npTipo">${opcoes(tipos, p.categoria)}</select>`),
      campo('ID do projeto', `<input id="np-idproj" value="${esc(p.idProj || '')}" placeholder="automático">`))}
    <div id="np-evento-wrap" ${p.categoria === 'Resumo' ? '' : 'hidden'}>${campo('Evento', `<input id="np-evento" value="${esc(p.evento || '')}" placeholder="Ex.: Congresso Brasileiro de Clínica Médica">`)}</div>
    ${linhaCampos(
      campo('Orientador(a) — nome', `<input id="np-orientador" value="${esc(p.orientador || '')}">`),
      campo('Orientador(a) com conta (assina certificados)', `<select id="np-orientador-uid"><option value="">— usar orientadora geral —</option>${opcoes(orientadores.map(u => ({ v: u.id, t: u.nome })), p.orientadorUid)}</select>`))}
    ${campo('Acesso / observações', `<input id="np-acesso" value="${esc(p.acesso || '')}">`)}
    ${campo('Eixos', eixoPicker('np-eixos', p.eixos || []))}`;
}
acao('npTipo', (d, el) => { document.getElementById('np-evento-wrap').hidden = el.value !== 'Resumo'; });
acao('novoProjeto', () => abrirModal({ titulo: 'Novo projeto', largura: 640, corpo: formProjeto() + `<div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Criar projeto', 'salvarProjeto', { classe: 'btn-pri', icone: 'check' })}</div>` }));
acao('editarProjeto', ({ pid }) => abrirModal({ titulo: 'Editar projeto', largura: 640, corpo: formProjeto(S.projetos[pid]) + `<div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Salvar', 'salvarProjeto', { classe: 'btn-pri', icone: 'check', dados: { pid } })}</div>` }));
acao('salvarProjeto', async ({ pid }) => {
  const titulo = val('np-titulo'); if (!titulo) { toast('Informe o título.', 'erro'); return; }
  const dados = { titulo, desc: val('np-desc'), categoria: val('np-tipo'), evento: val('np-tipo') === 'Resumo' ? val('np-evento') : '', orientador: val('np-orientador'), orientadorUid: val('np-orientador-uid') || null, acesso: val('np-acesso'), eixos: lerEixos('np-eixos') };
  if (pid) { await upd(pid, { ...dados, idProj: val('np-idproj') || S.projetos[pid].idProj }); fecharModal(); toast('Projeto atualizado.', 'ok'); return; }
  const membros = dados.orientadorUid ? [{ uid: dados.orientadorUid, papel: 'Orientador' }] : [];
  const id = await Data.add('projetos', { ...dados, idProj: val('np-idproj') || `${dados.categoria.slice(0, 4).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`, membros, membroIds: membros.map(m => m.uid), tarefas: [], escala: {}, arquivos: [], reunioes: [], coleta: [], concluido: false, cargaHoraria: 0, certificadosEnviados: [], criadoPor: S.uid, criadoEm: Date.now() });
  fecharModal(); location.hash = `#/projetos/${id}/membros`;
  notificar({ tipo: 'projeto', pref: 'eixos', eixos: dados.eixos, titulo: `Novo projeto: ${titulo}`, corpo: dados.categoria, url: `#/projetos/${id}/sobre` });
});

function fontesMencao(p) {
  return (termo) => {
    const r = [];
    (p.membros || []).forEach(m => { const u = S.usuarios[m.uid]; if (u) r.push({ kind: 'user', id: u.id, label: u.nome, sub: m.papel }); });
    (p.arquivos || []).forEach(a => r.push({ kind: 'file', id: a.id, label: a.nome, sub: 'arquivo' }));
    const datas = new Map();
    Object.keys(p.escala || {}).forEach(d => datas.set(d, 'escala'));
    (p.reunioes || []).filter(x => !x.concluida).forEach(x => datas.set(x.data, 'reunião: ' + x.titulo));
    (p.tarefas || []).filter(t => t.prazo && !t.concluida).forEach(t => datas.set(t.prazo, 'prazo: ' + t.titulo));
    [hojeISO(), somarDias(hojeISO(), 1)].forEach((d, i) => { if (!datas.has(d)) datas.set(d, i ? 'amanhã' : 'hoje'); });
    const m = (termo || '').match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (m) { const ano = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : new Date().getFullYear(); const iso = `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; if (dataDeISO(iso)) datas.set(iso, datas.get(iso) || 'data'); }
    [...datas.entries()].sort().forEach(([d, sub]) => r.push({ kind: 'date', id: d, label: isoParaBR(d), sub }));
    (p.tarefas || []).filter(t => !t.concluida).forEach(t => r.push({ kind: 'task', id: t.id, label: t.titulo, sub: 'tarefa' }));
    return r;
  };
}
function abaChat(p) {
  const msgs = ((tela.msgs || {})[p.id] || []).slice().sort((a, b) => a.criadoEm - b.criadoEm);
  let ultimoDia = '';
  const html = msgs.map(m => {
    const dia = new Date(m.criadoEm).toLocaleDateString('pt-BR');
    const sep = dia !== ultimoDia ? `<div class="chat-dia"><span>${dia === new Date().toLocaleDateString('pt-BR') ? 'Hoje' : dia}</span></div>` : '';
    ultimoDia = dia;
    if (m.sistema) return `${sep}<div class="chat-sis">${ic(m.icone || 'info')}<span class="rich">${sanitizar(m.html)}</span><small>${fmtDataHora(m.criadoEm).slice(11)}</small></div>`;
    const eu = m.autor === S.uid;
    return `${sep}<div class="msg ${eu ? 'eu' : ''}">${eu ? '' : avatar(S.usuarios[m.autor], 28)}<div class="msg-bolha">
      ${eu ? '' : `<strong>${esc(nomeDe(m.autor))}</strong>`}<div class="rich">${sanitizar(m.html)}</div>
      <small>${fmtDataHora(m.criadoEm).slice(11)}${eu || P.admin(S.eu) ? ` · <button class="link-mini" data-action="apagarMsg" data-pid="${p.id}" data-id="${m.id}">apagar</button>` : ''}</small></div></div>`;
  }).join('');
  return `<div class="chat" data-projeto="${p.id}">
    <div class="chat-msgs" data-rolagem="chat-${p.id}">${html || vazio('Nenhuma mensagem ainda. Diga olá para a equipe!', 'comentario')}</div>
    <div class="chat-compor">
      <div class="compositor rich" id="chat-input" contenteditable="true" data-placeholder="Mensagem… use @ para citar pessoa, arquivo, data ou tarefa"></div>
      <div class="chat-botoes">
        ${btnIc('arroba', 'inserirArroba', {}, 'Mencionar (@)')}
        ${souCoordenador(p) ? btnIc('tarefa', 'novaTarefa', { pid: p.id }, 'Atribuir tarefa') : ''}
        <button class="btn btn-pri" data-action="enviarMsg" data-pid="${p.id}">${ic('enviar')}<span>Enviar</span></button>
      </div>
    </div></div>`;
}
acao('inserirArroba', () => { const el = document.getElementById('chat-input'); el.focus(); document.execCommand('insertText', false, '@'); });
acao('enviarMsg', async ({ pid }) => {
  const el = document.getElementById('chat-input');
  const html = sanitizar(el.innerHTML).replace(/(<br>|\s|&nbsp;)+$/g, '');
  if (!textoPuro(html).trim()) return;
  el.innerHTML = '';
  const p = S.projetos[pid];
  await Data.add(`projetos/${pid}/mensagens`, { autor: S.uid, html, criadoEm: Date.now() });
  upd(pid, { ultimaMensagem: { em: Date.now(), autor: S.uid } }).catch(() => { });
  localStorage.setItem('lacmes-lido-' + pid, Date.now());
  const citados = mencionados(html).filter(u => u !== S.uid);
  if (citados.length) notificar({ tipo: 'mencao', pref: 'mencoes', uids: citados, titulo: `${primeiroNome(S.uid)} citou você em ${p.titulo}`, corpo: textoPuro(html).slice(0, 100), url: `#/projetos/${pid}/chat` });
});
acao('apagarMsg', async ({ pid, id }) => { if (await confirmar('Apagar mensagem?', { ok: 'Apagar', perigo: true })) Data.del(`projetos/${pid}/mensagens/${id}`); });
const msgSistema = (pid, html, icone) => Data.add(`projetos/${pid}/mensagens`, { sistema: true, html, icone, autor: S.uid, criadoEm: Date.now() });

function abaTarefas(p) {
  const coord = souCoordenador(p);
  const item = (t) => {
    const minha = (t.resp || []).includes(S.uid) || (t.resp || []).includes('TODOS');
    const atrasada = !t.concluida && t.prazo && t.prazo < hojeISO();
    return `<div class="tarefa ${t.concluida ? 'feita' : ''}">
      <button class="tarefa-check" ${(!minha && !coord) || t.concluida ? 'disabled' : ''} data-action="concluirTarefa" data-pid="${p.id}" data-id="${t.id}" title="Concluir">${t.concluida ? ic('check') : ''}</button>
      <div class="tarefa-corpo"><strong>${esc(t.titulo)}</strong>${t.desc ? `<p>${esc(t.desc)}</p>` : ''}
        ${(t.anexos || []).length ? `<div class="anexos-linha">${t.anexos.map(a => `<span class="anexo-chip">${iconeArquivo(a.nome, a.url)}<span>${esc(a.nome)}</span>${botaoAbrir(a.url, a.nome)}</span>`).join('')}</div>` : ''}
        <div class="meta">${meta('calendario', t.prazo ? `<span class="${atrasada ? 'txt-perigo' : ''}">${isoParaBR(t.prazo)}${atrasada ? ' · atrasada' : ''}</span>` : 'Sem prazo')}
          ${meta('usuarios', (t.resp || []).includes('TODOS') ? 'Todos' : (t.resp || []).map(primeiroNome).join(', '))}
          ${t.concluida ? meta('concluido', `por ${primeiroNome(t.concluidaPor)} em ${fmtDataHora(t.concluidaEm)}`) : ''}</div></div>
      ${coord ? btnIc('lixeira', 'apagarTarefa', { pid: p.id, id: t.id }, 'Excluir') : ''}</div>`;
  };
  const pend = (p.tarefas || []).filter(t => !t.concluida).sort((a, b) => (a.prazo || '9').localeCompare(b.prazo || '9'));
  const feitas = (p.tarefas || []).filter(t => t.concluida);
  return `<div class="aba-cab"><h4>Tarefas pendentes (${pend.length})</h4>${coord ? btn('Nova tarefa', 'novaTarefa', { icone: 'mais', dados: { pid: p.id } }) : ''}</div>
    ${pend.map(item).join('') || vazio('Nenhuma tarefa pendente.', 'tarefa')}
    ${feitas.length ? `<h4 class="sec-titulo">Concluídas (${feitas.length})</h4>${feitas.map(item).join('')}` : ''}`;
}
acao('novaTarefa', ({ pid }) => {
  const p = S.projetos[pid];
  abrirModal({ titulo: 'Atribuir tarefa', largura: 560, corpo: `
    ${campo('Título', '<input id="tf-titulo">')}${campo('Descrição (opcional)', '<textarea id="tf-desc" rows="2"></textarea>')}
    ${campo('Prazo', '<input type="date" id="tf-prazo">')}
    ${campo('Anexar arquivos (opcional)', '<input type="file" id="tf-arquivos" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.odt,.ods,.odp,.rtf,.txt,.zip,image/*">', 'PDF, Word, Excel, PowerPoint ou imagem. Os responsáveis veem na tarefa.')}
    ${campo('Responsáveis', seletorPessoas('tf-resp', (p.membros || []).map(m => m.uid), [], { todosOpcao: true }))}
    <div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Atribuir', 'salvarTarefa', { classe: 'btn-pri', icone: 'check', dados: { pid } })}</div>` });
});
acao('salvarTarefa', async ({ pid }, botao) => {
  const titulo = val('tf-titulo'); const resp = [...document.querySelectorAll('input[name="tf-resp"]:checked')].map(i => i.value);
  if (!titulo || !resp.length) { toast('Informe título e pelo menos um responsável.', 'erro'); return; }
  const p = S.projetos[pid];
  const anexos = [];
  botao.disabled = true;
  try {
    for (const f of document.getElementById('tf-arquivos').files) {
      const r = await anexar(f, { pasta: `projetos/${pid}` });
      anexos.push({ nome: r.nome, url: r.url, tipo: r.tipo, tam: r.tam });
    }
  } catch (e) { await Promise.all(anexos.map(a => apagarAnexo(a.url))); toast(e.message, 'erro', 7000); botao.disabled = false; return; }
  const t = { id: novoId('t'), titulo, desc: val('tf-desc'), prazo: val('tf-prazo'), resp, anexos, concluida: false, criadoPor: S.uid, criadoEm: Date.now() };
  await upd(pid, { tarefas: [...(p.tarefas || []), t] });
  fecharModal();
  await msgSistema(pid, `${esc(primeiroNome(S.uid))} atribuiu ${mencaoHTML({ kind: 'task', id: t.id, label: titulo })} a ${resp.map(u => mencaoHTML({ kind: 'user', id: u, label: nomeDe(u) })).join(', ')}${t.prazo ? ` — prazo ${mencaoHTML({ kind: 'date', id: t.prazo, label: isoParaBR(t.prazo) })}` : ''}`, 'tarefa');
  notificar({ tipo: 'tarefa', pref: 'mencoes', uids: resp, titulo: `Nova tarefa: ${titulo}`, corpo: `${p.titulo}${t.prazo ? ' · prazo ' + isoParaBR(t.prazo) : ''}`, url: `#/projetos/${pid}/tarefas` });
});
acao('concluirTarefa', async ({ pid, id }) => {
  const p = S.projetos[pid];
  const tarefas = (p.tarefas || []).map(t => t.id === id ? { ...t, concluida: true, concluidaPor: S.uid, concluidaEm: Date.now() } : t);
  await upd(pid, { tarefas });
  const t = tarefas.find(x => x.id === id);
  msgSistema(pid, `${esc(primeiroNome(S.uid))} concluiu ${mencaoHTML({ kind: 'task', id, label: t.titulo })} ✓`, 'concluido');
  if (t.criadoPor && t.criadoPor !== S.uid) notificar({ tipo: 'tarefa', pref: 'mencoes', uids: [t.criadoPor], titulo: `Tarefa concluída: ${t.titulo}`, corpo: `por ${S.eu.nome}`, url: `#/projetos/${pid}/tarefas` });
});
acao('apagarTarefa', async ({ pid, id }) => { if (await confirmar('Excluir tarefa?', { ok: 'Excluir', perigo: true })) upd(pid, { tarefas: S.projetos[pid].tarefas.filter(t => t.id !== id) }); });

function abaEscala(p) {
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + mesEscala);
  const ano = base.getFullYear(), mes = base.getMonth();
  const dias = new Date(ano, mes + 1, 0).getDate(), vazios = (new Date(ano, mes, 1).getDay() + 6) % 7;
  const esc_ = p.escala || {};
  let grade = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => `<div class="cal-cab">${d}</div>`).join('') + '<div class="cal-vazio"></div>'.repeat(vazios);
  for (let d = 1; d <= dias; d++) {
    const iso = isoDe(new Date(ano, mes, d)); const e = esc_[iso];
    grade += `<button class="cal-dia ${iso === hojeISO() ? 'hoje' : ''} ${e ? 'tem' : ''} ${e && (e.equipe || []).includes(S.uid) ? 'meu' : ''}" data-action="diaEscala" data-pid="${p.id}" data-iso="${iso}">
      <span class="cal-num">${d}</span>${e ? `<span class="cal-info">${esc(e.hora || '')}</span><span class="cal-pessoas">${(e.equipe || []).slice(0, 3).map(u => `<i>${esc(primeiroNome(u))}</i>`).join('')}${(e.equipe || []).length > 3 ? `<i>+${e.equipe.length - 3}</i>` : ''}</span>` : ''}</button>`;
  }
  const cont = {}; Object.values(esc_).forEach(e => (e.equipe || []).forEach(u => cont[u] = (cont[u] || 0) + 1));
  const freq = souCoordenador(p)
    ? `<div class="freq">${(p.membros || []).map(m => `<span class="freq-item">${avatar(S.usuarios[m.uid], 22)}${esc(primeiroNome(m.uid))}<b>${cont[m.uid] || 0}</b></span>`).join('')}</div>`
    : `<p class="mudo">Suas presenças nesta escala: <b>${cont[S.uid] || 0}</b></p>`;
  return `<div class="aba-cab"><h4>Escala</h4><div class="nav-mes">${btnIc('esq', 'mesEscala', { d: -1 }, 'Mês anterior')}<span>${MESES[mes]} ${ano}</span>${btnIc('dir', 'mesEscala', { d: 1 }, 'Próximo mês')}</div></div>
    <div class="cal">${grade}</div><h4 class="sec-titulo">Frequência</h4>${freq}`;
}
acao('mesEscala', ({ d }) => { mesEscala += Number(d); rerender(); });
acao('diaEscala', ({ pid, iso }) => {
  const p = S.projetos[pid]; const e = (p.escala || {})[iso]; const coord = souCoordenador(p);
  if (!e) {
    if (!coord && !souMembro(p)) return;
    abrirModal({ titulo: `Agendar — ${isoParaBR(iso)}`, largura: 420, corpo: `${linhaCampos(campo('Horário', '<input type="time" id="es-hora">'), campo('Vagas (opcional)', '<input type="number" id="es-vagas" min="1">'))}${campo('Local', '<input id="es-local">')}
      ${chk('es-eu', 'Já me incluir na escala', true)}<div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Salvar', 'salvarEscala', { classe: 'btn-pri', dados: { pid, iso } })}</div>` });
    return;
  }
  const dentro = (e.equipe || []).includes(S.uid);
  abrirModal({ titulo: `Escala — ${isoParaBR(iso)}`, largura: 420, corpo: `<div class="meta">${meta('relogio', esc(e.hora || '—'))}${meta('local', esc(e.local || '—'))}${e.vagas ? meta('vagas', `${(e.equipe || []).length}/${e.vagas}`) : ''}</div>
    <div class="lista-pessoas">${(e.equipe || []).map(u => `<span class="pessoa-chip">${avatar(S.usuarios[u], 22)}${esc(nomeDe(u))}</span>`).join('') || '<p class="mudo">Ninguém ainda.</p>'}</div>
    <div class="acoes-form">${coord ? btn('Excluir dia', 'apagarEscala', { classe: 'btn-perigo-txt', dados: { pid, iso } }) : ''}${btn(dentro ? 'Sair da escala' : 'Confirmar presença', 'presencaEscala', { classe: dentro ? '' : 'btn-pri', dados: { pid, iso } })}</div>` });
});
acao('salvarEscala', async ({ pid, iso }) => {
  const p = S.projetos[pid];
  await upd(pid, { [`escala.${iso}`]: { hora: val('es-hora'), local: val('es-local'), vagas: Number(val('es-vagas')) || null, equipe: val('es-eu') ? [S.uid] : [] } });
  fecharModal();
  notificar({ tipo: 'escala', pref: 'reunioes', uids: (p.membros || []).map(m => m.uid), titulo: `Nova data na escala: ${isoParaBR(iso)}`, corpo: `${p.titulo}${val('es-hora') ? ' · ' + val('es-hora') : ''}`, url: `#/projetos/${pid}/escala` });
});
acao('presencaEscala', async ({ pid, iso }) => {
  const e = S.projetos[pid].escala[iso]; const dentro = (e.equipe || []).includes(S.uid);
  if (!dentro && e.vagas && (e.equipe || []).length >= e.vagas) { toast('As vagas deste dia já foram preenchidas.', 'erro'); return; }
  await upd(pid, { [`escala.${iso}.equipe`]: dentro ? e.equipe.filter(u => u !== S.uid) : [...(e.equipe || []), S.uid] });
  fecharModal();
});
acao('apagarEscala', async ({ pid, iso }) => { const esc2 = { ...S.projetos[pid].escala }; delete esc2[iso]; await upd(pid, { escala: esc2 }); fecharModal(); });

function abaArquivos(p) {
  const podeGerir = souCoordenador(p) || souMembro(p);
  const lista = (p.arquivos || []).slice().sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0)).map(a => `
    <div class="linha-item">${iconeArquivo(a.nome, a.url)}<div class="li-txt"><strong>${esc(a.nome)}</strong><small>${esc(tipoDe(a.nome, a.url).rot)}${a.tam ? ' · ' + tamanho(a.tam) : ''} · ${a.por ? esc(primeiroNome(a.por)) + ' · ' : ''}${tempoRelativo(a.criadoEm)}</small></div>
      ${botaoAbrir(a.url, a.nome)}${btnIc('arroba', 'citarArquivo', { pid: p.id, id: a.id }, 'Citar no chat')}${souCoordenador(p) || a.por === S.uid ? btnIc('lixeira', 'apagarArquivo', { pid: p.id, id: a.id }, 'Remover') : ''}</div>`).join('');
  return `<div class="aba-cab"><h4>Arquivos (${(p.arquivos || []).length})</h4>${podeGerir ? btn('Adicionar', 'novoArquivo', { icone: 'mais', dados: { pid: p.id } }) : ''}</div>${lista || vazio('Nenhum arquivo anexado. Anexe PDF, Word, Excel, PowerPoint ou imagens.', 'clipe')}`;
}
acao('novoArquivo', ({ pid }) => {
  const p = S.projetos[pid];
  abrirModal({ titulo: 'Adicionar arquivos', largura: 540, corpo: `
  ${campo('Enviar do dispositivo (um ou vários)', '<input type="file" id="af-arquivo" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.odt,.ods,.odp,.rtf,.txt,.zip,image/*">', `PDF, Word, Excel, PowerPoint, imagens… ${WORKER_URL ? 'Até 15 MB cada.' : `Até ${Math.round(LIMITE_LOCAL / 1024)} KB cada (para arquivos maiores use um link do Drive).`}`)}
  <p class="ou"><span>ou</span></p>
  ${campo('Nome do link', '<input id="af-nome" placeholder="Ex.: TCLE assinado">')}${campo('Link (Drive, Docs, OneDrive…)', '<input id="af-url" placeholder="https://">')}
  ${campo('Citar pessoas ao anexar (opcional — elas são avisadas)', seletorPessoas('af-pessoas', (p.membros || []).map(m => m.uid).filter(u => u !== S.uid), []))}
  <div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Adicionar', 'salvarArquivo', { classe: 'btn-pri', dados: { pid } })}</div>` });
});
acao('salvarArquivo', async ({ pid }, b) => {
  const files = [...document.getElementById('af-arquivo').files];
  const nomeLink = val('af-nome'), urlLink = val('af-url');
  const citados = [...document.querySelectorAll('input[name="af-pessoas"]:checked')].map(i => i.value);
  if (!files.length && !(nomeLink && /^https?:\/\//.test(urlLink))) { toast('Envie um arquivo ou informe nome e link (https://…).', 'erro'); return; }
  b.disabled = true; b.textContent = 'Enviando…';
  const novos = [];
  try {
    for (const f of files) {
      const r = await anexar(f, { pasta: `projetos/${pid}` });
      novos.push({ id: novoId('a'), nome: r.nome, url: r.url, tipo: r.tipo, tam: r.tam, por: S.uid, criadoEm: Date.now() });
    }
    if (nomeLink && /^https?:\/\//.test(urlLink)) novos.push({ id: novoId('a'), nome: nomeLink, url: urlLink, por: S.uid, criadoEm: Date.now() });
    await upd(pid, { arquivos: [...(S.projetos[pid].arquivos || []), ...novos] });
    fecharModal();
    const arquivosTxt = novos.map(a => mencaoHTML({ kind: 'file', id: a.id, label: a.nome })).join(' ');
    const pessoasTxt = citados.length ? ` — ${citados.map(u => mencaoHTML({ kind: 'user', id: u, label: nomeDe(u) })).join(', ')}` : '';
    msgSistema(pid, `${esc(primeiroNome(S.uid))} adicionou ${arquivosTxt}${pessoasTxt}`, 'clipe');
    if (citados.length) notificar({ tipo: 'mencao', pref: 'mencoes', uids: citados, titulo: `${primeiroNome(S.uid)} compartilhou ${novos.length > 1 ? novos.length + ' arquivos' : 'um arquivo'} com você`, corpo: `${novos.map(a => a.nome).join(', ')} · ${S.projetos[pid].titulo}`, url: `#/projetos/${pid}/arquivos` });
    toast(`${novos.length} arquivo(s) adicionado(s).`, 'ok');
  } catch (e) {
    if (novos.length) await Promise.all(novos.map(a => apagarAnexo(a.url)));
    toast(e.message, 'erro', 7000); b.disabled = false; b.textContent = 'Adicionar';
  }
});
acao('apagarArquivo', async ({ pid, id }) => {
  if (!(await confirmar('Remover este arquivo?', { ok: 'Remover', perigo: true }))) return;
  const a = S.projetos[pid].arquivos.find(x => x.id === id);
  await upd(pid, { arquivos: S.projetos[pid].arquivos.filter(x => x.id !== id) });
  if (a) apagarAnexo(a.url);
});
acao('citarArquivo', ({ pid, id }) => {
  const a = S.projetos[pid].arquivos.find(x => x.id === id);
  location.hash = `#/projetos/${pid}/chat`;
  setTimeout(() => { const el = document.getElementById('chat-input'); if (!el) return; el.focus(); document.execCommand('insertHTML', false, mencaoHTML({ kind: 'file', id, label: a.nome }) + '&nbsp;'); }, 120);
});

function abaMembros(p) {
  const coord = souCoordenador(p);
  const cards = (p.membros || []).map(m => { const u = S.usuarios[m.uid] || { nome: 'Removido' }; return `
    <div class="card card-membro">${avatar(u, 56)}<strong>${esc(u.nome)}</strong><small>${esc(u.email || '')}</small>
      <span class="tag-linha" style="--tc:${PAPEIS_PROJETO[m.papel] || '#777'}">${esc(m.papel)}</span>
      ${coord ? `<div class="cm-acoes">${btnIc('lapis', 'papelMembro', { pid: p.id, uid: m.uid }, 'Mudar papel')}${btnIc('lixeira', 'removerMembro', { pid: p.id, uid: m.uid }, 'Remover')}</div>` : ''}</div>`; }).join('');
  return `<div class="aba-cab"><h4>Equipe (${(p.membros || []).length})</h4>${coord ? btn('Adicionar membros', 'addMembros', { icone: 'mais', dados: { pid: p.id } }) : ''}</div><div class="grade-membros">${cards || vazio('Sem membros.', 'usuarios')}</div>`;
}
acao('addMembros', ({ pid }) => {
  const p = S.projetos[pid]; const ja = new Set(p.membroIds || []);
  abrirModal({ titulo: 'Adicionar membros', largura: 520, corpo: `${campo('Papel', `<select id="am-papel">${opcoes(Object.keys(PAPEIS_PROJETO), 'Pesquisador')}</select>`)}
    ${seletorPessoas('am-uids', usuariosAtivos().filter(u => !ja.has(u.id)).map(u => u.id))}
    <div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Adicionar', 'salvarMembros', { classe: 'btn-pri', dados: { pid } })}</div>` });
});
acao('salvarMembros', async ({ pid }) => {
  const uids = [...document.querySelectorAll('input[name="am-uids"]:checked')].map(i => i.value); if (!uids.length) return;
  const p = S.projetos[pid]; const papel = val('am-papel');
  const membros = [...(p.membros || []), ...uids.map(uid => ({ uid, papel }))];
  await upd(pid, { membros, membroIds: membros.map(m => m.uid) });
  fecharModal();
  msgSistema(pid, `${uids.map(u => mencaoHTML({ kind: 'user', id: u, label: nomeDe(u) })).join(', ')} entrou na equipe`, 'usuarios');
  notificar({ tipo: 'projeto', uids, titulo: `Você foi adicionado(a) ao projeto ${p.titulo}`, corpo: `Papel: ${papel}`, url: `#/projetos/${pid}/chat` });
});
acao('papelMembro', ({ pid, uid }) => {
  const m = S.projetos[pid].membros.find(x => x.uid === uid);
  abrirModal({ titulo: `Papel de ${nomeDe(uid)}`, largura: 380, corpo: `${campo('Papel', `<select id="pm-papel">${opcoes(Object.keys(PAPEIS_PROJETO), m.papel)}</select>`)}<div class="acoes-form">${btn('Salvar', 'salvarPapel', { classe: 'btn-pri', dados: { pid, uid } })}</div>` });
});
acao('salvarPapel', async ({ pid, uid }) => { await upd(pid, { membros: S.projetos[pid].membros.map(m => m.uid === uid ? { ...m, papel: val('pm-papel') } : m) }); fecharModal(); });
acao('removerMembro', async ({ pid, uid }) => {
  if (!(await confirmar(`Remover ${nomeDe(uid)} do projeto?`, { ok: 'Remover', perigo: true }))) return;
  const membros = S.projetos[pid].membros.filter(m => m.uid !== uid);
  await upd(pid, { membros, membroIds: membros.map(m => m.uid) });
});

function abaReunioes(p) {
  const coord = souCoordenador(p);
  const ativas = (p.reunioes || []).filter(r => !r.concluida).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  const fim = (p.reunioes || []).filter(r => r.concluida).sort((a, b) => b.data.localeCompare(a.data));
  const card = (r) => `<div class="card card-reuniao ${r.concluida ? 'passada' : ''}">
    <div class="cr-data"><b>${dataDeISO(r.data)?.getDate() || ''}</b><span>${(MESES[(dataDeISO(r.data) || new Date()).getMonth()] || '').slice(0, 3)}</span></div>
    <div class="cr-txt"><strong>${esc(r.titulo)}</strong>${r.desc ? `<p>${esc(r.desc)}</p>` : ''}
      <div class="meta">${meta('relogio', esc(r.hora))}${meta(r.tipo === 'Online' ? 'reuniao' : 'local', esc(r.tipo === 'Online' ? 'Online' : r.local))}${r.concluida ? meta('andamento', esc(r.duracao || '')) : ''}</div>
      <div class="acoes-linha esq">${!r.concluida && r.link ? `<a class="btn btn-peq" href="${esc(r.link)}" target="_blank" rel="noopener">${ic('reuniao')}Entrar na sala</a>` : ''}
        ${r.concluida && r.ata ? `<a class="btn btn-peq" href="${esc(r.ata)}" target="_blank" rel="noopener">${ic('ata')}Ver ata</a>` : ''}
        ${!r.concluida && coord ? btn('Encerrar e registrar ata', 'encerrarReuniao', { classe: 'btn-peq', dados: { pid: p.id, id: r.id } }) : ''}
        ${coord ? btnIc('lixeira', 'apagarReuniao', { pid: p.id, id: r.id }, 'Excluir') : ''}</div></div></div>`;
  return `<div class="aba-cab"><h4>Próximas reuniões</h4>${coord ? btn('Marcar reunião', 'novaReuniao', { icone: 'mais', dados: { pid: p.id } }) : ''}</div>
    ${ativas.map(card).join('') || vazio('Nenhuma reunião marcada.', 'reuniao')}
    ${fim.length ? `<h4 class="sec-titulo">Histórico e atas</h4>${fim.map(card).join('')}` : ''}`;
}
acao('novaReuniao', ({ pid }) => abrirModal({ titulo: 'Marcar reunião', largura: 520, corpo: `
  ${campo('Título', '<input id="rn-titulo">')}${campo('Pauta', '<textarea id="rn-desc" rows="2"></textarea>')}
  ${linhaCampos(campo('Data', `<input type="date" id="rn-data" value="${hojeISO()}">`), campo('Início', '<input type="time" id="rn-hora">'))}
  ${campo('Formato', `<select id="rn-tipo" data-change="rnTipo">${opcoes(['Online', 'Presencial'])}</select>`)}
  <div id="rn-online">${campo('Link (Meet/Zoom)', '<input id="rn-link" placeholder="https://">')}</div>
  <div id="rn-pres" hidden>${campo('Local', '<input id="rn-local">')}</div>
  <div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Marcar e avisar equipe', 'salvarReuniao', { classe: 'btn-pri', icone: 'sino', dados: { pid } })}</div>` }));
acao('rnTipo', (d, el) => { document.getElementById('rn-online').hidden = el.value !== 'Online'; document.getElementById('rn-pres').hidden = el.value === 'Online'; });
acao('salvarReuniao', async ({ pid }) => {
  const r = { id: novoId('r'), titulo: val('rn-titulo'), desc: val('rn-desc'), data: val('rn-data'), hora: val('rn-hora'), tipo: val('rn-tipo'), link: val('rn-link'), local: val('rn-local'), concluida: false, criadoPor: S.uid };
  if (!r.titulo || !r.data || !r.hora) { toast('Preencha título, data e horário.', 'erro'); return; }
  const p = S.projetos[pid];
  await upd(pid, { reunioes: [...(p.reunioes || []), r] });
  fecharModal();
  msgSistema(pid, `Reunião marcada: <b>${esc(r.titulo)}</b> em ${mencaoHTML({ kind: 'date', id: r.data, label: isoParaBR(r.data) })} às ${esc(r.hora)}`, 'reuniao');
  notificar({ tipo: 'reuniao', pref: 'reunioes', uids: (p.membros || []).map(m => m.uid), titulo: `Reunião marcada: ${r.titulo}`, corpo: `${p.titulo} · ${isoParaBR(r.data)} às ${r.hora}`, url: `#/projetos/${pid}/reunioes` });
});
acao('encerrarReuniao', ({ pid, id }) => abrirModal({ titulo: 'Encerrar reunião', largura: 420, corpo: `${campo('Horário de término', '<input type="time" id="er-fim">')}${campo('Link da ata (opcional)', '<input id="er-ata" placeholder="https://">')}<div class="acoes-form">${btn('Registrar', 'salvarEncerramento', { classe: 'btn-pri', dados: { pid, id } })}</div>` }));
acao('salvarEncerramento', async ({ pid, id }) => {
  const fim = val('er-fim'); if (!fim) return;
  await upd(pid, { reunioes: S.projetos[pid].reunioes.map(r => { if (r.id !== id) return r; const h = horasEntre(r.hora, fim); return { ...r, concluida: true, fim, ata: val('er-ata'), duracao: `${Math.floor(h)}h${Math.round((h % 1) * 60) ? ' ' + Math.round((h % 1) * 60) + 'min' : ''}` }; }) });
  fecharModal();
});
acao('apagarReuniao', async ({ pid, id }) => { if (await confirmar('Excluir reunião?', { ok: 'Excluir', perigo: true })) upd(pid, { reunioes: S.projetos[pid].reunioes.filter(r => r.id !== id) }); });

function abaColeta(p) {
  const coord = souCoordenador(p);
  const etapas = (p.coleta || []).map(e => `<div class="card coleta-etapa"><div class="aba-cab"><h5>${esc(e.etapa)}</h5>${coord ? `<span>${btnIc('mais', 'novoLinkColeta', { pid: p.id, id: e.id }, 'Adicionar instrumento')}${btnIc('lixeira', 'apagarEtapa', { pid: p.id, id: e.id }, 'Excluir etapa')}</span>` : ''}</div>
    <div class="coleta-links">${(e.links || []).map((l, i) => `<a class="coleta-link" href="${esc(l.url)}" target="_blank" rel="noopener">${ic('coleta')}<span>${esc(l.nome)}</span>${coord ? `<button class="btn-ic mini" data-action="apagarLinkColeta" data-pid="${p.id}" data-id="${e.id}" data-i="${i}" title="Remover">${ic('x')}</button>` : ''}</a>`).join('') || '<p class="mudo">Sem instrumentos.</p>'}</div></div>`).join('');
  return `<div class="aba-cab"><h4>Instrumentos de coleta</h4>${coord ? btn('Nova etapa', 'novaEtapa', { icone: 'mais', dados: { pid: p.id } }) : ''}</div>${etapas || vazio('Nenhum instrumento configurado.', 'coleta')}`;
}
acao('novaEtapa', ({ pid }) => abrirModal({ titulo: 'Nova etapa', largura: 400, corpo: `${campo('Nome', '<input id="ne-nome" placeholder="Etapa 1 — Triagem">')}<div class="acoes-form">${btn('Criar', 'salvarEtapa', { classe: 'btn-pri', dados: { pid } })}</div>` }));
acao('salvarEtapa', async ({ pid }) => { const n = val('ne-nome'); if (!n) return; await upd(pid, { coleta: [...(S.projetos[pid].coleta || []), { id: novoId('e'), etapa: n, links: [] }] }); fecharModal(); });
acao('apagarEtapa', async ({ pid, id }) => { if (await confirmar('Excluir etapa e seus links?', { ok: 'Excluir', perigo: true })) upd(pid, { coleta: S.projetos[pid].coleta.filter(e => e.id !== id) }); });
acao('novoLinkColeta', ({ pid, id }) => abrirModal({ titulo: 'Novo instrumento', largura: 420, corpo: `${campo('Título', '<input id="lc-nome">')}${campo('Link', '<input id="lc-url" placeholder="https://forms…">')}<div class="acoes-form">${btn('Salvar', 'salvarLinkColeta', { classe: 'btn-pri', dados: { pid, id } })}</div>` }));
acao('salvarLinkColeta', async ({ pid, id }) => { const nome = val('lc-nome'), url = val('lc-url'); if (!nome || !url) return; await upd(pid, { coleta: S.projetos[pid].coleta.map(e => e.id === id ? { ...e, links: [...(e.links || []), { nome, url }] } : e) }); fecharModal(); });
acao('apagarLinkColeta', (d, el, ev) => { ev.preventDefault(); upd(d.pid, { coleta: S.projetos[d.pid].coleta.map(e => e.id === d.id ? { ...e, links: e.links.filter((_, i) => i !== Number(d.i)) } : e) }); });

function abaSobre(p) {
  const coord = souCoordenador(p);
  const enviados = p.certificadosEnviados || [];
  return `<div class="card sobre">
    <dl class="dl">
      <dt>Resumo</dt><dd>${esc(p.desc || '—')}</dd>
      <dt>Tipo</dt><dd>${categoriaBadge(p.categoria)}${p.evento ? ` <span class="mudo">· ${esc(p.evento)}</span>` : ''}</dd>
      <dt>Eixos</dt><dd>${eixosChips(p.eixos)}</dd>
      <dt>Orientação</dt><dd>${esc(p.orientador || (p.orientadorUid ? nomeDe(p.orientadorUid) : '—'))}</dd>
      <dt>ID</dt><dd>${esc(p.idProj || '—')}</dd>
      ${p.acesso ? `<dt>Acesso</dt><dd>${esc(p.acesso)}</dd>` : ''}
      <dt>Status</dt><dd>${p.concluido ? `<span class="status status-fim">${ic('concluido')}Concluído · ${p.cargaHoraria || 0}h</span>` : `<span class="status status-and">${ic('andamento')}Em andamento</span>`}</dd>
      ${p.concluido ? `<dt>Certificados</dt><dd>${enviados.length}/${(p.membros || []).length} membro(s) certificado(s)</dd>` : ''}
    </dl>
    ${coord ? `<div class="acoes-linha esq">${btn('Editar', 'editarProjeto', { icone: 'lapis', dados: { pid: p.id } })}${btn(p.concluido ? 'Editar conclusão' : 'Concluir projeto', 'concluirProjeto', { icone: 'concluido', dados: { pid: p.id } })}
      ${p.concluido && P.diretor(S.eu) ? btn('Certificar membros', 'certificarProjeto', { icone: 'certificado', classe: 'btn-pri', dados: { pid: p.id } }) : ''}
      ${P.tipos(S.eu).includes(p.categoria) ? btn('Excluir projeto', 'apagarProjeto', { icone: 'lixeira', classe: 'btn-perigo-txt', dados: { pid: p.id } }) : ''}</div>` : ''}
  </div>`;
}
acao('concluirProjeto', ({ pid }) => abrirModal({ titulo: 'Concluir projeto', largura: 420, corpo: `<p class="mudo">A carga horária passa a contar para os certificados de todos os membros.</p>${campo('Carga horária total (h)', `<input type="number" id="cp-carga" min="0" step="0.5" value="${S.projetos[pid].cargaHoraria || 0}">`)}<div class="acoes-form">${btn('Salvar', 'salvarConclusao', { classe: 'btn-pri', dados: { pid } })}</div>` }));
acao('salvarConclusao', async ({ pid }) => { await upd(pid, { concluido: true, cargaHoraria: Number(val('cp-carga')) || 0, concluidoEm: Date.now() }); fecharModal(); toast('Projeto concluído.', 'ok'); });
acao('certificarProjeto', ({ pid }) => {
  const p = S.projetos[pid]; const ja = new Set(p.certificadosEnviados || []);
  const pend = (p.membros || []).map(m => m.uid).filter(u => !ja.has(u) && S.usuarios[u]);
  if (!pend.length) { toast('Todos os membros já foram certificados.', 'info'); return; }
  abrirModal({ titulo: `Certificar — ${p.titulo}`, largura: 520, corpo: `<p class="mudo">Carga horária: <b>${p.cargaHoraria || 0}h</b>. Os certificados entram na fila de assinatura da Presidência e depois do(a) orientador(a).</p>
    ${seletorPessoas('cp-uids', pend, pend, { todosOpcao: true })}<div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Gerar certificados', 'gerarCertProjeto', { classe: 'btn-pri', icone: 'certificado', dados: { pid } })}</div>` });
});
acao('gerarCertProjeto', async ({ pid }) => {
  const p = S.projetos[pid]; const uids = [...document.querySelectorAll('input[name="cp-uids"]:checked')].map(i => i.value); if (!uids.length) return;
  await criarCertificados(uids.map(userId => ({ userId, tipo: 'Projeto', cargaHoraria: p.cargaHoraria || 0, projetoId: pid, cargoTexto: p.titulo })));
  await upd(pid, { certificadosEnviados: [...new Set([...(p.certificadosEnviados || []), ...uids])] });
  fecharModal(); toast(`${uids.length} certificado(s) enviados para assinatura.`, 'ok');
});
acao('apagarProjeto', async ({ pid }) => {
  if (!(await confirmar('Excluir permanentemente este projeto para todos?', { ok: 'Excluir', perigo: true }))) return;
  const msgs = await Data.getCol(`projetos/${pid}/mensagens`);
  await Data.batch([...msgs.map(m => ({ tipo: 'del', path: `projetos/${pid}/mensagens/${m.id}` })), { tipo: 'del', path: `projetos/${pid}` }]);
  location.hash = '#/projetos';
});

function renderDetalhe(pid, aba = 'chat') {
  const p = S.projetos[pid];
  if (!p) return `<a class="voltar" href="#/projetos">${ic('voltar')} Projetos</a>${vazio('Projeto não encontrado.', 'pasta')}`;
  const pendentes = (p.tarefas || []).filter(t => !t.concluida && (t.resp || []).includes(S.uid)).length;
  const lista = ABAS.map(a => ({ ...a, badge: a.id === 'tarefas' && pendentes ? pendentes : '' }));
  const conteudo = { chat: abaChat, tarefas: abaTarefas, escala: abaEscala, arquivos: abaArquivos, membros: abaMembros, reunioes: abaReunioes, coleta: abaColeta, sobre: abaSobre }[aba] || abaChat;
  return `<a class="voltar" href="#/projetos">${ic('voltar')} Projetos</a>
    <div class="proj-cab"><div>${categoriaBadge(p.categoria)}<h2>${esc(p.titulo)}</h2>${eixosChips(p.eixos, { mini: true })}</div></div>
    ${abas(lista, aba, 'abaProjeto', { pid })}
    <div class="aba-conteudo aba-${aba}">${conteudo(p)}</div>`;
}
acao('abaProjeto', ({ pid, aba }) => { location.hash = `#/projetos/${pid}/${aba}`; });

export default {
  titulo: 'Projetos',
  tituloDinamico: (params) => params[0] && S.projetos[params[0]] ? S.projetos[params[0]].titulo : 'Projetos',
  render: (params) => params[0] ? renderDetalhe(params[0], params[1]) : renderLista(),
  montar(view, params) {
    const pid = params[0]; if (!pid || !S.projetos[pid]) return;
    if ((params[1] || 'chat') === 'chat') {
      ouvirTela('msgs-' + pid, (avisar) => Data.watchCol(`projetos/${pid}/mensagens`, (l) => { tela.msgs = { ...(tela.msgs || {}), [pid]: l }; localStorage.setItem('lacmes-lido-' + pid, Date.now()); avisar(); }, { orderBy: ['criadoEm', 'asc'], limit: 400 }));
      const el = view.querySelector('#chat-input');
      ativarMencoes(el, fontesMencao(S.projetos[pid]));
      el && el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !document.querySelector('.mencao-pop')) { e.preventDefault(); view.querySelector('[data-action="enviarMsg"]').click(); } });
    }
  }
};
