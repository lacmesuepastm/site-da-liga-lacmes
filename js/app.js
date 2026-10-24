// ============================================================================
// APLICATIVO — autenticação, navegação (rotas #/...), barra lateral, sino de
// notificações, indicador de sincronização, instalação do PWA.
// ============================================================================
import { Data, onSync } from './data.js';
import { DEMO_MODE } from './config.js';
import { S, iniciarStore, pararStore, aoMudar, limparTela } from './store.js';
import { P, CARGOS, TIPOS_USUARIO, prefsPadrao } from './dominio.js';
import { ic, esc, acao, toast, avatar, tempoRelativo, abrirModal, val } from './util.js';
import { marcarLida, marcarTodasLidas, avisoLocal } from './notificar.js';
import { campo } from './ui.js';

import inicio from './pages/inicio.js';
import forum from './pages/forum.js';
import projetos from './pages/projetos.js';
import { oportunidades, inscricoes, painel } from './pages/oportunidades.js';
import agenda from './pages/agenda.js';
import aulas from './pages/aulas.js';
import certificados from './pages/certificados.js';
import { financeiro, atas } from './pages/gestao.js';
import { usuarios, migracao } from './pages/usuarios.js';
import perfil from './pages/perfil.js';

const PAGINAS = { inicio, forum, projetos, oportunidades, inscricoes, agenda, aulas, certificados, financeiro, atas, painel, usuarios, migracao, perfil };
const MENU = [
  ['inicio', 'Início', 'home'], ['forum', 'Fórum', 'forum'], ['projetos', 'Projetos', 'pasta'],
  ['oportunidades', 'Oportunidades', 'maleta'], ['inscricoes', 'Minhas inscrições', 'ticket'], ['agenda', 'Agenda', 'calendario'],
  ['aulas', 'Aulas', 'livro'], ['certificados', 'Certificados', 'certificado'], '—',
  ['painel', 'Painel da diretoria', 'painel'], ['financeiro', 'Financeiro', 'carteira'], ['atas', 'Atas da diretoria', 'ata'],
  ['usuarios', 'Usuários', 'usuarios'], ['perfil', 'Meu perfil', 'usuario']
];
const TABBAR = [['inicio', 'Início', 'home'], ['forum', 'Fórum', 'forum'], ['agenda', 'Agenda', 'calendario'], ['projetos', 'Projetos', 'pasta']];

const $ = (s) => document.querySelector(s);
let rotaAtual = '', paramsAtuais = [];

// ---------------------------------------------------------------- ROTAS ----
function lerRota() {
  const partes = (location.hash.replace(/^#\/?/, '') || 'inicio').split('/').map(decodeURIComponent);
  const id = PAGINAS[partes[0]] ? partes[0] : 'inicio';
  return [id, partes.slice(1)];
}
export const ir = (rota) => { if (location.hash !== '#/' + rota) location.hash = '#/' + rota; else renderizar(false); };
acao('ir', ({ rota }) => { fecharGaveta(); ir(rota); });

function podeVer(id) {
  const eu = S.eu; const pg = PAGINAS[id];
  return !pg.visivel || pg.visivel(eu);
}

// guarda valores digitados/rolagem para não perder nada quando os dados mudam
function capturar(view) {
  const est = { campos: {}, foco: null, rolagens: {} };
  view.querySelectorAll('input[id], textarea[id], select[id], [contenteditable="true"][id]').forEach(el => {
    if (el.type === 'file') return;
    est.campos[el.id] = el.isContentEditable ? el.innerHTML : (el.type === 'checkbox' ? el.checked : el.value);
  });
  const a = document.activeElement;
  if (a && a.id && view.contains(a)) est.foco = { id: a.id, ini: a.selectionStart, fim: a.selectionEnd };
  view.querySelectorAll('[data-rolagem]').forEach(el => { est.rolagens[el.dataset.rolagem] = { top: el.scrollTop, fundo: el.scrollHeight - el.scrollTop - el.clientHeight < 40 }; });
  est.janela = document.querySelector('.principal').scrollTop;
  return est;
}
function restaurar(view, est) {
  Object.entries(est.campos).forEach(([id, v]) => {
    const el = view.querySelector('#' + CSS.escape(id)); if (!el) return;
    if (el.isContentEditable) { if (el.innerHTML !== v) el.innerHTML = v; }
    else if (el.type === 'checkbox') el.checked = v; else el.value = v;
  });
  view.querySelectorAll('[data-rolagem]').forEach(el => {
    const r = est.rolagens[el.dataset.rolagem];
    if (!r || r.fundo) el.scrollTop = el.scrollHeight; else el.scrollTop = r.top;
  });
  document.querySelector('.principal').scrollTop = est.janela;
  if (est.foco) {
    const el = view.querySelector('#' + CSS.escape(est.foco.id));
    if (el) {
      el.focus({ preventScroll: true });
      if (el.isContentEditable) { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      else if (est.foco.ini != null) try { el.setSelectionRange(est.foco.ini, est.foco.fim); } catch { }
    }
  }
}

export function renderizar(mudouRota) {
  if (!S.eu) return;
  const [id, params] = lerRota();
  const trocou = mudouRota || id !== rotaAtual || params.join('/') !== paramsAtuais.join('/');
  if (trocou) limparTela();
  rotaAtual = id; paramsAtuais = params;
  const view = $('#view');
  if (!podeVer(id)) { location.hash = '#/inicio'; return; }
  const pg = PAGINAS[id];
  const est = trocou ? null : capturar(view);
  try {
    view.innerHTML = pg.render(params);
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="vazio">${ic('alerta')}<p>Erro ao montar esta página: ${esc(e.message)}</p></div>`;
  }
  if (trocou) {
    view.classList.remove('entrar'); void view.offsetWidth; view.classList.add('entrar');
    document.querySelector('.principal').scrollTop = 0;
    view.querySelectorAll('[data-rolagem]').forEach(el => { el.scrollTop = el.scrollHeight; });
  } else { view.classList.remove('entrar'); restaurar(view, est); }
  try { pg.montar && pg.montar(view, params, trocou); } catch (e) { console.error(e); }
  desenharMenu();
  $('#titulo-pagina').textContent = (pg.tituloDinamico && pg.tituloDinamico(params)) || pg.titulo;
  document.title = `${pg.titulo} · LACMES`;
}
window.addEventListener('hashchange', () => renderizar(true));
window.addEventListener('lacmes-render', () => renderizar(false));

// ---------------------------------------------------------------- MENU ----
function contadorPendencias() {
  const eu = S.eu;
  const assinar = S.certificados.filter(c => (c.status === 'pendente_presidencia' && P.admin(eu)) || (c.status === 'pendente_orientador' && c.signerUid === S.uid)).length;
  return { certificados: assinar };
}
function desenharMenu() {
  const eu = S.eu; if (!eu) return;
  const pend = contadorPendencias();
  $('#nav').innerHTML = MENU.map(m => {
    if (m === '—') return '<div class="nav-sep"></div>';
    const [id, nome, icone] = m;
    if (!podeVer(id)) return '';
    const rotulo = id === 'painel' && eu.cargo && CARGOS[eu.cargo] && CARGOS[eu.cargo].tipos.length ? CARGOS[eu.cargo].painel : nome;
    return `<a href="#/${id}" class="nav-item ${rotaAtual === id ? 'ativo' : ''}" data-action="ir" data-rota="${id}">${ic(icone)}<span class="nav-rotulo">${esc(rotulo)}</span>${pend[id] ? `<span class="nav-badge">${pend[id]}</span>` : ''}</a>`;
  }).join('');
  $('#tabbar').innerHTML = TABBAR.map(([id, nome, icone]) => `<a href="#/${id}" class="tab ${rotaAtual === id ? 'ativo' : ''}" data-action="ir" data-rota="${id}">${ic(icone)}<span>${nome}</span></a>`).join('') +
    `<button class="tab" data-action="abrirGaveta">${ic('menu')}<span>Mais</span></button>`;
  $('#sb-usuario').innerHTML = `${avatar(eu, 34)}<div class="sb-u-txt"><strong>${esc(eu.nome)}</strong><small>${esc(eu.cargo || TIPOS_USUARIO[eu.tipo] || '')}</small></div>`;
  desenharSino();
}
acao('toggleSidebar', () => { document.body.classList.toggle('sb-recolhida'); localStorage.setItem('lacmes-sb', document.body.classList.contains('sb-recolhida') ? '1' : ''); });
acao('abrirGaveta', () => document.body.classList.add('gaveta-aberta'));
const fecharGaveta = () => document.body.classList.remove('gaveta-aberta');
acao('fecharGaveta', fecharGaveta);

// ------------------------------------------------------- NOTIFICAÇÕES ----
function desenharSino() {
  const nao = S.notificacoes.filter(n => !n.lida).length;
  const b = $('#sino-badge');
  b.textContent = nao > 9 ? '9+' : nao; b.hidden = !nao;
  if (document.body.classList.contains('sino-aberto')) desenharListaNotif();
}
function desenharListaNotif() {
  const lista = S.notificacoes;
  $('#notif-lista').innerHTML = lista.length ? lista.map(n => `
    <button class="notif ${n.lida ? '' : 'nova'}" data-action="abrirNotif" data-id="${n.id}" data-url="${esc(n.url || '')}">
      <span class="notif-ponto"></span>
      <span class="notif-txt"><strong>${esc(n.titulo)}</strong>${n.corpo ? `<span>${esc(n.corpo)}</span>` : ''}<small>${tempoRelativo(n.criadoEm)}</small></span>
    </button>`).join('') : `<div class="vazio pequeno">${ic('sino')}<p>Nenhuma notificação por enquanto.</p></div>`;
}
acao('alternarSino', () => { document.body.classList.toggle('sino-aberto'); desenharListaNotif(); });
acao('abrirNotif', ({ id, url }) => { marcarLida(id); document.body.classList.remove('sino-aberto'); if (url) location.hash = url.replace(/^#?/, '#'); });
acao('lerTodas', () => marcarTodasLidas());
document.addEventListener('click', (e) => { if (!e.target.closest('#sino-painel, [data-action="alternarSino"]')) document.body.classList.remove('sino-aberto'); });

// --------------------------------------------------------- MENÇÕES ----
document.addEventListener('click', (e) => {
  const m = e.target.closest('.mencao'); if (!m || m.closest('[contenteditable="true"]')) return;
  const { kind, id } = m.dataset;
  const pid = m.closest('[data-projeto]')?.dataset.projeto;
  if (kind === 'user') { const u = S.usuarios[id]; if (u) cartaoPessoa(u); }
  else if (kind === 'file' && pid) { const a = (S.projetos[pid]?.arquivos || []).find(x => x.id === id); a ? window.open(a.url, '_blank', 'noopener') : toast('Arquivo não encontrado (pode ter sido removido).', 'erro'); }
  else if (kind === 'date') { location.hash = `#/agenda/${id}`; }
  else if (kind === 'task' && pid) { location.hash = `#/projetos/${pid}/tarefas`; }
});
function cartaoPessoa(u) {
  abrirModal({ titulo: u.nome, largura: 380, corpo: `<div class="cartao-pessoa">${avatar(u, 72)}<strong>${esc(u.nome)}</strong><span>${esc(u.email || '')}</span><span class="mudo">${esc(u.titulacao || '')}</span>${u.cargo ? `<span>${esc(u.cargo)}</span>` : ''}</div>` });
}

// -------------------------------------------------------------- SYNC ----
onSync((estado) => {
  const el = $('#sync'); if (!el) return;
  const txt = { ok: DEMO_MODE ? 'Modo demonstração (local)' : 'Sincronizado', salvando: 'Salvando…', offline: 'Offline — salvo no aparelho' }[estado];
  el.className = 'sync sync-' + estado; el.querySelector('span').textContent = txt;
});

// -------------------------------------------------------------- PWA ----
let promptInstalar = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); promptInstalar = e; document.body.classList.add('pode-instalar'); });
window.addEventListener('appinstalled', () => { document.body.classList.remove('pode-instalar'); toast('LACMES instalado!', 'ok'); });
export const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
export const instalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
acao('instalarApp', async () => {
  if (promptInstalar) { promptInstalar.prompt(); await promptInstalar.userChoice; promptInstalar = null; document.body.classList.remove('pode-instalar'); return; }
  abrirModal({ titulo: 'Instalar o app LACMES', largura: 420, corpo: ehIOS()
    ? `<ol class="passos"><li>Abra este site no <b>Safari</b>.</li><li>Toque em <b>Compartilhar</b> (quadrado com seta).</li><li>Escolha <b>Adicionar à Tela de Início</b>.</li><li>Abra pelo ícone da LACMES e ative as notificações em <b>Meu perfil</b>.</li></ol>`
    : `<ol class="passos"><li>No Chrome/Edge, abra o menu <b>⋮</b>.</li><li>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li></ol>` });
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW:', e));
if (ehIOS() && !instalado()) document.body.classList.add('pode-instalar');

// ------------------------------------------------------------ LOGIN ----
function mostrar(tela) {
  ['carregando', 'tela-login', 'app'].forEach(id => { $('#' + id).hidden = id !== tela; });
}
async function telaLogin() {
  mostrar('tela-login');
  const caixa = $('#login-form-area');
  let inicializado = true;
  if (!DEMO_MODE) {
    try { const pub = await Data.getDoc('config/publico'); inicializado = !!(pub && pub.inicializado); }
    catch (e) {
      const semRegras = /permission/i.test(e.code || e.message);
      caixa.innerHTML = `<p class="login-aviso">${ic('alerta')}<span>${semRegras
        ? 'O banco de dados ainda está bloqueado: publique as <b>regras do Firestore</b> (arquivo <code>firestore.rules</code>) no Console do Firebase e recarregue a página.'
        : 'Não foi possível conectar ao Firebase (' + esc(e.code || e.message) + '). Verifique a internet e recarregue.'}</span></p>
        <button class="btn btn-bloco" onclick="location.reload()">Recarregar</button>`;
      return;
    }
  }
  if (!inicializado) {
    caixa.innerHTML = `<p class="login-aviso">${ic('info')}<span>Primeiro acesso: crie a conta da <b>Presidência</b> (administrador geral).</span></p>
      <form data-submit="configurarPortal">
        ${campo('Nome completo', '<input id="ini-nome" required>')}
        ${campo('E-mail', '<input id="ini-email" type="email" required autocomplete="username">')}
        ${campo('Usuário (para login rápido)', '<input id="ini-user" required pattern="[a-z0-9._-]+" placeholder="presidencia">')}
        ${campo('Senha', '<input id="ini-senha" type="password" minlength="6" required autocomplete="new-password">')}
        <button class="btn btn-pri btn-bloco">Criar conta e configurar</button>
      </form>`;
    return;
  }
  caixa.innerHTML = `<form data-submit="entrar" autocomplete="on">
      ${campo('E-mail ou usuário', '<input id="login-id" required autocomplete="username" placeholder="seu.usuario">')}
      ${campo('Senha', '<input id="login-senha" type="password" required autocomplete="current-password" placeholder="••••••">')}
      <button class="btn btn-pri btn-bloco" id="btn-entrar">Entrar</button>
      <p class="login-erro" id="login-erro" hidden></p>
      <button type="button" class="link" data-action="esqueciSenha">Esqueci minha senha</button>
    </form>
    ${DEMO_MODE ? `<div class="login-demo">${ic('info')}<div><b>Modo demonstração</b> — os dados ficam só neste navegador.<br>Entre como <code>presidencia</code> / <code>lacmes2026</code>, <code>joao.pedro</code> / <code>pesquisa123</code>, <code>pedro.henrique</code> / <code>membro123</code> ou <code>orientadora</code> / <code>orienta123</code>.</div></div>` : ''}`;
}
acao('entrar', async () => {
  const b = $('#btn-entrar'); b.disabled = true; b.textContent = 'Entrando…';
  try { await Data.auth.login(val('login-id'), $('#login-senha').value); }
  catch (e) {
    const erro = $('#login-erro'); erro.hidden = false;
    erro.textContent = /network/i.test(e.code || e.message) ? 'Sem conexão com a internet.' : (/too-many/i.test(e.code || '') ? 'Muitas tentativas. Aguarde alguns minutos.' : 'Usuário ou senha incorretos.');
    b.disabled = false; b.textContent = 'Entrar';
  }
});
acao('esqueciSenha', async () => {
  const email = prompt('Digite o e-mail cadastrado para receber o link de redefinição:');
  if (!email) return;
  try { await Data.auth.recuperarSenha(email.trim()); toast('Se o e-mail estiver cadastrado, você receberá o link em instantes.', 'ok', 5000); }
  catch (e) { toast(e.message, 'erro'); }
});
acao('configurarPortal', async () => {
  const nome = val('ini-nome'), email = val('ini-email').toLowerCase(), username = val('ini-user').toLowerCase(), senha = $('#ini-senha').value;
  try {
    const uid = await Data.auth.criarContaPropria(email, senha);
    await Data.set(`usuarios/${uid}`, { nome, email, username, tipo: 'admin', cargo: null, titulacao: 'Presidência', vinculo: 'Diretoria', foto: '', ativo: true, eixosSeguidos: ['clinica'], notifPrefs: prefsPadrao(), criadoEm: Date.now() });
    await Data.set(`logins/${username}`, { email });
    await Data.set('config/geral', { presidenteUid: uid, orientadoraUid: null, orientadoraNome: '', areasEstagio: [], criadoEm: Date.now() });
    await Data.set('config/publico', { inicializado: true, em: Date.now() });
    toast('Portal configurado! Bem-vindo(a).', 'ok');
  } catch (e) { toast('Erro: ' + (e.code || e.message), 'erro', 6000); }
});
acao('sair', async () => { await Data.auth.logout(); });

// ------------------------------------------------------------ INÍCIO ----
let desligarRender = null, ultimaNotif = 0;
async function iniciar() {
  if (localStorage.getItem('lacmes-sb')) document.body.classList.add('sb-recolhida');
  await Data.init();
  if (DEMO_MODE) {
    const { popularDemo } = await import('./seed.js');
    popularDemo(Data);
    document.body.classList.add('modo-demo');
  }
  Data.auth.onChange((user) => {
    desligarRender && desligarRender(); desligarRender = null;
    if (!user) { pararStore(); telaLogin(); return; }
    mostrar('carregando');
    iniciarStore(user.uid);
    let primeira = true;
    desligarRender = aoMudar(() => {
      if (!S.carregado) return;
      if (!S.eu) { semCadastro(); return; }
      if (S.eu.ativo === false) { toast('Seu acesso foi desativado pela Presidência.', 'erro', 8000); Data.auth.logout(); return; }
      if (primeira) { primeira = false; mostrar('app'); renderizar(true); }
      else renderizar(false);
      if (S.notificacoes[0] && S.notificacoes[0].criadoEm !== ultimaNotif) { ultimaNotif = S.notificacoes[0].criadoEm; avisoLocal(S.notificacoes); }
    });
  });
}
function semCadastro() {
  mostrar('tela-login');
  $('#login-form-area').innerHTML = `<p class="login-aviso">${ic('alerta')}<span>Sua conta existe, mas ainda não tem cadastro no portal. Peça à Presidência para cadastrá-lo(a).</span></p><button class="btn btn-bloco" data-action="sair">Sair</button>`;
}

iniciar().catch(e => { console.error(e); $('#carregando').innerHTML = `<p style="padding:24px">Falha ao iniciar: ${esc(e.message)}</p>`; });
