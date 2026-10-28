import { Data } from '../data.js';
import { S, nomeDe, usuariosAtivos } from '../store.js';
import { P } from '../dominio.js';
import { ic, esc, acao, abrirModal, fecharModal, confirmar, toast, val, opcoes, fmtDataHora, isoParaBR, hojeISO, baixarBlob, rerender } from '../util.js';
import { cabecalho, vazio, btn, btnIc, campo, linhaCampos, abas, meta, seletorPessoas } from '../ui.js';
import { STATUS, PAPEIS, REFS, rotuloCert, cpfValido, formatarCPF, mascararCPF, soDigitos, cpfDe, criarLote, emitirCertificado, cancelarCertificado, removerLote, dividirPDF, gerarPDFLote, previa, baixar, minhaAssinatura } from '../cert.js';

export const resetarCacheAssinatura = () => { };

const filtroTodos = { status: 'todos', busca: '' };
const wiz = { rows: [], signs: [], descartar: [], refId: null };

const pill = (s) => `<span class="pill" style="--c:${(STATUS[s] || {}).cor}">${(STATUS[s] || {}).nome || s}</span>`;
const slug = (t) => String(t || 'lote').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'lote';

function cardMeu(c) {
  const pronto = c.status === 'emitido';
  return `<div class="card card-cert ${pronto ? 'emitido' : ''}">
    <div class="cc-icone">${ic('certificado')}</div>
    <div class="cc-corpo"><h3>${esc(rotuloCert(c))}</h3>
      <div class="meta">${meta('relogio', `${c.cargaHoraria || 0}h`)}${meta('calendario', pronto ? 'Emitido em ' + fmtDataHora(c.emitidoEm).slice(0, 10) : 'Pedido em ' + fmtDataHora(c.criadoEm).slice(0, 10))}${pronto ? meta('escudo', `<code>${esc(c.codigo)}</code>`) : ''}</div>
      <div class="acoes-linha esq">${pronto
        ? `${btn('Baixar PDF', 'baixarCert', { classe: 'btn-pri', icone: 'baixar', dados: { id: c.id } })}<a class="btn" href="verificar.html?c=${esc(c.codigo)}" target="_blank">${ic('escudo')}Verificação pública</a>`
        : `<span class="mudo">${c.status === 'aguardando_assinatura' ? 'Em assinatura. Você será avisado(a) quando estiver pronto.' : 'Solicitado. Aguardando a Presidência.'}</span>`}</div>
    </div></div>`;
}

function abaSolicitacoes() {
  const l = S.certificados.filter(c => c.status === 'solicitado');
  if (!l.length) return vazio('Nenhuma solicitação. Quando a diretoria pedir certificados (aulas, projetos, estágios), eles chegam aqui para você montar o lote.', 'ticket');
  return `<p class="mudo">Pedidos feitos pela diretoria. Marque e crie um lote: você escolhe quem assina e envia direto aos alunos.</p>
    <div class="aba-cab"><label class="chk pequeno"><input type="checkbox" data-change="selTodasSol"><span>Selecionar todas</span></label>
      <span class="acoes-linha">${btn('Descartar', 'descartarSol', { classe: 'btn-perigo-txt', icone: 'lixeira' })}${btn('Criar lote com as selecionadas', 'novoLoteSel', { classe: 'btn-pri', icone: 'certificado' })}</span></div>
    <div class="fila">${l.map(c => `<label class="linha-cert"><input type="checkbox" class="sel-sol" value="${c.id}">
      <span class="lc-txt"><strong>${esc(c.nomeMembro)}</strong><small>${esc(rotuloCert(c))} · ${c.cargaHoraria || 0}h · pedido por ${esc(nomeDe(c.solicitadoPor))} ${fmtDataHora(c.criadoEm).slice(0, 10)}</small></span></label>`).join('')}</div>`;
}
acao('selTodasSol', (d, el) => document.querySelectorAll('.sel-sol').forEach(c => { c.checked = el.checked; }));
const selecionadas = () => [...document.querySelectorAll('.sel-sol:checked')].map(c => c.value);
acao('descartarSol', async () => {
  const ids = selecionadas(); if (!ids.length) { toast('Selecione ao menos uma solicitação.', 'erro'); return; }
  if (await confirmar(`Descartar ${ids.length} solicitação(ões)?`, { ok: 'Descartar', perigo: true })) await Data.batch(ids.map(id => ({ tipo: 'del', path: `certificados/${id}` })));
});

function abaLotes() {
  if (!S.lotes.length) return vazio('Nenhum lote ainda. Use "Novo lote" para emitir certificados.', 'pasta');
  return `<div class="lista-cards">${S.lotes.map(l => {
    const certs = S.certificados.filter(c => c.loteId === l.id);
    const emitidos = certs.filter(c => c.status === 'emitido').length;
    return `<a class="card card-lote" href="#/certificados/lote/${l.id}"><div class="cp-topo"><span class="tag-linha" style="--tc:#2b6cb0">${ic('pasta')}${esc((REFS[l.refKind] || REFS.livre).rot)}</span>${emitidos === certs.length && certs.length ? `<span class="status status-and">${ic('concluido')}Concluído</span>` : `<span class="rascunho">${ic('relogio')}${certs.length - emitidos} pendente(s)</span>`}</div>
      <h3>${esc(l.atividade)}</h3>
      <div class="meta">${meta('usuarios', `${certs.length} certificado(s)`)}${meta('concluido', `${emitidos} emitido(s)`)}${l.data ? meta('calendario', isoParaBR(l.data)) : ''}${meta('caneta', (l.signatarios || []).map(s => esc(s.nome)).join(', ') || 'sem signatários')}</div></a>`;
  }).join('')}</div>`;
}

function abaTodos() {
  let l = S.certificados.filter(c => c.status !== 'solicitado');
  if (filtroTodos.status !== 'todos') l = l.filter(c => c.status === filtroTodos.status);
  if (filtroTodos.busca) { const q = filtroTodos.busca.toLowerCase(); l = l.filter(c => `${c.nomeMembro} ${c.atividade} ${c.codigo}`.toLowerCase().includes(q)); }
  const cont = (s) => S.certificados.filter(c => c.status === s).length;
  return `<div class="stats">${['aguardando_assinatura', 'emitido', 'cancelado'].map(s => `<button class="stat ${filtroTodos.status === s ? 'ativo' : ''}" style="--c:${STATUS[s].cor}" data-action="filtroCert" data-s="${s}"><b>${cont(s)}</b><span>${STATUS[s].nome}</span></button>`).join('')}<button class="stat ${filtroTodos.status === 'todos' ? 'ativo' : ''}" data-action="filtroCert" data-s="todos"><b>${S.certificados.filter(c => c.status !== 'solicitado').length}</b><span>Todos</span></button></div>
    <div class="filtros"><span class="campo-busca">${ic('busca')}<input type="search" id="cert-busca" placeholder="Nome, atividade ou código…" value="${esc(filtroTodos.busca)}" data-input="buscaCert"></span></div>
    <div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Pessoa</th><th>Certificado</th><th>CH</th><th>Status</th><th></th></tr></thead><tbody>
    ${l.map(c => `<tr><td>${esc(c.nomeMembro)}<br><small class="mudo">${mascararCPF(c.cpf) || 'sem CPF'}</small></td><td>${esc(rotuloCert(c))}<br><small class="mudo"><code>${esc(c.codigo || '')}</code></small></td><td>${c.cargaHoraria || 0}h</td><td>${pill(c.status)}</td>
      <td class="td-acoes">${c.status === 'emitido' ? btnIc('baixar', 'baixarCert', { id: c.id }, 'Baixar') : btnIc('olho', 'previaCert', { id: c.id }, 'Prévia')}${c.loteId ? `<a class="btn-ic" href="#/certificados/lote/${c.loteId}" title="Abrir lote">${ic('pasta')}</a>` : ''}${c.status !== 'cancelado' ? btnIc('x', 'cancelarCert', { id: c.id }, 'Cancelar certificado') : ''}</td></tr>`).join('') || `<tr><td colspan="5">${vazio('Nenhum certificado.', 'certificado')}</td></tr>`}
    </tbody></table></div>`;
}
acao('filtroCert', ({ s }) => { filtroTodos.status = s; rerender(); });
let tBusca; acao('buscaCert', (d, el) => { clearTimeout(tBusca); tBusca = setTimeout(() => { filtroTodos.busca = el.value; rerender(); }, 250); });
acao('baixarCert', ({ id }) => baixar(S.certificados.find(c => c.id === id)));
acao('previaCert', ({ id }) => previa(S.certificados.find(c => c.id === id)));
acao('cancelarCert', async ({ id }) => {
  const c = S.certificados.find(x => x.id === id);
  if (await confirmar(`Cancelar o certificado de ${c.nomeMembro}? A verificação pública passa a indicar "cancelado".`, { ok: 'Cancelar certificado', perigo: true })) cancelarCertificado(c);
});

function renderLote(id) {
  const lote = S.lotes.find(l => l.id === id);
  const voltar = `<a class="voltar" href="#/certificados/lotes">${ic('voltar')} Lotes</a>`;
  if (!lote) return `${voltar}${vazio('Lote não encontrado.', 'pasta')}`;
  const certs = S.certificados.filter(c => c.loteId === id).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const pend = certs.filter(c => c.status === 'aguardando_assinatura');
  const emitidos = certs.filter(c => c.status === 'emitido').length;
  return `${voltar}${cabecalho(lote.atividade, `${esc((REFS[lote.refKind] || REFS.livre).rot)}${lote.data ? ' · ' + isoParaBR(lote.data) : ''}${lote.local ? ' · ' + esc(lote.local) : ''}`)}
    <div class="stats"><div class="stat"><b>${certs.length}</b><span>Certificados</span></div><div class="stat" style="--c:#1a7f5a"><b>${emitidos}</b><span>Emitidos</span></div><div class="stat" style="--c:#2b6cb0"><b>${pend.length}</b><span>Aguardando assinatura</span></div></div>
    <div class="card"><h5>Quem assina</h5><div class="signs-resumo">${(lote.signatarios || []).map(s => `<span class="sign-chip">${ic('caneta')}<span><b>${esc(s.nome)}</b><small>${esc(s.titulo)}</small></span></span>`).join('') || '<span class="mudo">Nenhum signatário definido.</span>'}</div></div>
    <div class="acoes-linha esq" style="margin:16px 0">
      ${btn('Baixar PDF do lote (para assinar)', 'baixarLote', { icone: 'baixar', dados: { id } })}
      <label class="btn btn-pri">${ic('subir')}<span>Enviar PDF do lote já assinado</span><input type="file" accept="application/pdf" hidden data-change="lnEnviarLote" data-id="${id}"></label>
      ${pend.length ? btn('Emitir digitalmente os pendentes', 'lnEmitirDigital', { icone: 'caneta', dados: { id } }) : ''}
      ${btn('Excluir lote', 'lnExcluir', { classe: 'btn-perigo-txt', icone: 'lixeira', dados: { id } })}</div>
    <p class="dica">Fluxo em papel: baixe o PDF do lote, imprima, assine, digitalize e envie o arquivo único (as páginas devem estar na mesma ordem da lista abaixo) ou envie o PDF assinado de cada pessoa na linha dela.</p>
    <div class="tabela-rolagem"><table class="tabela"><thead><tr><th>#</th><th>Pessoa</th><th>Papel</th><th>CH</th><th>Status</th><th></th></tr></thead><tbody>
    ${certs.map((c, i) => `<tr><td>${i + 1}</td><td>${esc(c.nomeMembro)}<br><small class="mudo">${mascararCPF(c.cpf) || 'sem CPF'}${c.userId ? '' : ' · externo'}</small></td><td>${esc(c.papel)}</td><td>${c.cargaHoraria || 0}h</td><td>${pill(c.status)}</td>
      <td class="td-acoes">${c.status === 'emitido' ? btnIc('baixar', 'baixarCert', { id: c.id }, 'Baixar PDF') : `${btnIc('olho', 'previaCert', { id: c.id }, 'Prévia')}<label class="btn btn-peq" title="Enviar o PDF assinado desta pessoa">${ic('subir')}<span>PDF assinado</span><input type="file" accept="application/pdf" hidden data-change="lnEnviar" data-id="${c.id}"></label>`}
        ${c.status !== 'emitido' && c.status !== 'cancelado' ? btnIc('lixeira', 'lnRemover', { id: c.id }, 'Tirar do lote') : ''}</td></tr>`).join('')}
    </tbody></table></div>`;
}

acao('baixarLote', async ({ id }) => {
  const certs = S.certificados.filter(c => c.loteId === id && c.status !== 'cancelado').sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const pend = certs.filter(c => c.status === 'aguardando_assinatura');
  const lista = pend.length ? pend : certs;
  if (!lista.length) return;
  try { baixarBlob(await gerarPDFLote(lista), `certificados-${slug(S.lotes.find(l => l.id === id).atividade)}.pdf`); }
  catch (e) { toast(e.message, 'erro'); }
});
acao('lnEnviar', async ({ id }, input) => {
  const f = input.files[0]; input.value = ''; if (!f) return;
  const c = S.certificados.find(x => x.id === id);
  toast('Enviando…', 'info', 1500);
  try { await emitirCertificado(c, { arquivo: f }); toast(`Certificado de ${c.nomeMembro} emitido.`, 'ok'); }
  catch (e) { toast(e.message, 'erro', 7000); }
});
acao('lnEnviarLote', async ({ id }, input) => {
  const f = input.files[0]; input.value = ''; if (!f) return;
  const pend = S.certificados.filter(c => c.loteId === id && c.status === 'aguardando_assinatura').sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  try {
    const paginas = await dividirPDF(f);
    if (paginas.length !== pend.length) { toast(`O PDF tem ${paginas.length} página(s), mas há ${pend.length} certificado(s) pendentes. Confira a ordem e a quantidade, ou envie o PDF de cada pessoa na linha dela.`, 'erro', 9000); return; }
    if (!(await confirmar(`Separar as ${paginas.length} páginas e enviar cada uma ao aluno correspondente (na ordem da lista)?`, { ok: 'Enviar' }))) return;
    for (let i = 0; i < pend.length; i++) {
      toast(`Enviando ${i + 1} de ${pend.length}…`, 'info', 1200);
      await emitirCertificado(pend[i], { arquivo: paginas[i] });
    }
    toast('Todos os certificados foram emitidos e enviados.', 'ok', 5000);
  } catch (e) { toast(e.message, 'erro', 8000); }
});
acao('lnEmitirDigital', async ({ id }, botao) => {
  const lote = S.lotes.find(l => l.id === id);
  const pend = S.certificados.filter(c => c.loteId === id && c.status === 'aguardando_assinatura').sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const img = await minhaAssinatura();
  const assinaturas = {};
  (lote.signatarios || []).forEach((s, i) => { if (s.uid === S.uid && img) assinaturas[i] = img; });
  if (!Object.keys(assinaturas).length && !(await confirmar('Sua assinatura cadastrada não será aplicada (você não está entre os signatários ou ainda não cadastrou em Meu perfil). Emitir mesmo assim, só com nomes e linhas?', { ok: 'Emitir' }))) return;
  botao.disabled = true;
  try {
    for (let i = 0; i < pend.length; i++) { botao.textContent = `Emitindo ${i + 1}/${pend.length}…`; await emitirCertificado(pend[i], { assinaturas }); }
    toast('Certificados emitidos e enviados.', 'ok');
  } catch (e) { toast(e.message, 'erro', 7000); }
  botao.disabled = false;
});
acao('lnRemover', async ({ id }) => { if (await confirmar('Tirar esta pessoa do lote?', { ok: 'Remover', perigo: true })) Data.del(`certificados/${id}`); });
acao('lnExcluir', async ({ id }) => {
  const lote = S.lotes.find(l => l.id === id), certs = S.certificados.filter(c => c.loteId === id);
  const comEmitidos = certs.some(c => c.status === 'emitido');
  if (!(await confirmar(comEmitidos ? 'Há certificados já emitidos neste lote: eles serão mantidos e o lote continua. Remover só os pendentes?' : 'Excluir o lote e todos os certificados pendentes?', { ok: 'Excluir', perigo: true }))) return;
  await removerLote(lote, certs);
  if (!comEmitidos) location.hash = '#/certificados/lotes';
});

function itensDe(kind) {
  if (kind === 'aula') return S.aulas.map(a => ({ id: a.id, label: `${a.titulo} · ${isoParaBR(a.data)}` }));
  if (kind === 'evento') return S.eventosLiga.map(e => ({ id: e.id, label: `${e.titulo} · ${isoParaBR(e.data)}` }));
  if (kind === 'acao') return Object.values(S.oportunidades).filter(o => o.tipo !== 'Estágio').map(o => ({ id: o.id, label: `${o.titulo} (${o.tipo})` }));
  if (kind === 'estagio') return Object.values(S.oportunidades).filter(o => o.tipo === 'Estágio').map(o => ({ id: o.id, label: `${o.titulo} · ${isoParaBR(o.data)}` }));
  if (kind === 'projeto') return Object.values(S.projetos).map(p => ({ id: p.id, label: `${p.titulo} (${p.categoria})` }));
  return [];
}

function dadosItem(kind, id) {
  if (kind === 'aula') { const a = S.aulas.find(x => x.id === id); return a && { atividade: a.titulo, data: a.data, local: a.local, ch: a.cargaHoraria }; }
  if (kind === 'evento') { const e = S.eventosLiga.find(x => x.id === id); return e && { atividade: e.titulo, data: e.data, local: e.local, ch: e.cargaHoraria }; }
  if (kind === 'acao' || kind === 'estagio') { const o = S.oportunidades[id]; return o && { atividade: o.titulo, data: o.data || '', local: o.local, ch: o.cargaHoraria }; }
  if (kind === 'projeto') { const p = S.projetos[id]; return p && { atividade: p.titulo, data: '', local: '', ch: p.cargaHoraria }; }
  return null;
}

function participantesDe(kind, id) {
  if (kind === 'aula') { const a = S.aulas.find(x => x.id === id); return a && { pessoas: (a.presentes || a.seguidores || []).map(uid => ({ uid, papel: 'Participante' })), docente: a.professor }; }
  if (kind === 'evento') { const e = S.eventosLiga.find(x => x.id === id); return e && { pessoas: (e.participantes || []).map(uid => ({ uid, papel: 'Participante' })), docente: e.docente }; }
  if (kind === 'acao') { const o = S.oportunidades[id]; return o && { pessoas: (o.confirmados || []).map(uid => ({ uid, papel: 'Participante' })), docente: o.orientador }; }
  if (kind === 'estagio') { const o = S.oportunidades[id]; return o && { pessoas: ((o.presencas || []).length ? o.presencas : (o.confirmados || [])).map(uid => ({ uid, papel: 'Participante' })), docente: '' }; }
  if (kind === 'projeto') { const p = S.projetos[id]; return p && { pessoas: (p.membros || []).map(m => ({ uid: m.uid, papel: ['Orientador', 'Coordenador'].includes(m.papel) ? 'Coordenador(a)' : 'Participante' })), docente: '' }; }
  return null;
}

function sugestoesSign() {
  const lista = [];
  const add = (nome, titulo, uid) => { if (nome && !lista.some(s => s.nome === nome)) lista.push({ nome, titulo, uid: uid || null }); };
  const pres = S.usuarios[S.config.presidenteUid] || (P.admin(S.eu) ? S.eu : null);
  if (pres) add(pres.nome, 'Presidente da LACMES', pres.id || S.uid);
  const ori = S.usuarios[S.config.orientadoraUid];
  add(ori ? ori.nome : S.config.orientadoraNome, 'Orientadora da LACMES', ori && ori.id);
  usuariosAtivos().filter(u => u.cargo).forEach(u => add(u.nome, `${u.cargo} da LACMES`, u.id));
  usuariosAtivos().filter(u => u.tipo === 'orientador').forEach(u => add(u.nome, 'Orientador(a) da LACMES', u.id));
  return lista;
}

function sincronizarRows() {
  document.querySelectorAll('#cw-rows .cw-row').forEach(el => {
    const r = wiz.rows[Number(el.dataset.i)]; if (!r) return;
    r.nome = el.querySelector('.cw-nome').value.trim(); r.cpf = el.querySelector('.cw-cpf').value;
    r.papel = el.querySelector('.cw-papel').value; r.ch = el.querySelector('.cw-ch').value;
  });
}
function sincronizarSigns() {
  document.querySelectorAll('#cw-signs .cw-sign').forEach(el => {
    const s = wiz.signs[Number(el.dataset.i)]; if (!s) return;
    s.nome = el.querySelector('.cs-nome').value.trim(); s.titulo = el.querySelector('.cs-titulo').value.trim();
  });
}

function desenharRows() {
  const box = document.getElementById('cw-rows'); if (!box) return;
  box.innerHTML = wiz.rows.length
    ? `<div class="cw-row cw-cab"><span>Nome</span><span>CPF</span><span>Papel</span><span>CH (h)</span><span></span></div>` + wiz.rows.map((r, i) => `<div class="cw-row" data-i="${i}">
        <input class="cw-nome" value="${esc(r.nome)}" ${r.uid ? 'readonly' : ''} placeholder="Nome completo">
        <input class="cw-cpf ${soDigitos(r.cpf) && !cpfValido(r.cpf) ? 'invalido' : ''}" value="${esc(formatarCPF(r.cpf))}" inputmode="numeric" maxlength="14" placeholder="CPF" data-input="cwCpf">
        <select class="cw-papel">${opcoes(PAPEIS, r.papel)}</select>
        <input class="cw-ch" type="number" min="0" step="0.5" value="${r.ch ?? ''}" placeholder="CH">
        ${btnIc('x', 'cwRemRow', { i }, 'Remover')}</div>`).join('')
    : `<p class="mudo">Ninguém adicionado ainda. Use as opções acima.</p>`;
  const cont = document.getElementById('cw-total'); if (cont) cont.textContent = wiz.rows.length;
}

function desenharSigns() {
  const box = document.getElementById('cw-signs'); if (!box) return;
  box.innerHTML = wiz.signs.map((s, i) => `<div class="cw-sign" data-i="${i}">
      <input class="cs-nome" value="${esc(s.nome)}" placeholder="Nome de quem assina">
      <input class="cs-titulo" value="${esc(s.titulo)}" placeholder="Título (ex.: Presidente da LACMES)">
      ${btnIc('x', 'cwRemSign', { i }, 'Remover')}</div>`).join('') || '<p class="mudo">Nenhum signatário. O certificado sai sem linhas de assinatura.</p>';
  const sug = sugestoesSign();
  const sel = document.getElementById('cw-sug');
  if (sel) sel.innerHTML = '<option value="">Adicionar signatário da liga…</option>' + sug.map((s, i) => `<option value="${i}">${esc(s.nome)} — ${esc(s.titulo)}</option>`).join('');
}

async function adicionarPessoas(lista, kind) {
  sincronizarRows();
  const chDefault = val('cw-ch');
  for (const p of lista) {
    if (p.uid) {
      if (wiz.rows.some(r => r.uid === p.uid)) continue;
      const u = S.usuarios[p.uid]; if (!u) continue;
      const membro = kind === 'membro';
      wiz.rows.push({ uid: p.uid, nome: u.nome, cpf: await cpfDe(p.uid), papel: membro ? (u.cargo ? 'Diretor(a) da LACMES' : 'Membro da LACMES') : p.papel, cargoTexto: membro ? (u.cargo || '') : '', ch: p.ch ?? chDefault });
    } else if (p.nome && !wiz.rows.some(r => !r.uid && r.nome === p.nome)) {
      wiz.rows.push({ uid: null, nome: p.nome, cpf: p.cpf || '', papel: p.papel, ch: p.ch ?? chDefault });
    }
  }
  desenharRows();
}

function formLote(ref = {}) {
  const tipos = Object.entries(REFS).map(([v, o]) => ({ v, t: o.rot }));
  return `<div class="bloco-form"><div class="bf-cab"><h5>${ic('pasta')} 1. Atividade</h5></div>
      ${linhaCampos(campo('Tipo', `<select id="cw-kind" data-change="cwKind">${opcoes(tipos, ref.kind || 'livre')}</select>`),
        `<div id="cw-item-wrap">${campo('Escolher do sistema (opcional)', '<select id="cw-item" data-change="cwItem"></select>')}</div>`)}
      ${campo('Nome da atividade (como aparece no certificado)', `<input id="cw-atividade" value="${esc(ref.atividade || '')}" placeholder="Ex.: Simpósio de Cardiologia">`)}
      ${linhaCampos(campo('Data', `<input type="date" id="cw-data" value="${esc(ref.data || '')}">`), campo('ou período — início', '<input type="date" id="cw-ini">'), campo('fim', '<input type="date" id="cw-fim">'))}
      ${linhaCampos(campo('Local', `<input id="cw-local" value="${esc(ref.local || '')}">`), campo('Carga horária padrão (h)', `<input type="number" id="cw-ch" min="0" step="0.5" value="${ref.ch || ''}">`))}
    </div>
    <div class="bloco-form"><div class="bf-cab"><h5>${ic('usuarios')} 2. Quem recebe (<span id="cw-total">0</span>)</h5>
      <button type="button" class="link" data-action="cwSugerir">sugerir pela atividade escolhida</button></div>
      <div class="linha-campos" style="align-items:end">${campo('Papel de quem for adicionado', `<select id="cw-novo-papel">${opcoes(PAPEIS, 'Participante')}</select>`)}</div>
      <details class="cw-det"><summary>${ic('mais')} Adicionar membros da liga (inclui a orientadora)</summary>
        ${seletorPessoas('cw-pessoas', usuariosAtivos().map(u => u.id), [])}
        <div class="acoes-linha esq">${btn('Adicionar selecionados', 'cwAddPessoas', { classe: 'btn-peq' })}</div></details>
      <details class="cw-det"><summary>${ic('mais')} Adicionar pessoa de fora da liga (evento aberto)</summary>
        ${linhaCampos(campo('Nome completo', '<input id="cw-ext-nome">'), campo('CPF', '<input id="cw-ext-cpf" inputmode="numeric" maxlength="14" data-input="cwCpf">'))}
        <div class="acoes-linha esq">${btn('Adicionar', 'cwAddExterno', { classe: 'btn-peq' })}</div>
        ${campo('Ou cole vários nomes (um por linha, opcionalmente "nome; CPF")', '<textarea id="cw-ext-lote" rows="3"></textarea>')}
        <div class="acoes-linha esq">${btn('Adicionar lista', 'cwAddLista', { classe: 'btn-peq' })}</div></details>
      <div id="cw-rows"></div></div>
    <div class="bloco-form"><div class="bf-cab"><h5>${ic('caneta')} 3. Quem assina</h5></div>
      <p class="dica">O nome e o título aparecem embaixo da linha de assinatura de cada certificado.</p>
      <div id="cw-signs"></div>
      <div class="acoes-linha esq"><select id="cw-sug" data-change="cwSug" style="height:34px;border:1px solid var(--line-2);border-radius:8px;padding:0 8px;max-width:100%"></select>${btn('Em branco', 'cwAddSign', { classe: 'btn-peq', icone: 'mais' })}</div></div>
    <div class="acoes-form">${btn('Cancelar', 'fecharModal')}
      ${btn('Gerar PDF para assinar', 'cwSalvar', { icone: 'baixar', dados: { modo: 'papel' } })}
      ${btn('Emitir digitalmente agora', 'cwSalvar', { icone: 'certificado', classe: 'btn-pri', dados: { modo: 'digital' } })}</div>`;
}

function preencherItens(kind, escolhido) {
  const wrap = document.getElementById('cw-item-wrap'), sel = document.getElementById('cw-item');
  const itens = itensDe(kind);
  wrap.hidden = !itens.length;
  sel.innerHTML = '<option value="">— preencher manualmente —</option>' + itens.map(i => `<option value="${esc(i.id)}" ${i.id === escolhido ? 'selected' : ''}>${esc(i.label)}</option>`).join('');
}

function abrirLote({ ref = {}, rows = [], descartar = [] } = {}) {
  wiz.rows = rows; wiz.descartar = descartar; wiz.refId = ref.id || null;
  const eu = P.admin(S.eu) ? { nome: S.eu.nome, titulo: 'Presidente da LACMES', uid: S.uid } : null;
  wiz.signs = eu ? [eu] : [];
  abrirModal({ titulo: 'Novo lote de certificados', largura: 900, corpo: formLote(ref) });
  preencherItens(ref.kind || 'livre', ref.id);
  desenharRows(); desenharSigns();
  rows.filter(r => r.uid && !r.cpf).forEach(async (r) => {
    const cpf = await cpfDe(r.uid);
    sincronizarRows();
    if (!r.cpf) r.cpf = cpf;
    desenharRows();
  });
}

acao('novoLote', () => abrirLote());
acao('novoLoteSel', () => {
  const ids = selecionadas(); if (!ids.length) { toast('Selecione ao menos uma solicitação.', 'erro'); return; }
  const certs = ids.map(id => S.certificados.find(c => c.id === id)).filter(Boolean);
  const c0 = certs[0];
  abrirLote({
    ref: { kind: c0.refKind, id: c0.refId, atividade: c0.atividade, ch: c0.cargaHoraria, ...(dadosItem(c0.refKind, c0.refId) || { }) },
    rows: certs.map(c => ({ uid: c.userId, nome: c.nomeMembro, cpf: c.cpf || '', papel: c.papel || 'Participante', cargoTexto: c.cargoTexto || '', ch: c.cargaHoraria })),
    descartar: ids
  });
});
acao('cwKind', (d, el) => preencherItens(el.value));
acao('cwItem', (d, el) => {
  const dados = dadosItem(val('cw-kind'), el.value); wiz.refId = el.value || null;
  if (!dados) return;
  document.getElementById('cw-atividade').value = dados.atividade || '';
  document.getElementById('cw-data').value = dados.data || '';
  document.getElementById('cw-local').value = dados.local || '';
  if (dados.ch) document.getElementById('cw-ch').value = dados.ch;
});
acao('cwCpf', (d, el) => { el.value = formatarCPF(el.value); el.classList.toggle('invalido', !!soDigitos(el.value) && soDigitos(el.value).length === 11 && !cpfValido(el.value)); });
acao('cwSugerir', async () => {
  const kind = val('cw-kind'), id = val('cw-item');
  const dados = id && participantesDe(kind, id);
  if (!dados || (!dados.pessoas.length && !dados.docente)) { toast('Escolha uma atividade do sistema que tenha participantes registrados.', 'erro', 5000); return; }
  const papel = val('cw-novo-papel');
  await adicionarPessoas(dados.pessoas.map(p => ({ ...p, papel: p.papel === 'Participante' ? papel : p.papel })), kind);
  if (dados.docente) {
    const j = S.usuarios && usuariosAtivos().find(u => u.nome === dados.docente);
    await adicionarPessoas([j ? { uid: j.id, papel: 'Palestrante' } : { nome: dados.docente, papel: 'Palestrante' }], kind);
  }
});
acao('cwAddPessoas', async () => {
  const uids = [...document.querySelectorAll('input[name="cw-pessoas"]:checked')].map(i => i.value);
  if (!uids.length) { toast('Marque ao menos uma pessoa.', 'erro'); return; }
  const papel = val('cw-novo-papel');
  await adicionarPessoas(uids.map(uid => ({ uid, papel })), val('cw-kind'));
  document.querySelectorAll('input[name="cw-pessoas"]').forEach(i => { i.checked = false; });
});
acao('cwAddExterno', async () => {
  const nome = val('cw-ext-nome'); if (!nome) { toast('Informe o nome.', 'erro'); return; }
  await adicionarPessoas([{ nome, cpf: val('cw-ext-cpf'), papel: val('cw-novo-papel') }], val('cw-kind'));
  document.getElementById('cw-ext-nome').value = ''; document.getElementById('cw-ext-cpf').value = '';
});
acao('cwAddLista', async () => {
  const linhas = val('cw-ext-lote').split('\n').map(l => l.trim()).filter(Boolean);
  if (!linhas.length) return;
  const papel = val('cw-novo-papel');
  await adicionarPessoas(linhas.map(l => { const [nome, cpf] = l.split(/[;\t,]/).map(x => x.trim()); return { nome, cpf: cpf || '', papel }; }), val('cw-kind'));
  document.getElementById('cw-ext-lote').value = '';
});
acao('cwRemRow', ({ i }) => { sincronizarRows(); wiz.rows.splice(Number(i), 1); desenharRows(); });
acao('cwSug', (d, el) => {
  if (el.value === '') return;
  sincronizarSigns();
  const s = sugestoesSign()[Number(el.value)];
  if (s && wiz.signs.length < 4 && !wiz.signs.some(x => x.nome === s.nome)) wiz.signs.push({ ...s });
  else if (wiz.signs.length >= 4) toast('No máximo 4 signatários.', 'erro');
  desenharSigns();
});
acao('cwAddSign', () => { sincronizarSigns(); if (wiz.signs.length >= 4) { toast('No máximo 4 signatários.', 'erro'); return; } wiz.signs.push({ nome: '', titulo: '', uid: null }); desenharSigns(); });
acao('cwRemSign', ({ i }) => { sincronizarSigns(); wiz.signs.splice(Number(i), 1); desenharSigns(); });

acao('cwSalvar', async ({ modo }, botao) => {
  sincronizarRows(); sincronizarSigns();
  const kind = val('cw-kind');
  const atividade = val('cw-atividade') || (kind === 'membro' ? 'Atuação na LACMES' : '');
  if (!atividade) { toast('Informe o nome da atividade.', 'erro'); return; }
  if (!wiz.rows.length) { toast('Adicione ao menos uma pessoa.', 'erro'); return; }
  const chPadrao = Number(val('cw-ch')) || 0;
  const dest = wiz.rows.map(r => ({ uid: r.uid, nome: r.nome, cpf: soDigitos(r.cpf), papel: r.papel, cargoTexto: r.cargoTexto || '', ch: Number(r.ch) || chPadrao }));
  const semNome = dest.findIndex(d => !d.nome);
  if (semNome >= 0) { toast(`Linha ${semNome + 1}: informe o nome.`, 'erro'); return; }
  const cpfRuim = dest.findIndex(d => d.cpf && !cpfValido(d.cpf));
  if (cpfRuim >= 0) { toast(`CPF inválido em ${dest[cpfRuim].nome}.`, 'erro'); return; }
  const semCh = dest.findIndex(d => !(d.ch > 0));
  if (semCh >= 0) { toast(`Informe a carga horária de ${dest[semCh].nome}.`, 'erro'); return; }
  const signs = wiz.signs.filter(s => s.nome);
  if (!signs.length && !(await confirmar('Nenhum signatário definido: os certificados sairão sem linhas de assinatura. Continuar?', { ok: 'Continuar' }))) return;
  const semCpf = dest.filter(d => !d.cpf).length;
  if (semCpf && !(await confirmar(`${semCpf} pessoa(s) sem CPF: o certificado sairá sem a linha de CPF. Continuar?`, { ok: 'Continuar' }))) return;
  let assinaturas = {};
  if (modo === 'digital') {
    const img = await minhaAssinatura();
    signs.forEach((s, i) => { if (s.uid === S.uid && img) assinaturas[i] = img; });
    if (!Object.keys(assinaturas).length && !(await confirmar('Sua assinatura cadastrada não será aplicada (você não está entre os signatários ou não a cadastrou em Meu perfil). Emitir mesmo assim, só com nomes e linhas?', { ok: 'Emitir' }))) return;
  }
  botao.disabled = true;
  try {
    const ref = { kind, id: wiz.refId, atividade, data: val('cw-data') || null, periodoInicio: val('cw-ini') || null, periodoFim: val('cw-fim') || null, local: val('cw-local') };
    const { loteId, certs } = await criarLote({ ref, destinatarios: dest, signatarios: signs, modo, descartar: wiz.descartar });
    await Promise.all(dest.filter(d => d.uid && d.cpf).map(d => Data.set(`dadosPessoais/${d.uid}`, { cpf: d.cpf }, { merge: true }).catch(() => { })));
    if (modo === 'papel') {
      baixarBlob(await gerarPDFLote(certs), `certificados-${slug(atividade)}.pdf`);
      toast('Lote criado. Imprima, assine e envie os PDFs assinados na página do lote.', 'ok', 7000);
    } else {
      for (let i = 0; i < certs.length; i++) { botao.textContent = `Emitindo ${i + 1}/${certs.length}…`; await emitirCertificado(certs[i], { assinaturas }); }
      toast(`${certs.length} certificado(s) emitido(s) e enviado(s).`, 'ok', 6000);
    }
    fecharModal();
    location.hash = `#/certificados/lote/${loteId}`;
  } catch (e) { console.error(e); toast('Erro: ' + (e.code || e.message), 'erro', 8000); botao.disabled = false; }
});

function render(params) {
  const eu = S.eu, admin = P.admin(eu);
  if (params[0] === 'lote' && admin) return renderLote(params[1]);
  const solic = S.certificados.filter(c => c.status === 'solicitado');
  const lista = [{ id: 'meus', nome: 'Meus certificados', icone: 'certificado' }];
  if (admin) lista.push({ id: 'solicitacoes', nome: 'Solicitações', icone: 'ticket', badge: solic.length || '' }, { id: 'lotes', nome: 'Lotes', icone: 'pasta' }, { id: 'todos', nome: 'Todos', icone: 'painel' });
  const aba = lista.some(a => a.id === params[0]) ? params[0] : (admin ? (solic.length ? 'solicitacoes' : 'lotes') : 'meus');
  const meus = S.certificados.filter(c => c.userId === S.uid && c.status !== 'cancelado');
  const corpo = aba === 'solicitacoes' ? abaSolicitacoes() : (aba === 'lotes' ? abaLotes() : (aba === 'todos' ? abaTodos()
    : (meus.length ? `<div class="lista-cards">${meus.map(cardMeu).join('')}</div>` : vazio('Você ainda não tem certificados. Eles aparecem aqui assim que forem emitidos.', 'certificado'))));
  return `${cabecalho('Certificados', admin ? 'Crie lotes, escolha quem assina e envie direto aos alunos, em PDF digital ou assinado em papel.' : 'Seus certificados emitidos pela LACMES.', admin ? btn('Novo lote', 'novoLote', { icone: 'mais', classe: 'btn-pri' }) : '')}
    ${lista.length > 1 ? abas(lista, aba, 'abaCert') : ''}<div class="aba-conteudo">${corpo}</div>`;
}
acao('abaCert', ({ aba }) => { location.hash = '#/certificados/' + aba; });

export default { titulo: 'Certificados', render };
