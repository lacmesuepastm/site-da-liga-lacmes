import { Data } from '../data.js';
import { S, nomeDe, usuariosAtivos } from '../store.js';
import { P, LISTA_CARGOS } from '../dominio.js';
import { ic, esc, acao, abrirModal, fecharModal, confirmar, toast, val, opcoes, fmtDataHora, rerender } from '../util.js';
import { cabecalho, vazio, btn, btnIc, campo, linhaCampos, abas, meta, seletorPessoas } from '../ui.js';
import { STATUS, assinarPresidencia, assinarOrientador, devolver, reenviar, cancelar, enviarManual, baixar, previa, criarCertificados, cargaTotal } from '../cert.js';

let temAssinatura = null;
const filtroGestao = { status: 'todos', busca: '' };

function passos(c) {
  const p = STATUS[c.status]?.passo ?? 0;
  const etapas = ['Criado', 'Presidência', 'Orientador(a)', 'Emitido'];
  if (c.status === 'devolvido' || c.status === 'cancelado') return `<div class="cert-status" style="--c:${STATUS[c.status].cor}">${ic('alerta')}${STATUS[c.status].nome}${c.motivoDevolucao ? ` — <i>${esc(c.motivoDevolucao)}</i>` : ''}</div>`;
  return `<div class="passos-cert">${etapas.map((e, i) => `<span class="pc ${i < p || p === 3 ? 'feito' : ''} ${i === p && p < 3 ? 'atual' : ''}"><i>${i < p || p === 3 ? ic('check') : ''}</i>${e}</span>`).join('<span class="pc-linha"></span>')}</div>`;
}

function cardMeu(c) {
  const emitido = c.status === 'emitido';
  return `<div class="card card-cert ${emitido ? 'emitido' : ''}">
    <div class="cc-icone">${ic('certificado')}</div>
    <div class="cc-corpo"><h3>${esc(c.titulo)}</h3>
      <div class="meta">${meta('relogio', `${c.cargaHoraria || 0}h`)}${meta('calendario', emitido ? 'Emitido em ' + fmtDataHora(c.emitidoEm).slice(0, 10) : 'Solicitado em ' + fmtDataHora(c.criadoEm).slice(0, 10))}${emitido ? meta('escudo', `<code>${esc(c.codigo)}</code>`) : ''}</div>
      ${passos(c)}
      <div class="acoes-linha esq">${emitido ? btn('Baixar PDF', 'baixarCert', { classe: 'btn-pri', icone: 'baixar', dados: { id: c.id } }) + `<a class="btn" href="verificar.html?c=${esc(c.codigo)}" target="_blank">${ic('escudo')}Verificação pública</a>` : btn('Ver prévia', 'previaCert', { icone: 'olho', dados: { id: c.id } })}</div>
    </div></div>`;
}

function linhaFila(c, etapa) {
  return `<label class="linha-cert"><input type="checkbox" class="sel-cert" data-etapa="${etapa}" value="${c.id}">
    <span class="lc-txt"><strong>${esc(c.nomeMembro)}</strong><small>${esc(c.titulo)} · ${c.cargaHoraria || 0}h${etapa === 'orientador' ? ` · assina: ${esc(c.signerNome || '—')}` : ''}${c.urlPresManual ? ' · <a href="' + esc(c.urlPresManual) + '" target="_blank">PDF da Presidência</a>' : ''}</small></span>
    <span class="lc-acoes">${btnIc('olho', 'previaCert', { id: c.id }, 'Prévia')}${btnIc('responder', 'devolverCert', { id: c.id }, 'Devolver para correção')}</span></label>`;
}
function blocoFila(titulo, lista, etapa, podeAssinar, dica = '') {
  if (!lista.length) return `<div class="bloco-fila"><h4>${titulo}</h4><p class="mudo">Nada pendente aqui. ${ic('check')}</p></div>`;
  return `<div class="bloco-fila"><div class="aba-cab"><h4>${titulo} (${lista.length})</h4><label class="chk pequeno"><input type="checkbox" data-change="selTodosCert" data-etapa="${etapa}"><span>Selecionar todos</span></label></div>
    ${dica ? `<p class="dica">${dica}</p>` : ''}
    <div class="fila">${lista.map(c => linhaFila(c, etapa)).join('')}</div>
    ${podeAssinar ? `<div class="acoes-linha esq">${btn('Assinar selecionados', 'assinarSel', { classe: 'btn-pri', icone: 'caneta', dados: { etapa } })}${btn('Enviar PDF assinado à mão', 'manualSel', { icone: 'enviarDoc', dados: { etapa } })}</div>` : ''}</div>`;
}

function abaAssinar() {
  const eu = S.eu;
  const aviso = temAssinatura === false ? `<div class="aviso">${ic('alerta')}<div><b>Você ainda não cadastrou sua assinatura.</b> Ela é aplicada automaticamente no PDF. <a href="#/perfil/assinatura">Cadastrar agora →</a></div></div>` : (temAssinatura ? `<div class="aviso-ok">${ic('concluido')}<div>Sua assinatura está cadastrada e será aplicada nos certificados que você assinar.</div></div>` : '');
  let html = aviso;
  if (P.admin(eu)) {
    const pres = S.certificados.filter(c => c.status === 'pendente_presidencia');
    const orient = S.certificados.filter(c => c.status === 'pendente_orientador');
    const semConta = orient.filter(c => !c.signerUid);
    html += blocoFila('Aguardando assinatura da Presidência', pres, 'presidencia', true);
    html += blocoFila('Aguardando orientador(a)', orient, 'orientador', orient.some(c => c.signerUid === S.uid) || semConta.length > 0,
      semConta.length ? `${semConta.length} certificado(s) com orientador(a) sem conta no portal: baixe a prévia, colete a assinatura e envie o PDF final por "Enviar PDF assinado à mão".` : 'O(a) orientador(a) recebe uma notificação e assina pelo próprio login.');
    const dev = S.certificados.filter(c => c.status === 'devolvido');
    if (dev.length) html += `<div class="bloco-fila"><h4>Devolvidos para correção (${dev.length})</h4>${dev.map(c => `<div class="linha-cert"><span class="lc-txt"><strong>${esc(c.nomeMembro)}</strong><small>${esc(c.titulo)} — <i>${esc(c.motivoDevolucao || '')}</i></small></span>
      <span class="lc-acoes">${btn('Corrigir e reenviar', 'corrigirCert', { classe: 'btn-peq', dados: { id: c.id } })}${btnIc('lixeira', 'cancelarCert', { id: c.id }, 'Cancelar')}</span></div>`).join('')}</div>`;
  } else if (P.orientador(eu)) {
    html += blocoFila('Aguardando sua assinatura', S.certificados.filter(c => c.status === 'pendente_orientador' && c.signerUid === S.uid), 'orientador', true, 'Estes certificados já foram assinados pela Presidência. Ao assinar, o PDF final é gerado e enviado ao membro automaticamente.');
    const feitos = S.certificados.filter(c => c.signerUid === S.uid && c.status === 'emitido');
    html += `<div class="bloco-fila"><h4>Assinados por você (${feitos.length})</h4>${feitos.slice(0, 30).map(c => `<div class="linha-cert"><span class="lc-txt"><strong>${esc(c.nomeMembro)}</strong><small>${esc(c.titulo)} · ${fmtDataHora(c.emitidoEm)}</small></span>${btnIc('baixar', 'baixarCert', { id: c.id }, 'Baixar')}</div>`).join('') || '<p class="mudo">Nenhum ainda.</p>'}</div>`;
  }
  return html;
}

function abaGestao() {
  let l = S.certificados.slice();
  if (filtroGestao.status !== 'todos') l = l.filter(c => c.status === filtroGestao.status);
  if (filtroGestao.busca) { const q = filtroGestao.busca.toLowerCase(); l = l.filter(c => (c.nomeMembro + ' ' + c.titulo + ' ' + c.codigo).toLowerCase().includes(q)); }
  const cont = Object.fromEntries(Object.keys(STATUS).map(s => [s, S.certificados.filter(c => c.status === s).length]));
  const orientadores = Object.values(S.usuarios).filter(u => u.tipo === 'orientador');
  return `<div class="stats">${Object.entries(STATUS).filter(([s]) => s !== 'cancelado').map(([s, v]) => `<button class="stat ${filtroGestao.status === s ? 'ativo' : ''}" style="--c:${v.cor}" data-action="filtroCert" data-s="${s}"><b>${cont[s]}</b><span>${v.nome}</span></button>`).join('')}<button class="stat ${filtroGestao.status === 'todos' ? 'ativo' : ''}" data-action="filtroCert" data-s="todos"><b>${S.certificados.length}</b><span>Todos</span></button></div>
    <div class="filtros"><span class="campo-busca">${ic('busca')}<input type="search" id="cert-busca" placeholder="Nome, título ou código…" value="${esc(filtroGestao.busca)}" data-input="buscaCert"></span>
      ${btn('Emitir para membros/diretoria', 'emitirMembros', { icone: 'mais', classe: 'btn-pri' })}${btn('Assinantes', 'configAssin', { icone: 'config' })}</div>
    <div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Membro</th><th>Certificado</th><th>Horas</th><th>Status</th><th>Atualizado</th><th></th></tr></thead><tbody>
    ${l.map(c => `<tr><td>${esc(c.nomeMembro)}</td><td>${esc(c.titulo)}<br><small class="mudo"><code>${esc(c.codigo)}</code></small></td><td>${c.cargaHoraria || 0}h</td>
      <td><span class="pill" style="--c:${STATUS[c.status]?.cor}">${STATUS[c.status]?.nome || c.status}</span></td><td class="mudo">${fmtDataHora((c.historico || []).slice(-1)[0]?.em || c.criadoEm)}</td>
      <td class="td-acoes">${c.status === 'emitido' ? btnIc('baixar', 'baixarCert', { id: c.id }, 'Baixar') : btnIc('olho', 'previaCert', { id: c.id }, 'Prévia')}${btnIc('relogio', 'historicoCert', { id: c.id }, 'Histórico')}</td></tr>`).join('') || `<tr><td colspan="6">${vazio('Nenhum certificado.', 'certificado')}</td></tr>`}
    </tbody></table></div>
    <p class="dica">Orientadora geral: <b>${esc(S.config.orientadoraUid ? nomeDe(S.config.orientadoraUid) : (S.config.orientadoraNome || 'não definida'))}</b>${!orientadores.length ? ' — cadastre a orientadora em Usuários com o nível "Orientador(a)" para ela assinar pelo portal.' : ''}</p>`;
}

function render(params) {
  const eu = S.eu;
  const podeFila = P.admin(eu) || P.orientador(eu);
  const nFila = S.certificados.filter(c => (c.status === 'pendente_presidencia' && P.admin(eu)) || (c.status === 'pendente_orientador' && (c.signerUid === S.uid))).length;
  const lista = [{ id: 'meus', nome: 'Meus certificados', icone: 'certificado' }];
  if (podeFila) lista.push({ id: 'assinar', nome: 'Assinar', icone: 'caneta', badge: nFila || '' });
  if (P.admin(eu)) lista.push({ id: 'gestao', nome: 'Gestão', icone: 'painel' });
  const aba = lista.some(a => a.id === params[0]) ? params[0] : (podeFila && nFila ? 'assinar' : 'meus');
  if (podeFila && temAssinatura === null) Data.getDoc(`assinaturas/${S.uid}`).then(d => { temAssinatura = !!(d && d.img); rerender(); }).catch(() => { temAssinatura = false; });
  const meus = S.certificados.filter(c => c.userId === S.uid && c.status !== 'cancelado');
  const corpo = aba === 'assinar' ? abaAssinar() : (aba === 'gestao' ? abaGestao() : (meus.length ? `<div class="lista-cards">${meus.map(cardMeu).join('')}</div>` : vazio('Você ainda não tem certificados. Eles aparecem aqui assim que a diretoria solicitar — e você acompanha cada assinatura em tempo real.', 'certificado')));
  return `${cabecalho('Certificados', 'Fluxo: solicitação → assinatura da Presidência → assinatura do(a) orientador(a) → PDF com código de verificação.')}
    ${lista.length > 1 ? abas(lista, aba, 'abaCert') : ''}<div class="aba-conteudo">${corpo}</div>`;
}
acao('abaCert', ({ aba }) => { location.hash = '#/certificados/' + aba; });
acao('filtroCert', ({ s }) => { filtroGestao.status = s; rerender(); });
let tB; acao('buscaCert', (d, el) => { clearTimeout(tB); tB = setTimeout(() => { filtroGestao.busca = el.value; rerender(); }, 250); });
acao('selTodosCert', ({ etapa }, el) => document.querySelectorAll(`.sel-cert[data-etapa="${etapa}"]`).forEach(c => c.checked = el.checked));
const selecionados = (etapa) => [...document.querySelectorAll(`.sel-cert[data-etapa="${etapa}"]:checked`)].map(c => c.value);

acao('baixarCert', ({ id }) => baixar(S.certificados.find(c => c.id === id)));
acao('previaCert', ({ id }) => previa(S.certificados.find(c => c.id === id)));
acao('assinarSel', async ({ etapa }, b) => {
  const ids = selecionados(etapa); if (!ids.length) { toast('Selecione ao menos um certificado.', 'erro'); return; }
  if (!(await confirmar(`Aplicar sua assinatura eletrônica em ${ids.length} certificado(s)?`, { ok: 'Assinar' }))) return;
  b.disabled = true; b.innerHTML = `${ic('relogio')}<span>Assinando…</span>`;
  try {
    const n = etapa === 'presidencia' ? await assinarPresidencia(ids) : await assinarOrientador(ids, (i, t) => { b.innerHTML = `${ic('relogio')}<span>Gerando PDF ${i}/${t}…</span>`; });
    if (n !== false) toast(`${n} certificado(s) assinado(s).`, 'ok');
  } catch (e) { console.error(e); toast('Erro ao assinar: ' + e.message, 'erro'); }
  b.disabled = false;
});
acao('manualSel', ({ etapa }) => {
  const ids = selecionados(etapa); if (!ids.length) { toast('Selecione ao menos um certificado.', 'erro'); return; }
  abrirModal({ titulo: 'Enviar PDF assinado', largura: 460, corpo: `<p class="mudo">${etapa === 'presidencia' ? 'PDF com a assinatura da Presidência. Depois segue para o(a) orientador(a).' : 'PDF FINAL com as duas assinaturas. Será entregue ao membro.'}${ids.length > 1 ? ` O mesmo arquivo será vinculado aos ${ids.length} certificados.` : ''}</p>
    ${campo('Arquivo PDF', '<input type="file" id="man-pdf" accept="application/pdf">')}<div class="acoes-form">${btn('Enviar', 'enviarManualOk', { classe: 'btn-pri', dados: { etapa, ids: ids.join(',') } })}</div>` });
});
acao('enviarManualOk', async ({ etapa, ids }, b) => {
  const f = document.getElementById('man-pdf').files[0]; if (!f) return;
  b.disabled = true; b.textContent = 'Enviando…';
  try { await enviarManual(ids.split(','), etapa, f); fecharModal(); toast('Documento enviado.', 'ok'); } catch (e) { toast(e.message, 'erro'); b.disabled = false; b.textContent = 'Enviar'; }
});
acao('devolverCert', ({ id }) => abrirModal({ titulo: 'Devolver para correção', largura: 440, corpo: `${campo('Motivo', '<textarea id="dv-motivo" rows="3" placeholder="Ex.: carga horária incorreta, nome com erro…"></textarea>')}<div class="acoes-form">${btn('Devolver', 'devolverOk', { classe: 'btn-perigo', dados: { id } })}</div>` }));
acao('devolverOk', async ({ id }) => { const m = val('dv-motivo'); if (!m) return; await devolver(id, m); fecharModal(); });
acao('corrigirCert', ({ id }) => {
  const c = S.certificados.find(x => x.id === id);
  abrirModal({ titulo: 'Corrigir certificado', largura: 480, corpo: `<p class="aviso">${ic('alerta')}<span>${esc(c.motivoDevolucao || '')}</span></p>
    ${campo('Nome no certificado', `<input id="cc-nome" value="${esc(c.nomeMembro)}">`)}${campo('Atividade / cargo', `<input id="cc-cargo" value="${esc(c.cargoTexto || '')}">`)}${campo('Carga horária', `<input type="number" step="0.5" id="cc-carga" value="${c.cargaHoraria}">`)}
    <div class="acoes-form">${btn('Reenviar para assinatura', 'corrigirOk', { classe: 'btn-pri', dados: { id } })}</div>` });
});
acao('corrigirOk', async ({ id }) => { await reenviar(id, { nomeMembro: val('cc-nome'), cargoTexto: val('cc-cargo'), cargaHoraria: Number(val('cc-carga')) || 0 }); fecharModal(); });
acao('cancelarCert', async ({ id }) => { if (await confirmar('Cancelar este certificado?', { ok: 'Cancelar certificado', perigo: true })) cancelar(id); });
acao('historicoCert', ({ id }) => {
  const c = S.certificados.find(x => x.id === id);
  abrirModal({ titulo: 'Histórico', largura: 460, corpo: `<ol class="linha-tempo">${(c.historico || []).map(h => `<li><b>${esc(h.acao)}</b><small>${fmtDataHora(h.em)} · ${esc(nomeDe(h.por))}</small></li>`).join('')}</ol>` });
});
acao('configAssin', () => {
  const admins = Object.values(S.usuarios).filter(u => u.tipo === 'admin'), ori = Object.values(S.usuarios).filter(u => u.tipo === 'orientador');
  abrirModal({ titulo: 'Assinantes dos certificados', largura: 480, corpo: `
    ${campo('Presidente (assina primeiro)', `<select id="cf-pres">${opcoes(admins.map(u => ({ v: u.id, t: u.nome })), S.config.presidenteUid)}</select>`)}
    ${campo('Orientadora geral (com conta)', `<select id="cf-ori"><option value="">— sem conta (fluxo manual) —</option>${opcoes(ori.map(u => ({ v: u.id, t: u.nome })), S.config.orientadoraUid)}</select>`, 'Certificados de projeto com orientador(a) cadastrado(a) no projeto são assinados por ele(a).')}
    ${campo('Nome da orientadora (se sem conta)', `<input id="cf-ori-nome" value="${esc(S.config.orientadoraNome || '')}">`)}
    <div class="acoes-form">${btn('Salvar', 'configAssinOk', { classe: 'btn-pri' })}</div>` });
});
acao('configAssinOk', async () => { await Data.set('config/geral', { presidenteUid: val('cf-pres'), orientadoraUid: val('cf-ori') || null, orientadoraNome: val('cf-ori-nome') }, { merge: true }); fecharModal(); toast('Configuração salva.', 'ok'); });

acao('emitirMembros', () => abrirModal({ titulo: 'Emitir certificados — selecionar pessoas', largura: 560, corpo: `${seletorPessoas('em-uids', usuariosAtivos().filter(u => u.tipo !== 'orientador').map(u => u.id), [], { todosOpcao: true })}<div class="acoes-form">${btn('Continuar', 'emitirPasso2', { classe: 'btn-pri', icone: 'dir' })}</div>` }));
acao('emitirPasso2', () => {
  const uids = [...document.querySelectorAll('input[name="em-uids"]:checked')].map(i => i.value); if (!uids.length) return;
  const blocos = uids.map(uid => { const u = S.usuarios[uid]; return `<div class="card bloco-emit" data-uid="${uid}"><strong>${esc(u.nome)}</strong>
    <div class="linha-chk"><label class="chk"><input type="checkbox" class="em-papel" value="Membro" checked><span>Membro</span></label>${u.cargo ? `<label class="chk"><input type="checkbox" class="em-papel" value="${esc(u.cargo)}" checked><span>${esc(u.cargo)}</span></label>` : ''}${u.tipo === 'admin' ? '<label class="chk"><input type="checkbox" class="em-papel" value="Presidência" checked><span>Presidência</span></label>' : ''}</div>
    ${linhaCampos(campo('Período — início', '<input type="date" class="em-ini">'), campo('Fim', '<input type="date" class="em-fim">'), campo('Carga (h)', `<input type="number" step="0.5" class="em-carga" value="${cargaTotal(uid)}">`))}</div>`; }).join('');
  abrirModal({ titulo: 'Configurar e emitir', largura: 680, corpo: `<p class="dica">Carga sugerida = estágios + aulas presentes + projetos concluídos (pode ajustar).</p>${blocos}<div class="acoes-form">${btn('Enviar para assinatura', 'emitirOk', { classe: 'btn-pri', icone: 'certificado' })}</div>` });
});
acao('emitirOk', async () => {
  const lista = [...document.querySelectorAll('.bloco-emit')].map(b => {
    const papeis = [...b.querySelectorAll('.em-papel:checked')].map(i => i.value);
    return { userId: b.dataset.uid, tipo: papeis.some(p => p !== 'Membro') ? 'Diretor' : 'Membro', cargoTexto: papeis.join(' / ') || 'Membro', periodoInicio: b.querySelector('.em-ini').value || null, periodoFim: b.querySelector('.em-fim').value || null, cargaHoraria: Number(b.querySelector('.em-carga').value) || 0 };
  });
  await criarCertificados(lista); fecharModal(); toast(`${lista.length} certificado(s) na fila de assinatura.`, 'ok'); location.hash = '#/certificados/assinar';
});

export default { titulo: 'Certificados', render };
export const resetarCacheAssinatura = () => { temAssinatura = null; };
