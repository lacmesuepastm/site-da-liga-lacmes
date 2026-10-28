import { Data, F } from '../data.js';
import { S, nomeDe, usuariosAtivos } from '../store.js';
import { P, CARGOS, CATEGORIAS, categoriaBadge, eixosChips, eixoPicker, lerEixos, getFasesPadrao, EIXOS } from '../dominio.js';
import { ic, esc, acao, avatar, abrirModal, fecharModal, confirmar, toast, val, opcoes, novoId, isoParaBR, dataExtensa, horasEntre, hojeISO, fmtDataHora, rerender } from '../util.js';
import { cabecalho, vazio, btn, btnIc, campo, linhaCampos, faseTracker, faseBadge, meta, seletorPessoas, abas } from '../ui.js';
import { notificar } from '../notificar.js';
import { criarCertificados, horasEstagio } from '../cert.js';
import { avisarAlteracao, mudancasEntre, botoesGestao } from '../eventos.js';
import { anexar, iconeArquivo, botaoAbrir } from '../arquivos.js';

const filtro = { tipo: 'todas', eixo: null };
const lista = () => Object.values(S.oportunidades).sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));

export function cardOportunidade(o) {
  const inscrito = (o.inscritos || []).includes(S.uid), confirmado = (o.confirmados || []).includes(S.uid);
  const fechadas = o.faseAtual > 0;
  const estagio = o.tipo === 'Estágio';
  let acaoHTML;
  if (confirmado) acaoHTML = `<span class="status status-fim">${ic('concluido')}Você está confirmado(a)</span>`;
  else if (inscrito) acaoHTML = btn('Cancelar inscrição', 'cancelarInscricao', { dados: { id: o.id } });
  else if (o.cancelada) acaoHTML = `<span class="status" style="color:var(--danger)">${ic('alerta')}Cancelada</span>`;
  else if (!fechadas) acaoHTML = btn('Inscrever-se', 'inscrever', { classe: 'btn-pri', icone: 'check', dados: { id: o.id } });
  else acaoHTML = '<span class="mudo">Inscrições encerradas</span>';
  const vagas = `${(o.confirmados || []).length}/${o.vagas} vaga(s)`;
  const metaHTML = estagio
    ? meta('calendario', o.data ? dataExtensa(o.data) : '') + meta('relogio', `${esc(o.horaInicio || '')}${o.horaFim ? '–' + esc(o.horaFim) : ''}`) + meta('local', esc(o.local || '')) + meta('vagas', vagas)
    : meta('usuario', esc(o.orientador || '')) + meta('local', esc(o.local || '')) + meta('vagas', vagas) + (o.link ? meta('link', `<a href="${esc(o.link)}" target="_blank" rel="noopener">Link</a>`) : '');
  const ultima = (o.atualizacoes || []).slice(-1)[0];
  return `<div class="card card-oport" style="--tc:${(CATEGORIAS[o.tipo] || {}).cor}">
    <div class="co-topo">${categoriaBadge(o.tipo)}${faseBadge(o)}</div>
    ${o.cancelada ? `<div class="aviso-cancelado">${ic('alerta')}<div><b>Cancelada</b>${o.motivoCancelamento ? `<p>${esc(o.motivoCancelamento)}</p>` : ''}</div></div>` : ''}
    <h3>${esc(o.titulo)}</h3>
    ${eixosChips(o.eixos, { mini: true })}
    ${o.descricao ? `<p class="cp-resumo">${esc(o.descricao)}</p>` : ''}
    <div class="meta">${metaHTML}</div>
    ${faseTracker(o)}
    ${estagio && confirmado && o.orientacoes ? `<div class="aviso-ok">${ic('info')}<div><b>Orientações para você</b><p>${esc(o.orientacoes)}</p></div></div>` : ''}
    ${ultima && (inscrito || confirmado) ? `<div class="atualizacao">${ic('sino')}<div><small>${fmtDataHora(ultima.em)} · ${esc(nomeDe(ultima.autor))}</small><p>${esc(ultima.texto)}</p>${ultima.anexoUrl ? `<span class="anexo-chip">${iconeArquivo(ultima.anexoNome, ultima.anexoUrl)}<span>${esc(ultima.anexoNome || 'Anexo')}</span>${botaoAbrir(ultima.anexoUrl, ultima.anexoNome || 'anexo')}</span>` : ''}</div></div>` : ''}
    <div class="acoes-linha esq">${acaoHTML}${o.projetoId && confirmado ? `<a class="btn" href="#/projetos/${o.projetoId}/chat">${ic('pasta')}Abrir grupo</a>` : ''}</div>
  </div>`;
}
acao('inscrever', async ({ id }) => {
  const o = S.oportunidades[id];
  await Data.update(`oportunidades/${id}`, { inscritos: F.arrayUnion(S.uid) });
  toast('Inscrição enviada! Você será avisado(a) quando houver confirmação.', 'ok');
  const resp = o.criadoPor ? [o.criadoPor] : [];
  notificar({ tipo: 'inscricao', uids: resp, titulo: `Nova inscrição em ${o.titulo}`, corpo: S.eu.nome, url: '#/painel' });
});
acao('cancelarInscricao', async ({ id }) => { await Data.update(`oportunidades/${id}`, { inscritos: F.arrayRemove(S.uid) }); });

function renderPublico() {
  let l = lista();
  if (filtro.tipo !== 'todas') l = l.filter(o => o.tipo === filtro.tipo);
  if (filtro.eixo) l = l.filter(o => (o.eixos || ['clinica']).includes(filtro.eixo));
  const abertas = l.filter(o => o.faseAtual === 0 && !o.cancelada), outras = l.filter(o => o.faseAtual > 0 || o.cancelada);
  return `${cabecalho('Oportunidades', 'Editais de pesquisa, extensão, artigos, resumos e estágios abertos pela diretoria.')}
    <div class="filtros"><div class="seg">${['todas', ...Object.keys(CATEGORIAS)].map(t => `<button class="seg-btn ${filtro.tipo === t ? 'ativo' : ''}" data-action="opFiltro" data-tipo="${t}">${t === 'todas' ? 'Todas' : t}</button>`).join('')}</div></div>
    <div class="filtro-eixos">${EIXOS.map(e => `<button class="eixo-filtro ${filtro.eixo === e.id ? 'ativo' : ''}" style="--ec:${e.c};--eb:${e.b}" data-action="opEixo" data-eixo="${e.id}">${e.svg}<span>${esc(e.nome)}</span></button>`).join('')}</div>
    <h4 class="sec-titulo">Inscrições abertas (${abertas.length})</h4>
    <div class="grade-cards largos">${abertas.map(cardOportunidade).join('') || vazio('Nenhuma inscrição aberta com esses filtros.', 'maleta')}</div>
    ${outras.length ? `<h4 class="sec-titulo">Em andamento ou encerradas</h4><div class="grade-cards largos">${outras.map(cardOportunidade).join('')}</div>` : ''}`;
}
acao('opFiltro', ({ tipo }) => { filtro.tipo = tipo; rerender(); });
acao('opEixo', ({ eixo }) => { filtro.eixo = filtro.eixo === eixo ? null : eixo; rerender(); });

function renderInscricoes() {
  const minhas = lista().filter(o => (o.inscritos || []).includes(S.uid) || (o.confirmados || []).includes(S.uid));
  const conf = minhas.filter(o => o.confirmados.includes(S.uid)), aguard = minhas.filter(o => !o.confirmados.includes(S.uid));
  return `${cabecalho('Minhas inscrições', 'Acompanhe as fases das oportunidades em que você se inscreveu.')}
    ${!minhas.length ? vazio('Você ainda não se inscreveu em nenhuma oportunidade.', 'ticket') : ''}
    ${conf.length ? `<h4 class="sec-titulo">Confirmado(a) (${conf.length})</h4><div class="grade-cards largos">${conf.map(cardOportunidade).join('')}</div>` : ''}
    ${aguard.length ? `<h4 class="sec-titulo">Aguardando seleção (${aguard.length})</h4><div class="grade-cards largos">${aguard.map(cardOportunidade).join('')}</div>` : ''}`;
}

let cargoPainel = null;
function cargosPainel() { return P.admin(S.eu) ? Object.keys(CARGOS).filter(c => CARGOS[c].tipos.length) : (CARGOS[S.eu.cargo]?.tipos.length ? [S.eu.cargo] : []); }

function cardGestao(o) {
  const estagio = o.tipo === 'Estágio';
  const linhas = (o.inscritos || []).map(uid => {
    const u = S.usuarios[uid]; if (!u) return '';
    const conf = o.confirmados.includes(uid);
    const presente = (o.presencas || []).includes(uid);
    const vezes = Object.values(S.oportunidades).filter(x => x.tipo === 'Estágio' && x.confirmados.includes(uid)).length;
    return `<div class="inscrito ${conf ? 'conf' : ''}">${avatar(u, 30)}<div class="li-txt"><strong>${esc(u.nome)}</strong><small>${estagio ? `${vezes} estágio(s) confirmado(s) · ${horasEstagio(uid)}h` : esc(u.email || '')}</small></div>
      ${conf && estagio && o.data && o.data <= hojeISO() ? `<label class="chk pequeno"><input type="checkbox" ${presente ? 'checked' : ''} data-change="presencaEstagio" data-id="${o.id}" data-uid="${uid}"><span>Compareceu</span></label>` : ''}
      ${conf ? btn('Remover', 'desconfirmar', { classe: 'btn-peq', dados: { id: o.id, uid } }) : btn('Confirmar', 'confirmar', { classe: 'btn-peq btn-pri', dados: { id: o.id, uid } })}</div>`;
  }).join('');
  return `<div class="card card-gestao" style="--tc:${(CATEGORIAS[o.tipo] || {}).cor}">
    <div class="co-topo">${categoriaBadge(o.tipo)}${faseBadge(o)}<span class="flex1"></span>${btnIc('lapis', 'editarOport', { id: o.id }, 'Editar')}${btnIc('lixeira', 'apagarOport', { id: o.id }, 'Excluir')}</div>
    <h3>${esc(o.titulo)}</h3>${eixosChips(o.eixos, { mini: true })}
    <div class="meta">${estagio ? meta('calendario', isoParaBR(o.data)) + meta('relogio', `${esc(o.horaInicio)}–${esc(o.horaFim)} (${o.cargaHoraria || 0}h)`) : meta('usuario', esc(o.orientador || ''))}${meta('local', esc(o.local || ''))}${meta('vagas', `${o.confirmados.length}/${o.vagas} confirmados`)}</div>
    ${faseTracker(o)}
    <div class="acoes-linha esq">${btn('Fase anterior', 'fase', { icone: 'esq', classe: 'btn-peq', dados: { id: o.id, d: -1 } })}${btn('Próxima fase', 'fase', { icone: 'dir', classe: 'btn-peq', dados: { id: o.id, d: 1 } })}
      ${btn('Atualização', 'novaAtualizacao', { icone: 'sino', classe: 'btn-peq', dados: { id: o.id } })}
      ${botoesGestao('oportunidade', o.id, o.cancelada)}
      ${!estagio ? (o.projetoId ? `<a class="btn btn-peq" href="#/projetos/${o.projetoId}/chat">${ic('pasta')}Abrir grupo</a>` : (o.confirmados.length ? btn('Criar grupo do projeto', 'criarGrupo', { icone: 'pasta', classe: 'btn-peq btn-pri', dados: { id: o.id } }) : '')) : ''}</div>
    <h5 class="sec-titulo">Inscritos (${(o.inscritos || []).length})</h5>${linhas || '<p class="mudo">Ninguém se inscreveu ainda.</p>'}
  </div>`;
}

function renderPainel() {
  const cargos = cargosPainel();
  if (!cargos.length) return `${cabecalho('Painel da diretoria')}${vazio('Seu cargo não possui painel de oportunidades. Use as páginas Fórum, Aulas, Financeiro ou Atas conforme sua diretoria.', 'painel')}`;
  if (!cargos.includes(cargoPainel)) cargoPainel = cargos[0];
  const cfg = CARGOS[cargoPainel];
  const minhas = lista().filter(o => cfg.tipos.includes(o.tipo));
  const estagios = cargoPainel === 'Diretor de Estágios';
  return `${cabecalho(cfg.painel, 'Crie editais, confirme inscritos, avance fases e certifique.',
    (estagios ? btn('Certificar estágios', 'certificarEstagios', { icone: 'certificado' }) : '') + btn(estagios ? 'Novo estágio' : 'Nova oportunidade', 'novaOport', { icone: 'mais', classe: 'btn-pri', dados: { cargo: cargoPainel } }))}
    ${cargos.length > 1 ? abas(cargos.map(c => ({ id: c, nome: CARGOS[c].painel, icone: CARGOS[c].icone })), cargoPainel, 'abaPainel') : ''}
    <div class="lista-gestao">${minhas.map(cardGestao).join('') || vazio('Nenhum edital criado ainda.', 'maleta')}</div>`;
}
acao('abaPainel', ({ aba }) => { cargoPainel = aba; rerender(); });

function formOport(cargo, o = {}) {
  const tipos = CARGOS[cargo].tipos;
  const estagio = tipos.length === 1 && tipos[0] === 'Estágio';
  return `${tipos.length > 1 ? campo('Tipo', `<select id="no-tipo">${opcoes(tipos, o.tipo)}</select>`) : `<input type="hidden" id="no-tipo" value="${tipos[0]}">`}
    ${campo('Título', `<input id="no-titulo" value="${esc(o.titulo || '')}">`)}
    ${campo('Eixos', eixoPicker('no-eixos', o.eixos || []))}
    ${estagio ? `
      ${linhaCampos(campo('Data', `<input type="date" id="no-data" value="${esc(o.data || '')}">`), campo('Início', `<input type="time" id="no-ini" value="${esc(o.horaInicio || '')}">`), campo('Fim', `<input type="time" id="no-fim" value="${esc(o.horaFim || '')}">`))}
      <p class="dica">A carga horária é calculada pelo horário e o estágio entra na agenda de quem for confirmado(a). Na véspera, o app avisa automaticamente.</p>
      ${linhaCampos(campo('Local', `<input id="no-local" value="${esc(o.local || '')}">`), campo('Vagas', `<input type="number" id="no-vagas" min="1" value="${o.vagas || 1}">`))}
      ${campo('Orientações (só para confirmados)', `<textarea id="no-orient" rows="3">${esc(o.orientacoes || '')}</textarea>`)}`
    : `${campo('Descrição', `<textarea id="no-desc" rows="3">${esc(o.descricao || '')}</textarea>`)}
      ${linhaCampos(campo('Orientador(a)', `<input id="no-orientador" value="${esc(o.orientador || '')}">`), campo('Vagas', `<input type="number" id="no-vagas" min="1" value="${o.vagas || 1}">`))}
      ${linhaCampos(campo('Local', `<input id="no-local" value="${esc(o.local || '')}">`), campo('Link', `<input id="no-link" value="${esc(o.link || '')}" placeholder="https://">`))}`}`;
}
acao('novaOport', ({ cargo }) => abrirModal({ titulo: cargo === 'Diretor de Estágios' ? 'Novo estágio' : 'Nova oportunidade', largura: 640, corpo: formOport(cargo) + `<div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Publicar e notificar', 'salvarOport', { classe: 'btn-pri', icone: 'sino', dados: { cargo } })}</div>` }));
acao('editarOport', ({ id }) => { const o = S.oportunidades[id]; const cargo = Object.keys(CARGOS).find(c => CARGOS[c].tipos.includes(o.tipo)); abrirModal({ titulo: 'Editar', largura: 640, corpo: formOport(cargo, o) + `<div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Salvar', 'salvarOport', { classe: 'btn-pri', dados: { cargo, id } })}</div>` }); });
acao('salvarOport', async ({ cargo, id }) => {
  const tipo = val('no-tipo'), titulo = val('no-titulo');
  if (!titulo) { toast('Informe o título.', 'erro'); return; }
  const d = { tipo, titulo, eixos: lerEixos('no-eixos'), local: val('no-local'), vagas: Number(val('no-vagas')) || 1 };
  if (tipo === 'Estágio') Object.assign(d, { data: val('no-data'), horaInicio: val('no-ini'), horaFim: val('no-fim'), cargaHoraria: horasEntre(val('no-ini'), val('no-fim')), orientacoes: val('no-orient') });
  else Object.assign(d, { descricao: val('no-desc'), orientador: val('no-orientador'), link: val('no-link') });
  if (id) {
    const antes = S.oportunidades[id];
    await Data.update(`oportunidades/${id}`, d);
    fecharModal();
    if (antes) await avisarAlteracao('oportunidade', antes, mudancasEntre('oportunidade', antes, d));
    return;
  }
  const nid = await Data.add('oportunidades', { ...d, criadoPorCargo: cargo, criadoPor: S.uid, fases: getFasesPadrao(tipo), faseAtual: 0, inscritos: [], confirmados: [], presencas: [], atualizacoes: [], projetoId: null, criadoEm: Date.now() });
  fecharModal(); toast('Publicado!', 'ok');
  notificar({ tipo: 'oportunidade', pref: 'oportunidades', todos: true, eixos: d.eixos, titulo: `Nova oportunidade: ${titulo}`, corpo: tipo === 'Estágio' ? `${isoParaBR(d.data)} · ${d.horaInicio}–${d.horaFim} · ${d.vagas} vaga(s)` : `${tipo} · ${d.vagas} vaga(s)`, url: '#/oportunidades' });
});
acao('apagarOport', async ({ id }) => { if (await confirmar(`Excluir "${S.oportunidades[id].titulo}"?`, { ok: 'Excluir', perigo: true })) Data.del(`oportunidades/${id}`); });
acao('confirmar', async ({ id, uid }) => {
  const o = S.oportunidades[id];
  if (o.confirmados.length >= o.vagas && !(await confirmar('As vagas já foram preenchidas. Confirmar mesmo assim?'))) return;
  await Data.update(`oportunidades/${id}`, { confirmados: [...new Set([...o.confirmados, uid])] });
  notificar({ tipo: 'confirmacao', uids: [uid], titulo: `Você foi confirmado(a) em: ${o.titulo}`, corpo: o.tipo === 'Estágio' ? `${dataExtensa(o.data)} · ${o.horaInicio} · ${o.local}` : 'Confira os próximos passos.', url: o.tipo === 'Estágio' ? '#/agenda' : '#/inscricoes' });
});
acao('desconfirmar', async ({ id, uid }) => { const o = S.oportunidades[id]; await Data.update(`oportunidades/${id}`, { confirmados: o.confirmados.filter(x => x !== uid), presencas: (o.presencas || []).filter(x => x !== uid) }); });
acao('presencaEstagio', async ({ id, uid }, el) => { const o = S.oportunidades[id]; const set = new Set(o.presencas || []); el.checked ? set.add(uid) : set.delete(uid); await Data.update(`oportunidades/${id}`, { presencas: [...set] }); });
acao('fase', async ({ id, d }) => {
  const o = S.oportunidades[id]; const nova = Math.min(Math.max(o.faseAtual + Number(d), 0), o.fases.length - 1);
  if (nova === o.faseAtual) return;
  await Data.update(`oportunidades/${id}`, { faseAtual: nova });
  notificar({ tipo: 'fase', uids: [...new Set([...(o.inscritos || []), ...o.confirmados])], titulo: `${o.titulo}: ${o.fases[nova]}`, url: '#/inscricoes' });
});
acao('novaAtualizacao', ({ id }) => abrirModal({ titulo: 'Publicar atualização', largura: 480, corpo: `${campo('Texto', '<textarea id="atz-texto" rows="3"></textarea>')}
  ${campo('Anexar arquivo (PDF, Word, Excel, PowerPoint…)', '<input type="file" id="atz-arquivo" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.odt,.rtf,.txt,.zip,image/*">')}
  <p class="ou"><span>ou</span></p>
  ${linhaCampos(campo('Nome do link', '<input id="atz-nome">'), campo('Link', '<input id="atz-url" placeholder="https://">'))}
  <div class="acoes-form">${btn('Publicar', 'salvarAtualizacao', { classe: 'btn-pri', dados: { id } })}</div>` }));
acao('salvarAtualizacao', async ({ id }, botao) => {
  const texto = val('atz-texto'); if (!texto) return; const o = S.oportunidades[id];
  let anexoNome = val('atz-nome'), anexoUrl = val('atz-url');
  const f = document.getElementById('atz-arquivo').files[0];
  botao.disabled = true;
  try { if (f) { const r = await anexar(f, { pasta: `oportunidades/${id}` }); anexoNome = r.nome; anexoUrl = r.url; } }
  catch (e) { toast(e.message, 'erro', 7000); botao.disabled = false; return; }
  await Data.update(`oportunidades/${id}`, { atualizacoes: [...(o.atualizacoes || []), { texto, anexoNome, anexoUrl, em: Date.now(), autor: S.uid }] });
  fecharModal();
  notificar({ tipo: 'atualizacao', uids: [...new Set([...(o.inscritos || []), ...o.confirmados])], titulo: `Atualização: ${o.titulo}`, corpo: texto.slice(0, 100), url: '#/inscricoes' });
});
acao('criarGrupo', async ({ id }) => {
  const o = S.oportunidades[id];
  if (!(await confirmar(`Criar o grupo "${o.titulo}" com ${o.confirmados.length} membro(s)?`))) return;
  const membros = o.confirmados.map(uid => ({ uid, papel: 'Pesquisador' })).concat(o.criadoPor && !o.confirmados.includes(o.criadoPor) ? [{ uid: o.criadoPor, papel: 'Coordenador' }] : []);
  const pid = await Data.add('projetos', { titulo: o.titulo, categoria: o.tipo, eixos: o.eixos || ['clinica'], desc: o.descricao || '', orientador: o.orientador || '', orientadorUid: null, idProj: `${o.tipo.slice(0, 4).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`, acesso: '', membros, membroIds: membros.map(m => m.uid), tarefas: [], escala: {}, arquivos: [], reunioes: [], coleta: [], concluido: false, cargaHoraria: 0, certificadosEnviados: [], oportunidadeId: id, criadoPor: S.uid, criadoEm: Date.now() });
  const idx = o.fases.indexOf('Em execução');
  await Data.update(`oportunidades/${id}`, { projetoId: pid, faseAtual: idx > -1 ? idx : o.faseAtual });
  notificar({ tipo: 'projeto', uids: o.confirmados, titulo: `Grupo criado: ${o.titulo}`, corpo: 'Acesse o chat da equipe.', url: `#/projetos/${pid}/chat` });
  location.hash = `#/projetos/${pid}/membros`;
});
acao('certificarEstagios', () => {
  const comHoras = usuariosAtivos().filter(u => horasEstagio(u.id) > 0);
  if (!comHoras.length) { toast('Ninguém com horas de estágio confirmadas ainda.', 'info'); return; }
  abrirModal({ titulo: 'Certificar estágios', largura: 560, corpo: `<p class="mudo">Soma a carga de todos os estágios em que a pessoa foi confirmada (e marcada como presente, quando houver chamada).</p>
    <div class="sp-lista">${comHoras.map(u => `<label class="pessoa-opcao"><input type="checkbox" name="ce-uids" value="${u.id}" checked>${avatar(u, 26)}<span class="po-nome">${esc(u.nome)}<small>${horasEstagio(u.id)}h</small></span>${ic('check', 'po-check')}</label>`).join('')}</div>
    <div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Gerar certificados', 'gerarCertEstagio', { classe: 'btn-pri', icone: 'certificado' })}</div>` });
});
acao('gerarCertEstagio', async () => {
  const uids = [...document.querySelectorAll('input[name="ce-uids"]:checked')].map(i => i.value); if (!uids.length) return;
  await criarCertificados(uids.map(userId => ({ userId, tipo: 'Estagio', cargaHoraria: horasEstagio(userId) })));
  fecharModal(); toast(`${uids.length} certificado(s) solicitado(s) à Presidência.`, 'ok');
});

export const oportunidades = { titulo: 'Oportunidades', render: renderPublico };
export const inscricoes = { titulo: 'Minhas inscrições', render: renderInscricoes };
export const painel = { titulo: 'Painel da diretoria', render: renderPainel, visivel: (u) => P.admin(u) || !!(u && CARGOS[u.cargo] && CARGOS[u.cargo].tipos.length) };
