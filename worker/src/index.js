const SCOPES = 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/cloud-platform';
const TIPOS_OK = /^(image\/(png|jpe?g|gif|webp)|application\/pdf|application\/vnd\.openxmlformats-officedocument\.[a-z.]+|application\/vnd\.oasis\.opendocument\.[a-z.-]+|application\/msword|application\/vnd\.ms-(excel|powerpoint)|application\/(rtf|zip|x-zip-compressed)|text\/(csv|plain))$/;
const MAX_BYTES = 15 * 1024 * 1024;

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    try {
      if (req.method === 'GET' && url.pathname.startsWith('/f/')) return servirArquivo(url, env);
      if (req.method === 'GET' && url.pathname === '/') return json({ ok: true, servico: 'LACMES API' }, 200, cors);
      if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405, cors);

      const usuario = await verificarIdToken(req, env);
      if (!usuario) return json({ erro: 'Não autenticado' }, 401, cors);

      if (url.pathname === '/push') {
        const remetente = await lerDoc(env, `usuarios/${usuario.uid}`);
        if (!remetente || remetente.ativo === false) return json({ erro: 'Usuário sem cadastro ativo' }, 403, cors);
        const { uids = [], titulo, corpo = '', url: destino = '#/inicio', tag = '' } = await req.json();
        if (!titulo || !Array.isArray(uids) || uids.length > 500) return json({ erro: 'Dados inválidos' }, 400, cors);
        ctx.waitUntil(enviarPush(env, uids, { titulo, corpo, url: destino, tag }));
        return json({ ok: true, destinos: uids.length }, 200, cors);
      }
      if (url.pathname === '/admin/usuario') return alterarUsuario(req, env, usuario, cors);
      if (url.pathname === '/upload') return upload(req, env, usuario, cors, url);
      return json({ erro: 'Rota não encontrada' }, 404, cors);
    } catch (e) {
      console.error(e);
      return json({ erro: e.message }, 500, cors);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(lembretesDaVespera(env));
  }
};

function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}
function corsHeaders(req, env) {
  const origem = req.headers.get('Origin') || '';
  const permitidas = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = permitidas.includes(origem) || /^http:\/\/localhost(:\d+)?$/.test(origem);
  return { 'Access-Control-Allow-Origin': ok ? origem : (permitidas[0] || ''), 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Vary': 'Origin' };
}
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlTexto = (s) => b64url(new TextEncoder().encode(s));
function b64urlDecode(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
const conta = (env) => JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);

let cacheChaves = { em: 0, chaves: {} };
async function chavesGoogle() {
  if (Date.now() - cacheChaves.em < 3600_000) return cacheChaves.chaves;
  const r = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  const { keys } = await r.json();
  cacheChaves = { em: Date.now(), chaves: Object.fromEntries(keys.map(k => [k.kid, k])) };
  return cacheChaves.chaves;
}
async function verificarIdToken(req, env) {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const cab = JSON.parse(new TextDecoder().decode(b64urlDecode(partes[0])));
  const dados = JSON.parse(new TextDecoder().decode(b64urlDecode(partes[1])));
  const projeto = conta(env).project_id;
  const agora = Math.floor(Date.now() / 1000);
  if (cab.alg !== 'RS256' || dados.aud !== projeto || dados.iss !== `https://securetoken.google.com/${projeto}` || dados.exp < agora || !dados.sub) return null;
  const jwk = (await chavesGoogle())[cab.kid];
  if (!jwk) return null;
  const chave = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', chave, b64urlDecode(partes[2]), new TextEncoder().encode(partes[0] + '.' + partes[1]));
  return ok ? { uid: dados.sub, email: dados.email } : null;
}

let cacheAcesso = { token: null, expira: 0 };
async function tokenServico(env) {
  if (cacheAcesso.token && Date.now() < cacheAcesso.expira) return cacheAcesso.token;
  const sa = conta(env);
  const agora = Math.floor(Date.now() / 1000);
  const cab = b64urlTexto(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corpo = b64urlTexto(JSON.stringify({ iss: sa.client_email, scope: SCOPES, aud: sa.token_uri, iat: agora, exp: agora + 3600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const chave = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), c => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const assinatura = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', chave, new TextEncoder().encode(`${cab}.${corpo}`));
  const r = await fetch(sa.token_uri, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${cab}.${corpo}.${b64url(assinatura)}` });
  const d = await r.json();
  if (!d.access_token) throw new Error('Falha ao autenticar conta de serviço: ' + JSON.stringify(d));
  cacheAcesso = { token: d.access_token, expira: Date.now() + (d.expires_in - 120) * 1000 };
  return d.access_token;
}

const baseFS = (env) => `https://firestore.googleapis.com/v1/projects/${conta(env).project_id}/databases/(default)/documents`;
function decodificar(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return Date.parse(v.timestampValue);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodificar);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, decodificar(x)]));
  return null;
}
function codificar(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(codificar) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, codificar(x)])) } };
}
async function listar(env, colecao) {
  const token = await tokenServico(env);
  const docs = []; let pagina = '';
  do {
    const r = await fetch(`${baseFS(env)}/${colecao}?pageSize=300${pagina ? '&pageToken=' + pagina : ''}`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    (d.documents || []).forEach(doc => docs.push({ id: doc.name.split('/').pop(), ...decodificar({ mapValue: { fields: doc.fields || {} } }) }));
    pagina = d.nextPageToken || '';
  } while (pagina);
  return docs;
}
async function lerDoc(env, caminho) {
  const r = await fetch(`${baseFS(env)}/${caminho}`, { headers: { Authorization: `Bearer ${await tokenServico(env)}` } });
  if (!r.ok) return null;
  const doc = await r.json();
  return decodificar({ mapValue: { fields: doc.fields || {} } });
}
async function gravarDoc(env, caminho, dados, campos) {
  const mascara = campos ? '?' + campos.map(c => 'updateMask.fieldPaths=' + encodeURIComponent(c)).join('&') : '';
  return fetch(`${baseFS(env)}/${caminho}${mascara}`, { method: 'PATCH', headers: { Authorization: `Bearer ${await tokenServico(env)}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: codificar(dados).mapValue.fields }) });
}

async function enviarPush(env, uids, { titulo, corpo, url, tag }) {
  const token = await tokenServico(env);
  const projeto = conta(env).project_id;
  let enviados = 0;
  await Promise.all([...new Set(uids)].map(async (uid) => {
    const doc = await lerDoc(env, `tokens/${uid}`);
    const tokens = (doc && doc.tokens) || [];
    if (!tokens.length) return;
    const invalidos = [];
    await Promise.all(tokens.map(async (t) => {
      const r = await fetch(`https://fcm.googleapis.com/v1/projects/${projeto}/messages:send`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: { token: t, webpush: { headers: { Urgency: 'high', TTL: '86400' }, data: { titulo: String(titulo).slice(0, 140), corpo: String(corpo).slice(0, 240), url: String(url), tag: String(tag || '') } } } })
      });
      if (r.ok) enviados++;
      else if (r.status === 404 || r.status === 400) invalidos.push(t);
    }));
    if (invalidos.length) await gravarDoc(env, `tokens/${uid}`, { tokens: tokens.filter(t => !invalidos.includes(t)) }, ['tokens']);
  }));
  return enviados;
}

async function alterarUsuario(req, env, usuario, cors) {
  const remetente = await lerDoc(env, `usuarios/${usuario.uid}`);
  if (!remetente || remetente.tipo !== 'admin' || remetente.ativo === false) return json({ erro: 'Somente a Presidência pode alterar e-mail ou senha.' }, 403, cors);
  const { uid, email, senha } = await req.json();
  if (!uid || (!email && !senha)) return json({ erro: 'Informe o usuário e o que alterar.' }, 400, cors);
  if (senha && String(senha).length < 6) return json({ erro: 'A senha precisa ter 6+ caracteres.' }, 400, cors);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ erro: 'E-mail inválido.' }, 400, cors);
  const corpo = { localId: uid };
  if (email) { corpo.email = String(email).toLowerCase(); corpo.emailVerified = false; }
  if (senha) corpo.password = String(senha);
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${conta(env).project_id}/accounts:update`, { method: 'POST', headers: { Authorization: `Bearer ${await tokenServico(env)}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  const resp = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (resp.error && resp.error.message) || 'Falha ao atualizar a conta.';
    return json({ erro: /EMAIL_EXISTS/.test(msg) ? 'Esse e-mail já pertence a outra conta.' : msg }, r.status === 400 ? 400 : 502, cors);
  }
  return json({ ok: true }, 200, cors);
}

async function upload(req, env, usuario, cors, url) {
  if (!env.ARQUIVOS) return json({ erro: 'R2 não configurado (binding ARQUIVOS)' }, 500, cors);
  const form = await req.formData();
  const arquivo = form.get('arquivo');
  if (!arquivo || typeof arquivo === 'string') return json({ erro: 'Envie o campo "arquivo"' }, 400, cors);
  if (arquivo.size > MAX_BYTES) return json({ erro: 'Arquivo maior que 15 MB' }, 413, cors);
  if (!TIPOS_OK.test(arquivo.type)) return json({ erro: 'Tipo de arquivo não permitido: ' + arquivo.type }, 415, cors);
  const pasta = String(form.get('pasta') || 'geral').replace(/[^a-z0-9/_-]/gi, '').slice(0, 60) || 'geral';
  const nome = (arquivo.name || 'arquivo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9._-]/gi, '-').slice(-80);
  const chave = `${pasta}/${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}-${nome}`;
  await env.ARQUIVOS.put(chave, arquivo.stream(), { httpMetadata: { contentType: arquivo.type, contentDisposition: `inline; filename="${nome}"` }, customMetadata: { uid: usuario.uid } });
  const publico = (env.PUBLIC_URL || url.origin).replace(/\/$/, '');
  return json({ url: `${publico}/f/${chave}` }, 200, cors);
}
async function servirArquivo(url, env) {
  const chave = decodeURIComponent(url.pathname.slice(3));
  const obj = env.ARQUIVOS && await env.ARQUIVOS.get(chave);
  if (!obj) return new Response('Não encontrado', { status: 404 });
  const h = new Headers(); obj.writeHttpMetadata(h);
  h.set('Cache-Control', 'public, max-age=31536000, immutable'); h.set('Access-Control-Allow-Origin', '*'); h.set('X-Content-Type-Options', 'nosniff');
  return new Response(obj.body, { headers: h });
}

function amanhaEmSantarem() {
  const agora = new Date(Date.now() - 3 * 3600_000);
  agora.setUTCDate(agora.getUTCDate() + 1);
  return agora.toISOString().slice(0, 10);
}
async function lembretesDaVespera(env) {
  const amanha = amanhaEmSantarem();
  const [usuarios, oportunidades, aulas, projetos] = await Promise.all(['usuarios', 'oportunidades', 'aulas', 'projetos'].map(c => listar(env, c)));
  const prefs = Object.fromEntries(usuarios.filter(u => u.ativo !== false).map(u => [u.id, u.notifPrefs || {}]));
  const quer = (uid, pref) => uid in prefs && prefs[uid][pref] !== false;
  const avisos = [];
  const br = amanha.split('-').reverse().join('/');

  oportunidades.filter(o => o.tipo === 'Estágio' && o.data === amanha).forEach(o => avisos.push({ uids: o.confirmados || [], pref: 'estagioAmanha', titulo: `Amanhã: ${o.titulo}`, corpo: `${o.horaInicio || ''}${o.horaFim ? '–' + o.horaFim : ''} · ${o.local || ''}${o.orientacoes ? ' · ' + o.orientacoes.slice(0, 80) : ''}`, url: '#/agenda', tag: 'estagio-' + o.id }));
  aulas.filter(a => a.data === amanha).forEach(a => avisos.push({ uids: a.seguidores || [], pref: 'aulas', titulo: `Aula amanhã: ${a.titulo}`, corpo: `${a.hora || ''} · ${a.local || ''}`, url: '#/aulas', tag: 'aula-' + a.id }));
  projetos.forEach(p => {
    (p.reunioes || []).filter(r => !r.concluida && r.data === amanha).forEach(r => avisos.push({ uids: p.membroIds || [], pref: 'reunioes', titulo: `Reunião amanhã: ${r.titulo}`, corpo: `${p.titulo} · ${r.hora || ''}${r.tipo === 'Online' ? ' · online' : ' · ' + (r.local || '')}`, url: `#/projetos/${p.id}/reunioes`, tag: 'reuniao-' + r.id }));
    const e = (p.escala || {})[amanha];
    if (e && (e.equipe || []).length) avisos.push({ uids: e.equipe, pref: 'reunioes', titulo: `Escala amanhã: ${p.titulo}`, corpo: `${e.hora || ''} · ${e.local || ''}`, url: `#/projetos/${p.id}/escala`, tag: 'escala-' + p.id });
    (p.tarefas || []).filter(t => !t.concluida && t.prazo === amanha).forEach(t => avisos.push({ uids: t.resp || [], pref: 'mencoes', titulo: `Prazo amanhã: ${t.titulo}`, corpo: p.titulo, url: `#/projetos/${p.id}/tarefas`, tag: 'tarefa-' + t.id }));
  });

  for (const a of avisos) {
    const uids = [...new Set(a.uids)].filter(u => quer(u, a.pref));
    if (!uids.length) continue;
    const agora = Date.now();
    await Promise.all(uids.map(uid => gravarDoc(env, `usuarios/${uid}/notificacoes/lembrete-${a.tag}-${amanha}`, { tipo: 'lembrete', titulo: a.titulo, corpo: a.corpo, url: a.url, lida: false, criadoEm: agora, de: 'sistema' })));
    await enviarPush(env, uids, a);
  }
  console.log(`Lembretes de ${br}: ${avisos.length} evento(s).`);
}
