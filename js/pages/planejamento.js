import { Data } from '../data.js';
import { S, nomeDe, usuariosAtivos } from '../store.js';
import { P, CATEGORIAS_PLAN, DESTINO_PLAN, categoriasPlanDe, planBadge, eixosChips, eixoPicker, lerEixos, EIXOS, getFasesPadrao } from '../dominio.js';
import { ic, esc, sanitizar, textoPuro, acao, abrirModal, fecharModal, confirmar, toast, val, opcoes, isoParaBR, dataExtensa, MESES, horasEntre, hojeISO, rerender } from '../util.js';
import { cabecalho, vazio, btn, btnIc, campo, linhaCampos, chk, meta, seletorPessoas } from '../ui.js';
import { editorHTML, lerEditor } from '../editor.js';
import { notificar, publico } from '../notificar.js';
import { lerPublicado, podeGerirPublicado, botoesGestao } from '../eventos.js';

const filtro = { status: 'planejado', cat: 'todas', eixo: null, busca: '' };
const cfgDe = (p) => CATEGORIAS_PLAN[p.categoria] || CATEGORIAS_PLAN.Outro;
const achar = (id) => S.planejamento.find(p => p.id === id);
const statusDe = (p) => p.status || 'planejado';

function cardPlano(p, i) {
  const cfg = cfgDe(p), conf = statusDe(p) === 'confirmado';
  const atrasado = !conf && p.data && p.data < hojeISO();
  const horario = p.hora ? `${esc(p.hora)}${p.horaFim ? '–' + esc(p.horaFim) : ''}` : '';
  const pub = conf && p.publicado ? lerPublicado(p.publicado.destino, p.publicado.id) : null;
  const cancelada = !!(pub && pub.cancelada);
  const acoes = conf
    ? `${pub && podeGerirPublicado(p.publicado.destino, pub) ? botoesGestao(p.publicado.destino, p.publicado.id, cancelada) : ''}${verPublicado(p)}${btnIc('lixeira', 'apagarPlano', { id: p.id }, 'Excluir do planejamento')}`
    : `${btn('Confirmado', 'confirmarPlano', { classe: 'btn-pri', icone: 'check', dados: { id: p.id }, titulo: 'Publicar para os membros' })}
       ${btn('Editar', 'editarPlano', { icone: 'lapis', dados: { id: p.id } })}
       ${btnIc('copiar', 'duplicarPlano', { id: p.id }, 'Duplicar')}${btnIc('lixeira', 'apagarPlano', { id: p.id }, 'Excluir')}`;
  return `<article class="card card-plano ${conf ? 'conf' : ''}" style="--tc:${cfg.cor};--i:${Math.min(i, 12)}">
    <div class="cp-topo">${planBadge(p.categoria)}${p.subtipo ? `<span class="mudo pequeno">${esc(p.subtipo)}</span>` : ''}
      ${p.certifica ? `<span class="tag-linha" style="--tc:#AB9748">${ic('certificado')}Certificado${p.cargaHoraria ? ' · ' + p.cargaHoraria + 'h' : ''}</span>` : ''}
      <span class="flex1"></span>
      ${cancelada ? `<span class="status" style="color:var(--danger)">${ic('alerta')}Cancelado</span>` : conf ? `<span class="status status-and">${ic('concluido')}Confirmado</span>` : `<span class="rascunho">${ic('cadeado')}Só a diretoria vê</span>`}</div>
    <h3>${esc(p.titulo)}</h3>
    ${eixosChips(p.eixos, { mini: true })}
    <div class="meta">
      ${meta('usuario', esc(p.docente || 'Docente a definir'))}
      ${meta('calendario', p.data ? `<span class="${atrasado ? 'txt-perigo' : ''}">${dataExtensa(p.data)}${atrasado ? ' · data passada' : ''}</span>` : 'Data a definir')}
      ${horario ? meta('relogio', horario) : ''}${meta('local', esc(p.local || ''))}
      ${p.vagas ? meta('vagas', `${p.vagas} vaga(s)`) : ''}
      ${p.link ? meta('link', `<a href="${esc(p.link)}" target="_blank" rel="noopener">Link</a>`) : ''}
      ${(p.participantes || []).length ? meta('usuarios', `${p.participantes.length} participante(s) específicos`) : ''}
    </div>
    ${p.descHtml ? `<div class="rich plano-desc">${sanitizar(p.descHtml)}</div>` : ''}
    ${p.orientacoes ? `<div class="aviso-ok">${ic('info')}<div><b>Orientações aos confirmados</b><p>${esc(p.orientacoes)}</p></div></div>` : ''}
    ${p.notasInternas ? `<div class="nota-interna">${ic('cadeado')}<div><b>Notas internas</b> <span class="mudo">(nunca são publicadas)</span><p>${esc(p.notasInternas)}</p></div></div>` : ''}
    <div class="plano-rodape"><span class="mudo pequeno">${conf ? `Publicado em ${DESTINO_PLAN[cfg.destino]}` : `Ao confirmar → ${DESTINO_PLAN[cfg.destino]}`} · por ${esc(nomeDe(p.criadoPor))}</span>
      <span class="plano-acoes">${acoes}</span></div>
  </article>`;
}
function verPublicado(p) {
  const d = cfgDe(p).destino;
  const href = d === 'aula' ? '#/aulas' : (d === 'oportunidade' ? '#/oportunidades' : `#/agenda${p.data ? '/' + p.data : ''}`);
  return `<a class="btn btn-peq" href="${href}">${ic('olho')}Ver publicação</a>`;
}

function render() {
  const eu = S.eu;
  const todos = S.planejamento;
  let l = todos.filter(p => filtro.status === 'todos' || statusDe(p) === filtro.status);
  if (filtro.cat !== 'todas') l = l.filter(p => p.categoria === filtro.cat);
  if (filtro.eixo) l = l.filter(p => (p.eixos || ['clinica']).includes(filtro.eixo));
  if (filtro.busca) { const q = filtro.busca.toLowerCase(); l = l.filter(p => `${p.titulo} ${p.docente || ''} ${p.local || ''} ${p.notasInternas || ''}`.toLowerCase().includes(q)); }

  const plan = todos.filter(p => statusDe(p) === 'planejado');
  const horas = plan.reduce((s, p) => s + (Number(p.cargaHoraria) || 0), 0);
  const cats = categoriasPlanDe(eu);
  const nConf = todos.filter(p => statusDe(p) === 'confirmado').length;

  const grupos = new Map();
  l.forEach(p => { const k = p.data ? p.data.slice(0, 7) : 'sem'; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(p); });
  const chaves = [...grupos.keys()].sort((a, b) => (a === 'sem') - (b === 'sem') || a.localeCompare(b));
  let n = 0;
  const lista = chaves.map(k => `<h4 class="mes-grupo">${k === 'sem' ? ic('relogio') + 'Sem data definida' : `${MESES[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}`}<span class="mudo"> · ${grupos.get(k).length}</span></h4>
    <div class="lista-plano">${grupos.get(k).map(p => cardPlano(p, n++)).join('')}</div>`).join('');

  return `${cabecalho('Planejamento', 'Planeje aulas, projetos, reuniões, hands-on, escritas e eventos. <b>Os membros só recebem quando você clicar em "Confirmado".</b>', btn('Novo planejamento', 'novoPlano', { icone: 'mais', classe: 'btn-pri' }))}
    <div class="aviso">${ic('cadeado')}<div><b>Área restrita.</b> ${P.admin(eu) ? 'Como Presidência, você vê o planejamento de todas as diretorias.' : `Você vê apenas o que é da sua diretoria (${esc(eu.cargo)}).`} Nada aqui aparece para os demais usuários enquanto estiver como rascunho.</div></div>
    <div class="stats">
      <div class="stat" style="--c:#b7791f"><b>${plan.length}</b><span>Planejados</span></div>
      <div class="stat" style="--c:#1a7f5a"><b>${nConf}</b><span>Confirmados</span></div>
      <div class="stat" style="--c:#AB9748"><b>${plan.filter(p => p.certifica).length}</b><span>Com certificado</span></div>
      <div class="stat" style="--c:#2b6cb0"><b>${horas}h</b><span>Carga planejada</span></div>
    </div>
    <div class="filtros">
      <div class="seg">${[['planejado', 'Planejados'], ['confirmado', 'Confirmados'], ['todos', 'Todos']].map(([v, t]) => `<button class="seg-btn ${filtro.status === v ? 'ativo' : ''}" data-action="planStatus" data-v="${v}">${t}</button>`).join('')}</div>
      <span class="campo-busca">${ic('busca')}<input type="search" id="plano-busca" placeholder="Buscar título, docente, nota…" value="${esc(filtro.busca)}" data-input="planBusca"></span>
    </div>
    <div class="filtros"><div class="seg">${['todas', ...cats].map(c => `<button class="seg-btn ${filtro.cat === c ? 'ativo' : ''}" data-action="planCat" data-c="${c}">${c === 'todas' ? 'Todas as categorias' : c}</button>`).join('')}</div></div>
    <div class="filtro-eixos">${EIXOS.map(e => `<button class="eixo-filtro ${filtro.eixo === e.id ? 'ativo' : ''}" style="--ec:${e.c};--eb:${e.b}" data-action="planEixo" data-eixo="${e.id}">${e.svg}<span>${esc(e.nome)}</span></button>`).join('')}</div>
    ${lista || vazio(filtro.status === 'planejado' ? 'Nada planejado ainda. Use "Novo planejamento" para começar.' : 'Nada com esses filtros.', 'plano')}`;
}
acao('planStatus', ({ v }) => { filtro.status = v; rerender(); });
acao('planCat', ({ c }) => { filtro.cat = c; rerender(); });
acao('planEixo', ({ eixo }) => { filtro.eixo = filtro.eixo === eixo ? null : eixo; rerender(); });
let tBusca; acao('planBusca', (d, el) => { clearTimeout(tBusca); tBusca = setTimeout(() => { filtro.busca = el.value; rerender(); }, 250); });

function formPlano(p = {}) {
  const cats = categoriasPlanDe(S.eu);
  const cat = p.categoria && CATEGORIAS_PLAN[p.categoria] ? p.categoria : cats[0];
  const todosOsUsuarios = usuariosAtivos().map(u => u.id);
  return `${campo('Título', `<input id="pl-titulo" value="${esc(p.titulo || '')}" placeholder="Ex.: Aula de ECG básico">`)}
    ${linhaCampos(
      campo('Categoria', `<select id="pl-cat" data-change="plCat">${opcoes(cats, cat)}</select>`),
      `<div id="pl-subtipo-wrap">${campo('Tipo de escrita', `<select id="pl-subtipo">${opcoes(CATEGORIAS_PLAN.Escrita.subtipos, p.subtipo)}</select>`)}</div>`)}
    ${campo('Eixos (um ou mais — sem seleção vale Clínica Médica)', eixoPicker('pl-eixos', p.eixos || []))}
    ${campo('Docente / responsável', `<input id="pl-docente" value="${esc(p.docente || '')}" placeholder="Quem vai ministrar ou coordenar">`)}
    ${linhaCampos(campo('Data (pode deixar em branco)', `<input type="date" id="pl-data" value="${esc(p.data || '')}">`), campo('Início', `<input type="time" id="pl-hora" value="${esc(p.hora || '')}">`), campo('Fim', `<input type="time" id="pl-fim" value="${esc(p.horaFim || '')}">`))}
    ${linhaCampos(campo('Local', `<input id="pl-local" value="${esc(p.local || '')}">`), campo('Link (sala online, formulário…)', `<input id="pl-link" value="${esc(p.link || '')}" placeholder="https://">`))}
    <div class="linha-chk">${chk('pl-certifica', 'Emite certificado', !!p.certifica, 'data-change="plCert"')}</div>
    ${linhaCampos(
      `<div id="pl-carga-wrap">${campo('Carga horária (h)', `<input type="number" id="pl-carga" min="0" step="0.5" value="${p.cargaHoraria || ''}" placeholder="auto pelo horário">`)}</div>`,
      `<div id="pl-vagas-wrap">${campo('Vagas', `<input type="number" id="pl-vagas" min="1" value="${p.vagas || ''}">`)}</div>`)}
    <div id="pl-orient-wrap">${campo('Orientações aos confirmados (só eles verão)', `<textarea id="pl-orient" rows="2">${esc(p.orientacoes || '')}</textarea>`)}</div>
    ${campo('Descrição que os membros verão ao confirmar', editorHTML('pl-desc', { valor: p.descHtml || '', altura: 80, compacto: true }))}
    <div id="pl-part-wrap">
      <div class="linha-chk">${chk('pl-so-sel', 'Avisar/incluir só pessoas selecionadas (senão, todos)', (p.participantes || []).length > 0, 'data-change="plSoSel"')}</div>
      <div id="pl-part-lista" ${(p.participantes || []).length ? '' : 'hidden'}>${seletorPessoas('pl-part', todosOsUsuarios, p.participantes || [])}</div>
    </div>
    ${campo('Notas internas (nunca são publicadas)', `<textarea id="pl-notas" rows="2" placeholder="Orçamento, pendências, ideias…">${esc(p.notasInternas || '')}</textarea>`)}`;
}
function ajustarForm() {
  const cat = val('pl-cat'), cfg = CATEGORIAS_PLAN[cat]; if (!cfg) return;
  const show = (id, on) => { const el = document.getElementById(id); if (el) el.hidden = !on; };
  show('pl-subtipo-wrap', !!cfg.subtipos);
  show('pl-vagas-wrap', cfg.destino === 'oportunidade');
  show('pl-orient-wrap', cat === 'Estágio');
  show('pl-part-wrap', cfg.destino === 'evento');
}
acao('plCat', ajustarForm);
acao('plCert', () => { });
acao('plSoSel', (d, el) => { document.getElementById('pl-part-lista').hidden = !el.checked; });
function abrirForm(p) {
  abrirModal({ titulo: p && p.id ? 'Editar planejamento' : 'Novo planejamento', largura: 720,
    corpo: formPlano(p || {}) + `<div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn(p && p.id ? 'Salvar' : 'Salvar no planejamento', 'salvarPlano', { classe: 'btn-pri', icone: 'check', dados: { id: (p && p.id) || '' } })}</div>` });
  ajustarForm();
}
acao('novoPlano', () => abrirForm(null));
acao('editarPlano', ({ id }) => abrirForm(achar(id)));
acao('duplicarPlano', ({ id }) => { const p = achar(id); abrirForm({ ...p, id: '', titulo: p.titulo + ' (cópia)', data: '', status: 'planejado' }); });

acao('salvarPlano', async ({ id }, botao) => {
  const titulo = val('pl-titulo'); if (!titulo) { toast('Informe o título.', 'erro'); return; }
  const categoria = val('pl-cat'), cfg = CATEGORIAS_PLAN[categoria];
  const soSel = val('pl-so-sel') && cfg.destino === 'evento';
  const hora = val('pl-hora'), fim = val('pl-fim');
  const dados = {
    titulo, categoria, subtipo: cfg.subtipos ? val('pl-subtipo') : '', eixos: lerEixos('pl-eixos'), docente: val('pl-docente'),
    data: val('pl-data'), hora, horaFim: fim, local: val('pl-local'), link: val('pl-link'),
    certifica: val('pl-certifica'), cargaHoraria: Number(val('pl-carga')) || (hora && fim ? horasEntre(hora, fim) : 0),
    vagas: cfg.destino === 'oportunidade' ? (Number(val('pl-vagas')) || 1) : 0,
    orientacoes: categoria === 'Estágio' ? val('pl-orient') : '',
    descHtml: lerEditor('pl-desc'), notasInternas: val('pl-notas'),
    participantes: soSel ? [...document.querySelectorAll('input[name="pl-part"]:checked')].map(i => i.value) : [],
    cargos: cfg.cargos
  };
  botao.disabled = true;
  try {
    if (id) await Data.update(`planejamento/${id}`, { ...dados, editadoEm: Date.now() });
    else await Data.add('planejamento', { ...dados, status: 'planejado', criadoPor: S.uid, criadoEm: Date.now() });
    fecharModal(); toast(id ? 'Planejamento atualizado.' : 'Salvo no planejamento (ainda invisível para os membros).', 'ok');
  } catch (e) { toast('Erro ao salvar: ' + e.message, 'erro'); botao.disabled = false; }
});
acao('apagarPlano', async ({ id }) => {
  const p = achar(id);
  const msg = statusDe(p) === 'confirmado' ? 'Remover do planejamento? O que já foi publicado continua publicado.' : `Excluir "${p.titulo}" do planejamento?`;
  if (await confirmar(msg, { ok: 'Excluir', perigo: true })) Data.del(`planejamento/${id}`);
});

function pendencias(p) {
  const cfg = cfgDe(p), falta = [];
  if (!p.data && cfg.destino !== 'oportunidade') falta.push('data');
  if (cfg.destino === 'aula' && !p.hora) falta.push('horário de início');
  if (p.categoria === 'Estágio') { if (!p.data) falta.push('data'); if (!p.hora || !p.horaFim) falta.push('horário de início e fim'); if (!p.local) falta.push('local'); }
  return [...new Set(falta)];
}
acao('confirmarPlano', ({ id }) => {
  const p = achar(id), cfg = cfgDe(p);
  const falta = pendencias(p);
  if (falta.length) { toast(`Complete antes de confirmar: ${falta.join(', ')}.`, 'erro', 5000); abrirForm(p); return; }
  const aud = cfg.destino === 'evento' && (p.participantes || []).length ? { pref: 'reunioes', uids: p.participantes } : { pref: cfg.destino === 'aula' ? 'aulas' : (cfg.destino === 'oportunidade' ? 'oportunidades' : 'reunioes'), todos: true, eixos: p.eixos };
  const n = publico(aud).length;
  abrirModal({ titulo: 'Confirmar e publicar', largura: 480, corpo: `
    <p><b>${esc(p.titulo)}</b></p>
    <ul class="passos">
      <li>Será publicado em <b>${DESTINO_PLAN[cfg.destino]}</b>${cfg.destino === 'evento' ? ' (aparece na agenda' + ((p.participantes || []).length ? ' dos participantes)' : ' de todos)') : ''}.</li>
      <li>${n} pessoa(s) serão notificadas.</li>
      ${p.certifica ? `<li>Marcado como <b>com certificado</b>${p.cargaHoraria ? ` (${p.cargaHoraria}h)` : ''}.</li>` : ''}
      <li>As <b>notas internas</b> não serão publicadas.</li>
    </ul>
    <div class="acoes-form">${btn('Voltar', 'fecharModal')}${btn('Confirmar e publicar', 'publicarPlano', { classe: 'btn-pri', icone: 'sino', dados: { id } })}</div>` });
});

acao('publicarPlano', async ({ id }, botao) => {
  const p = achar(id); if (!p || statusDe(p) === 'confirmado') return;
  const cfg = cfgDe(p), agora = Date.now();
  botao.disabled = true; botao.textContent = 'Publicando…';
  try {
    let publicadoId, url, titulo, corpo;
    if (cfg.destino === 'aula') {
      publicadoId = await Data.add('aulas', { titulo: p.titulo, professor: p.docente || '', data: p.data, hora: p.hora, local: p.local || p.link || '', cargaHoraria: p.cargaHoraria || 0, eixos: p.eixos || ['clinica'], imagem: '', descHtml: p.descHtml || '', tipo: p.categoria, certifica: !!p.certifica, seguidores: [], presentes: null, certificadosEnviados: [], planejamentoId: id, criadoPor: S.uid, criadoEm: agora });
      url = '#/aulas'; titulo = `Nova ${p.categoria === 'Hands-on' ? 'atividade hands-on' : 'aula'}: ${p.titulo}`; corpo = `${dataExtensa(p.data)} às ${p.hora}${p.docente ? ' · ' + p.docente : ''}`;
      await notificar({ tipo: 'aula', pref: 'aulas', todos: true, eixos: p.eixos, titulo, corpo, url });
    } else if (cfg.destino === 'oportunidade') {
      const tipo = p.categoria === 'Escrita' ? (p.subtipo === 'Resumo' ? 'Resumo' : 'Artigo') : cfg.op;
      const base = { tipo, titulo: p.titulo, eixos: p.eixos || ['clinica'], local: p.local || '', vagas: p.vagas || 1, certifica: !!p.certifica, planejamentoId: id, criadoPorCargo: cfg.cargos[0], criadoPor: S.uid, fases: getFasesPadrao(tipo), faseAtual: 0, inscritos: [], confirmados: [], presencas: [], atualizacoes: [], projetoId: null, criadoEm: agora };
      const extra = tipo === 'Estágio'
        ? { data: p.data, horaInicio: p.hora, horaFim: p.horaFim, cargaHoraria: p.cargaHoraria || horasEntre(p.hora, p.horaFim), orientacoes: p.orientacoes || '' }
        : { descricao: textoPuro(p.descHtml || ''), orientador: p.docente || '', link: p.link || '' };
      publicadoId = await Data.add('oportunidades', { ...base, ...extra });
      url = '#/oportunidades'; titulo = `Nova oportunidade: ${p.titulo}`;
      corpo = tipo === 'Estágio' ? `${isoParaBR(p.data)} · ${p.hora}–${p.horaFim} · ${p.vagas || 1} vaga(s)` : `${tipo} · ${p.vagas || 1} vaga(s)`;
      await notificar({ tipo: 'oportunidade', pref: 'oportunidades', todos: true, eixos: p.eixos, titulo, corpo, url });
    } else {
      publicadoId = await Data.add('eventosLiga', { titulo: p.titulo, categoria: p.categoria, data: p.data, hora: p.hora || '', horaFim: p.horaFim || '', local: p.local || '', link: p.link || '', docente: p.docente || '', descHtml: p.descHtml || '', eixos: p.eixos || ['clinica'], certifica: !!p.certifica, cargaHoraria: p.cargaHoraria || 0, participantes: p.participantes || [], planejamentoId: id, criadoPor: S.uid, criadoEm: agora });
      url = `#/agenda/${p.data}`; titulo = `${p.categoria === 'Reunião' ? 'Reunião marcada' : 'Novo evento'}: ${p.titulo}`; corpo = `${dataExtensa(p.data)}${p.hora ? ' às ' + p.hora : ''}${p.local ? ' · ' + p.local : ''}`;
      const aud = (p.participantes || []).length ? { uids: p.participantes } : { todos: true, eixos: p.eixos };
      await notificar({ tipo: 'evento', pref: 'reunioes', titulo, corpo, url, ...aud });
    }
    await Data.update(`planejamento/${id}`, { status: 'confirmado', confirmadoEm: agora, confirmadoPor: S.uid, publicado: { destino: cfg.destino, id: publicadoId } });
    fecharModal(); toast('Confirmado e publicado para os membros!', 'ok', 4500);
  } catch (e) { console.error(e); toast('Não foi possível publicar: ' + (e.code || e.message), 'erro', 6000); botao.disabled = false; botao.textContent = 'Confirmar e publicar'; }
});

export default { titulo: 'Planejamento', render, visivel: (u) => P.planejar(u) };
