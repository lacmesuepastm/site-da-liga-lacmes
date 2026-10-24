// ============================================================================
// NOTIFICAÃ‡Ã•ES â€” caixa de entrada no portal + push no celular (via Worker/FCM)
// ============================================================================
import { Data, F, op } from './data.js';
import { S, usuariosAtivos } from './store.js';
import { chamarWorker, novoId, toast } from './util.js';
import { VAPID_KEY, WORKER_URL, DEMO_MODE } from './config.js';

const querNotif = (u, pref) => !pref || !u.notifPrefs || u.notifPrefs[pref] !== false;

// PÃºblico: todos que aceitam `pref` + quem segue algum dos `eixos` (pref "eixos").
export function publico({ pref, eixos, uids, todos }) {
  const ativos = usuariosAtivos();
  const alvo = new Set();
  if (uids) uids.forEach(id => { const u = S.usuarios[id]; if (u && querNotif(u, pref)) alvo.add(id); });
  if (todos) ativos.forEach(u => { if (querNotif(u, pref)) alvo.add(u.id); });
  if (eixos && eixos.length) ativos.forEach(u => {
    if ((u.eixosSeguidos || []).some(e => eixos.includes(e)) && querNotif(u, 'eixos')) alvo.add(u.id);
  });
  alvo.delete(S.uid);
  return [...alvo];
}

// Grava na caixa de cada destinatÃ¡rio e dispara o push (se o Worker existir).
export async function notificar({ tipo, titulo, corpo = '', url = '#/inicio', ...aud }) {
  const destinos = publico(aud);
  if (!destinos.length) return 0;
  const agora = Date.now();
  await Data.batch(destinos.map(uid => op.set(`usuarios/${uid}/notificacoes/${novoId('n')}`, { tipo, titulo, corpo, url, lida: false, criadoEm: agora, de: S.uid })));
  chamarWorker('/push', { uids: destinos, titulo, corpo, url, tag: tipo }).catch(e => console.warn('Push nÃ£o enviado:', e.message));
  return destinos.length;
}

export const marcarLida = (id) => Data.update(`usuarios/${S.uid}/notificacoes/${id}`, { lida: true });
export async function marcarTodasLidas() {
  const ops = S.notificacoes.filter(n => !n.lida).map(n => op.update(`usuarios/${S.uid}/notificacoes/${n.id}`, { lida: true }));
  if (ops.length) await Data.batch(ops);
}

// --------------------------------------------------------------- PUSH ----
export const pushSuportado = () => 'Notification' in window && 'serviceWorker' in navigator;
export const pushStatus = () => (!pushSuportado() ? 'indisponivel' : Notification.permission);

export async function ativarPush() {
  if (!pushSuportado()) { toast('Este navegador nÃ£o suporta notificaÃ§Ãµes. No iPhone, instale o app na tela inicial primeiro.', 'erro', 6000); return false; }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { toast('PermissÃ£o de notificaÃ§Ã£o negada nas configuraÃ§Ãµes do navegador.', 'erro'); return false; }
  if (DEMO_MODE || !VAPID_KEY || !WORKER_URL) {
    toast('NotificaÃ§Ãµes ativadas neste dispositivo (avisos aparecem enquanto o portal estiver aberto).', 'ok', 5000);
    return true;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const { getMessaging, getToken, onMessage, isSupported } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js');
    if (!(await isSupported())) throw new Error('FCM nÃ£o suportado aqui');
    const messaging = getMessaging(Data._app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    await Data.set(`tokens/${S.uid}`, { tokens: F.arrayUnion(token), atualizadoEm: Date.now(), ua: navigator.userAgent.slice(0, 120) }, { merge: true });
    localStorage.setItem('lacmes-push-token', token);
    onMessage(messaging, (m) => { const d = m.data || {}; toast(d.titulo || (m.notification && m.notification.title) || 'Nova notificaÃ§Ã£o', 'info', 5000); });
    toast('NotificaÃ§Ãµes push ativadas neste dispositivo!', 'ok');
    return true;
  } catch (e) {
    console.error(e);
    toast('NÃ£o foi possÃ­vel registrar o push: ' + e.message, 'erro', 6000);
    return false;
  }
}

// Sem FCM (modo demo ou sem Worker): mostra notificaÃ§Ã£o do sistema quando chega
// algo novo e a aba estÃ¡ em segundo plano.
const inicioSessao = Date.now();
const jaMostradas = new Set();
export async function avisoLocal(notifs) {
  if (!pushSuportado() || Notification.permission !== 'granted') return;
  if (!DEMO_MODE && WORKER_URL && VAPID_KEY && localStorage.getItem('lacmes-push-token')) return; // o FCM cuida
  const novas = notifs.filter(n => !n.lida && n.criadoEm > inicioSessao && !jaMostradas.has(n.id));
  if (!novas.length) return;
  novas.forEach(n => jaMostradas.add(n.id));
  if (!document.hidden) return;
  const reg = await navigator.serviceWorker.getRegistration();
  novas.slice(0, 3).forEach(n => {
    const opts = { body: n.corpo || '', icon: 'assets/icons/icon-192.png', badge: 'assets/icons/icon-192.png', tag: n.id, data: { url: n.url } };
    reg ? reg.showNotification(n.titulo, opts) : new Notification(n.titulo, opts);
  });
}
