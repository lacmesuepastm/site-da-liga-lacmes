// ============================================================================
// USUÁRIOS (Presidência) e MIGRAÇÃO dos dados do antigo Apps Script/Planilha
// ============================================================================
import { Data, op } from '../data.js';
import { S } from '../store.js';
import { P, LISTA_CARGOS, TIPOS_USUARIO, cargoBadge, prefsPadrao, eixosChips } from '../dominio.js';
import { ic, esc, acao, avatar, abrirModal, fecharModal, confirmar, toast, val, opcoes, brParaISO, novoId, rerender } from '../util.js';
import { cabecalho, vazio, btn, btnIc, campo, linhaCampos } from '../ui.js';
import { tituloCert } from '../cert.js';

const busca = { q: '', tipo: 'todos' };

function render() {
  let l = Object.values(S.usuarios).sort((a, b) => (a.ativo === false) - (b.ativo === false) || a.nome.localeCompare(b.nome));
  if (busca.tipo !== 'todos') l = l.filter(u => busca.tipo === 'diretoria' ? !!u.cargo : u.tipo === busca.tipo);
  if (busca.q) { const q = busca.q.toLowerCase(); l = l.filter(u => (u.nome + u.email + (u.username || '')).toLowerCase().includes(q)); }
  return `${cabecalho('Usuários', `${Object.values(S.usuarios).filter(u => u.ativo !== false).length} pessoas ativas no portal.`, btn('Importar do sistema antigo', 'ir', { icone: 'subir', dados: { rota: 'migracao' } }) + btn('Novo usuário', 'novoUsuario', { icone: 'mais', classe: 'btn-pri' }))}
    <div class="filtros"><div class="seg">${[['todos', 'Todos'], ['diretoria', 'Diretoria'], ['usuario', 'Membros'], ['orientador', 'Orientadores'], ['admin', 'Presidência']].map(([v, n]) => `<button class="seg-btn ${busca.tipo === v ? 'ativo' : ''}" data-action="filtroUsu" data-v="${v}">${n}</button>`).join('')}</div>
      <span class="campo-busca">${ic('busca')}<input type="search" id="usu-busca" placeholder="Buscar…" value="${esc(busca.q)}" data-input="buscaUsu"></span></div>
    <div class="tabela-rolagem"><table class="tabela tabela-usuarios"><thead><tr><th>Pessoa</th><th>Login</th><th>Nível / cargo</th><th>Eixos</th><th></th></tr></thead><tbody>
    ${l.map(u => `<tr class="${u.ativo === false ? 'inativo' : ''}"><td><span class="pessoa-cel">${avatar(u, 32)}<span><strong>${esc(u.nome)}</strong><small>${esc(u.email)}</small></span></span></td>
      <td><code>${esc(u.username || '—')}</code></td><td><span class="pill">${TIPOS_USUARIO[u.tipo] || u.tipo}</span> ${u.cargo ? cargoBadge(u.cargo) : ''}${u.ativo === false ? ' <span class="pill" style="--c:#b23b3b">inativo</span>' : ''}</td>
      <td>${eixosChips(u.eixosSeguidos, { mini: true })}</td>
      <td class="td-acoes">${btnIc('lapis', 'editarUsuario', { id: u.id }, 'Editar')}${u.id !== S.uid ? btnIc(u.ativo === false ? 'check' : 'cadeado', 'ativarUsuario', { id: u.id }, u.ativo === false ? 'Reativar' : 'Desativar acesso') : ''}</td></tr>`).join('') || `<tr><td colspan="5">${vazio('Ninguém encontrado.', 'usuarios')}</td></tr>`}
    </tbody></table></div>`;
}
acao('filtroUsu', ({ v }) => { busca.tipo = v; rerender(); });
let tB; acao('buscaUsu', (d, el) => { clearTimeout(tB); tB = setTimeout(() => { busca.q = el.value; rerender(); }, 250); });

const formUsu = (u = {}) => `${campo('Nome completo', `<input id="nu-nome" value="${esc(u.nome || '')}">`)}
  ${linhaCampos(campo('E-mail', `<input type="email" id="nu-email" value="${esc(u.email || '')}" ${u.id ? 'disabled' : ''}>`), campo('Usuário (login rápido)', `<input id="nu-user" value="${esc(u.username || '')}" pattern="[a-z0-9._-]+" ${u.id ? 'disabled' : ''}>`))}
  ${u.id ? '' : campo('Senha inicial', '<input id="nu-senha" type="text" minlength="6" placeholder="mínimo 6 caracteres">', 'A pessoa pode trocar depois em Meu perfil.')}
  ${linhaCampos(campo('Nível', `<select id="nu-tipo">${opcoes(Object.entries(TIPOS_USUARIO).map(([v, t]) => ({ v, t })), u.tipo || 'usuario')}</select>`), campo('Cargo na diretoria', `<select id="nu-cargo"><option value="">Nenhum (membro)</option>${opcoes(LISTA_CARGOS, u.cargo)}</select>`))}
  ${linhaCampos(campo('Titulação', `<input id="nu-tit" value="${esc(u.titulacao || 'Graduando(a) em Medicina')}">`), campo('Vínculo', `<input id="nu-vinc" value="${esc(u.vinculo || 'Membro')}">`))}`;
acao('novoUsuario', () => abrirModal({ titulo: 'Novo usuário', largura: 600, corpo: formUsu() + `<div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Cadastrar', 'salvarUsuario', { classe: 'btn-pri', icone: 'check' })}</div>` }));
acao('editarUsuario', ({ id }) => abrirModal({ titulo: 'Editar usuário', largura: 600, corpo: formUsu(S.usuarios[id]) + `<div class="acoes-form">${!S.usuarios[id].email ? '' : btn('Enviar e-mail de nova senha', 'resetSenhaUsu', { icone: 'cadeado', dados: { id } })}${btn('Salvar', 'salvarUsuario', { classe: 'btn-pri', dados: { id } })}</div>` }));
acao('salvarUsuario', async ({ id }, b) => {
  const base = { nome: val('nu-nome'), tipo: val('nu-tipo'), cargo: val('nu-cargo') || null, titulacao: val('nu-tit'), vinculo: val('nu-vinc') };
  if (!base.nome) { toast('Informe o nome.', 'erro'); return; }
  if (id) { await Data.update(`usuarios/${id}`, base); fecharModal(); toast('Salvo.', 'ok'); return; }
  const email = val('nu-email').toLowerCase(), username = val('nu-user').toLowerCase(), senha = val('nu-senha');
  if (!email || !username || senha.length < 6) { toast('E-mail, usuário e senha (≥ 6) são obrigatórios.', 'erro'); return; }
  if (Object.values(S.usuarios).some(u => u.username === username)) { toast('Esse usuário já existe.', 'erro'); return; }
  b.disabled = true;
  try {
    const uid = await Data.auth.criarConta(email, senha);
    await Data.batch([op.set(`usuarios/${uid}`, { ...base, email, username, foto: '', ativo: true, eixosSeguidos: ['clinica'], notifPrefs: prefsPadrao(), criadoEm: Date.now() }), op.set(`logins/${username}`, { email })]);
    fecharModal(); toast(`${base.nome} cadastrado(a). Login: ${username}`, 'ok', 5000);
  } catch (e) { b.disabled = false; toast(/email-already/.test(e.code || e.message) ? 'Esse e-mail já tem conta no Firebase.' : 'Erro: ' + (e.code || e.message), 'erro', 6000); }
});
acao('resetSenhaUsu', async ({ id }) => { try { await Data.auth.recuperarSenha(S.usuarios[id].email); toast('E-mail de redefinição enviado.', 'ok'); } catch (e) { toast(e.message, 'erro'); } });
acao('ativarUsuario', async ({ id }) => {
  const u = S.usuarios[id]; const desativar = u.ativo !== false;
  if (desativar && !(await confirmar(`Desativar o acesso de ${u.nome}? Os registros (projetos, certificados) são mantidos.`, { ok: 'Desativar', perigo: true }))) return;
  await Data.update(`usuarios/${id}`, { ativo: !desativar });
});

// ------------------------------------------------------------ MIGRAÇÃO ----
function renderMigracao() {
  return `<a class="voltar" href="#/usuarios">${ic('voltar')} Usuários</a>${cabecalho('Importar do sistema antigo', 'Traz usuários (com as mesmas senhas), projetos, chats, oportunidades, aulas, mural, financeiro, atas, agendas e certificados do Apps Script.')}
    <div class="card"><ol class="passos">
      <li>Na planilha antiga, aba <b>Estado</b>, abra o editor do Apps Script e execute <code>Logger.log(obterEstadoRemoto())</code> — ou copie as linhas da coluna B.</li>
      <li>Cole abaixo o JSON completo (um objeto com <code>usuarios</code>, <code>projetos_info</code>, …). Também aceita linhas no formato <code>chave⇥json</code> copiadas da planilha.</li>
      <li>Clique em <b>Analisar</b>, confira o resumo e depois em <b>Importar</b>. Rode só uma vez.</li></ol>
      ${campo('Dados antigos', '<textarea id="mig-json" rows="10" class="mono" placeholder=\'{"usuarios": {...}, "projetos_info": {...}, ...}\'></textarea>')}
      <div class="acoes-linha esq">${btn('Analisar', 'migAnalisar', { icone: 'lupa' })}</div><div id="mig-resultado">${resumoMigracao()}</div></div>`;
}
// o resumo e o registro ficam em memória para sobreviver às re-renderizações
let logMig = '';
function resumoMigracao() {
  if (!antigo) return '';
  const n = (o) => o ? (Array.isArray(o) ? o.length : Object.keys(o).length) : 0;
  const curtas = Object.entries(antigo.usuarios || {}).filter(([, u]) => !u.senha || u.senha.length < 6).length;
  return `<div class="stats">${[['usuarios', 'Usuários'], ['projetos_info', 'Projetos'], ['oportunidades', 'Oportunidades'], ['aulas', 'Aulas'], ['mural', 'Avisos → Fórum'], ['financeiro', 'Lançamentos'], ['atasGerais', 'Atas'], ['certificados', 'Certificados']].map(([k, t]) => `<div class="stat"><b>${n(antigo[k])}</b><span>${t}</span></div>`).join('')}</div>
    ${curtas ? `<p class="aviso">${ic('alerta')}<span>${curtas} usuário(s) com senha menor que 6 caracteres (exigência do Firebase) — receberão a senha <code>lacmes</code> + senha antiga; a lista aparece no final.</span></p>` : ''}
    <div class="acoes-linha esq">${btn('Importar agora', 'migImportar', { classe: 'btn-pri', icone: 'subir' })}</div><pre id="mig-log" class="log">${esc(logMig)}</pre>`;
}
const AREA_EIXO = { 'cardiologia': 'cardio', 'pneumologia': 'pneumo', 'neurologia': 'neuro', 'endocrinologia': 'endocrino', 'nefrologia': 'nefro', 'gastroenterologia': 'gastro', 'reumatologia': 'reumato', 'infectologia': 'infecto', 'hematologia': 'hemato', 'geriatria': 'geriatria', 'emergência': 'emergencia', 'emergencias': 'emergencia', 'emergências': 'emergencia' };
const STATUS_ANTIGO = { nao_assinado: 'pendente_presidencia', enviado_orientadora: 'pendente_orientador', assinado: 'emitido' };
let antigo = null;
function lerAntigo(txt) {
  txt = txt.trim();
  if (txt.startsWith('{')) return JSON.parse(txt);
  const r = {};
  txt.split(/\r?\n/).forEach(l => { const i = l.indexOf('\t'); if (i > 0) { const k = l.slice(0, i).trim(); try { r[k] = JSON.parse(l.slice(i + 1).split('\t')[0]); } catch { } } });
  return r;
}
acao('migAnalisar', () => {
  try { antigo = lerAntigo(val('mig-json')); } catch (e) { toast('JSON inválido: ' + e.message, 'erro'); return; }
  logMig = '';
  document.getElementById('mig-resultado').innerHTML = resumoMigracao();
});
acao('migImportar', async (d, b) => {
  if (!antigo || !(await confirmar('Importar todos os dados agora? Rode apenas uma vez.', { ok: 'Importar' }))) return;
  b.disabled = true;
  const log = (t) => { logMig += t + '\n'; const el = document.getElementById('mig-log'); if (el) { el.textContent = logMig; el.scrollTop = el.scrollHeight; } };
  const mapa = {}, porNome = {}, avisos = [];
  const agora = Date.now();
  const mapU = (id) => mapa[id] || null; const mapL = (arr) => (arr || []).map(mapU).filter(Boolean);
  const tsBR = (s) => { if (!s) return agora; const [dt, hr] = String(s).split(' '); const iso = brParaISO(dt); const t = new Date(`${iso}T${hr || '00:00'}:00`).getTime(); return isNaN(t) ? agora : t; };
  try {
    // 1. usuários (contas no Firebase Auth com a mesma senha)
    for (const [login, u] of Object.entries(antigo.usuarios || {})) {
      if (!u.email) { avisos.push(`Sem e-mail: ${u.nome} (pulado)`); continue; }
      const existente = Object.values(S.usuarios).find(x => (x.email || '').toLowerCase() === u.email.toLowerCase());
      let uid = existente && existente.id;
      let senha = u.senha || 'lacmes2026'; if (senha.length < 6) { senha = 'lacmes' + senha; avisos.push(`${login}: senha alterada para "${senha}"`); }
      if (!uid) {
        try { uid = await Data.auth.criarConta(u.email.toLowerCase(), senha); }
        catch (e) { avisos.push(`${login} (${u.email}): ${e.code || e.message} — cadastre manualmente`); continue; }
      }
      mapa[u.id] = uid; porNome[u.nome] = uid;
      const foto = u.foto && !u.foto.startsWith('data:image/svg') && u.foto.length < 250000 ? u.foto : '';
      await Data.batch([op.set(`usuarios/${uid}`, { nome: u.nome, email: u.email.toLowerCase(), username: login.toLowerCase(), tipo: u.tipo === 'admin' ? 'admin' : 'usuario', cargo: u.cargo || null, titulacao: u.titulacao || '', vinculo: u.vinculo || 'Membro', foto, ativo: true, eixosSeguidos: ['clinica'], notifPrefs: prefsPadrao(), criadoEm: agora }, { merge: true }), op.set(`logins/${login.toLowerCase()}`, { email: u.email.toLowerCase() })]);
      log(`✓ usuário ${login}`);
    }
    const uidPorNome = (n) => porNome[n] || Object.values(S.usuarios).find(x => x.nome === n)?.id || S.uid;
    // 2. projetos + chat
    for (const [pid, info] of Object.entries(antigo.projetos_info || {})) {
      const dd = (antigo.projetos_dados || {})[pid] || {};
      const membros = (dd.membros || []).filter(m => mapa[m.id]).map(m => ({ uid: mapa[m.id], papel: m.role || 'Pesquisador' }));
      const escala = {}; Object.entries(dd.cronograma || {}).forEach(([br, e]) => { escala[brParaISO(br)] = { hora: e.hora || '', local: e.local || '', equipe: mapL(e.equipe) }; });
      const conv = (r, fim) => ({ id: novoId('r'), titulo: r.titulo, desc: r.desc || '', data: brParaISO(r.data), hora: r.hora || '', tipo: r.tipo || 'Online', link: r.linkReuniao || '', local: r.local || '', concluida: fim, duracao: r.duracao || '', ata: r.linkAta || '' });
      const id = 'p' + pid;
      await Data.set(`projetos/${id}`, {
        titulo: info.titulo, categoria: info.categoria || 'Pesquisa', eixos: ['clinica'], desc: dd.sobre?.desc || '', orientador: dd.sobre?.orientador || '', orientadorUid: null, idProj: dd.sobre?.idProj || `PROJ-${pid}`, acesso: dd.sobre?.acesso || '',
        membros, membroIds: membros.map(m => m.uid), escala, coleta: (dd.coleta || []).map(c => ({ id: novoId('e'), etapa: c.etapa, links: c.links || [] })),
        tarefas: (dd.atividades || []).map(t => ({ id: novoId('t'), titulo: t.titulo, desc: t.desc || '', prazo: brParaISO(t.prazo), resp: (t.resp || []).includes('TODOS') ? membros.map(m => m.uid) : mapL(t.resp), concluida: !!t.concluida, concluidaPor: t.concluida ? S.uid : null, concluidaEm: t.concluida ? tsBR(t.concluidaEm) : null, criadoEm: agora })),
        arquivos: (dd.arquivos || []).map(a => ({ id: novoId('a'), nome: a.nome, url: a.url, por: S.uid, criadoEm: agora })),
        reunioes: [...(dd.reunioes || []).map(r => conv(r, false)), ...(dd.reunioes_concluidas || []).map(r => conv(r, true))],
        concluido: !!info.concluido, cargaHoraria: info.cargaHoraria || 0, certificadosEnviados: mapL(info.certificadosEnviados), criadoEm: agora
      });
      const msgs = (dd.chat || []).filter(m => m.autor !== 'Sistema').map(m => op.set(`projetos/${id}/mensagens/${novoId('m')}`, { autor: uidPorNome(m.autor), html: esc(m.texto), criadoEm: tsBR(m.dataHora) }));
      if (msgs.length) await Data.batch(msgs);
      log(`✓ projeto ${info.titulo} (${msgs.length} mensagens)`);
    }
    // 3. oportunidades
    const ops = Object.values(antigo.oportunidades || {}).map(o => op.set(`oportunidades/${o.id}`, {
      tipo: o.tipo, titulo: o.titulo, descricao: o.descricao || '', orientador: o.orientador || '', local: o.local || '', link: o.link || '', vagas: o.vagas || 1,
      eixos: [AREA_EIXO[(o.area || '').toLowerCase()] || 'clinica'], data: brParaISO(o.data), horaInicio: o.horaInicio || '', horaFim: o.horaFim || '', cargaHoraria: o.cargaHorariaTotal || 0, orientacoes: o.orientacoesConfirmados || '',
      criadoPorCargo: o.criadoPorCargo, criadoPor: uidPorNome(o.criadoPorNome), fases: o.fases, faseAtual: o.faseAtual || 0, inscritos: mapL(o.inscritos), confirmados: mapL(o.confirmados), presencas: [],
      atualizacoes: (o.atualizacoes || []).map(a => ({ texto: a.texto, anexoNome: a.anexoNome || '', anexoUrl: a.anexoUrl || '', em: tsBR(a.data), autor: uidPorNome(a.autor) })), projetoId: o.projetoGeradoId ? 'p' + o.projetoGeradoId : null, criadoEm: agora
    }));
    // 4. aulas, mural→fórum, financeiro, atas
    (antigo.aulas || []).forEach(a => ops.push(op.set(`aulas/${a.id}`, { titulo: a.titulo, professor: a.professor || '', data: brParaISO(a.data), hora: a.hora || '', local: a.local || '', cargaHoraria: a.cargaHoraria || 0, eixos: ['clinica'], imagem: '', descHtml: a.desc ? `<p>${esc(a.desc)}</p>` : '', seguidores: mapL(a.seguidores), presentes: null, certificadosEnviados: mapL(a.certificadosEnviados), criadoEm: agora })));
    (antigo.mural || []).forEach(m => ops.push(op.set(`forum/${m.id}`, { tipo: 'post', titulo: m.texto.slice(0, 70) + (m.texto.length > 70 ? '…' : ''), html: `<p>${esc(m.texto)}</p>${m.anexoUrl ? `<p><a href="${esc(m.anexoUrl)}">${esc(m.anexoNome || 'Anexo')}</a></p>` : ''}`, eixos: ['clinica'], autor: uidPorNome(m.autor), criadoEm: tsBR(m.data), fixado: false, nComentarios: 0, enquete: null })));
    (antigo.financeiro || []).forEach(f => ops.push(op.set(`financeiro/${f.id}`, { tipo: f.tipo, descricao: f.descricao, valor: Number(f.valor) || 0, data: brParaISO(f.data), criadoEm: agora })));
    (antigo.atasGerais || []).forEach(a => ops.push(op.set(`atas/${a.id}`, { titulo: a.titulo, data: brParaISO(a.data), resumoHtml: a.resumo ? `<p>${esc(a.resumo)}</p>` : '', link: a.linkAta || '', criadoEm: agora })));
    // 5. agendas pessoais
    Object.entries(antigo.eventosPessoais || {}).forEach(([uidAnt, evs]) => { const uid = mapa[uidAnt]; if (uid) (evs || []).forEach(ev => ops.push(op.set(`usuarios/${uid}/eventos/${ev.id}`, { titulo: ev.titulo, data: brParaISO(ev.data), horaInicio: ev.horaInicio || '', horaFim: ev.horaFim || '', categoria: ev.categoria || 'Outros', subcategoria: ev.subcategoria || null, projetoId: ev.projetoId ? 'p' + ev.projetoId : null, criadoEm: agora }))); });
    // 6. certificados
    (antigo.certificados || []).forEach(c => { const uid = mapa[c.userId]; if (!uid) return; const tipo = c.tipo === 'Estagio' ? 'Estagio' : c.tipo; ops.push(op.set(`certificados/${c.id}`, {
      userId: uid, nomeMembro: c.nomeMembro, tipo, cargaHoraria: c.cargaHoraria || 0, cargoTexto: c.cargoTexto || '', projetoId: c.projetoId ? 'p' + c.projetoId : null, periodoInicio: c.periodoInicio || null, periodoFim: c.periodoFim || null,
      titulo: tituloCert(tipo, c.cargoTexto), signerUid: S.config.orientadoraUid || null, signerNome: c.orientadoraNome || S.config.orientadoraNome || '', signerCargo: c.orientadoraCargo || 'Orientadora — LACMES',
      status: STATUS_ANTIGO[c.status] || 'pendente_presidencia', urlPresManual: c.urlPresidente || null, pdfUrl: c.urlFinal || null, codigo: 'LAC-' + c.id.slice(-8).toUpperCase(), criadoPor: S.uid, criadoEm: agora, emitidoEm: c.status === 'assinado' ? agora : null,
      historico: [{ em: agora, por: S.uid, acao: 'Importado do sistema antigo' }] })); });
    if (antigo.configCertificado) ops.push(op.set('config/geral', { orientadoraNome: antigo.configCertificado.orientadoraNome || '', presidenteUid: mapa[(antigo.usuarios[antigo.configCertificado.presidenteId] || {}).id] || S.uid, areasEstagio: antigo.areasEstagio || [] }, { merge: true }));
    await Data.batch(ops);
    log(`✓ ${ops.length} registros (oportunidades, aulas, fórum, financeiro, atas, agendas, certificados)`);
    log('\nConcluído!' + (avisos.length ? '\n\nATENÇÃO:\n' + avisos.join('\n') : ''));
    toast('Importação concluída.', 'ok');
  } catch (e) { console.error(e); log('ERRO: ' + (e.code || e.message)); toast('A importação parou com erro — veja o registro.', 'erro'); }
  b.disabled = false;
});

export const usuarios = { titulo: 'Usuários', render, visivel: (u) => P.usuarios(u) };
export const migracao = { titulo: 'Importar dados antigos', render: renderMigracao, visivel: (u) => P.admin(u) };
