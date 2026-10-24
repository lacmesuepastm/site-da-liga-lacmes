// ============================================================================
// CAMADA DE DADOS — uma única API usada pelo site inteiro, com dois "motores":
//   • Firebase (Auth + Firestore em tempo real, com cache offline)
//   • Demonstração (localStorage + sincronização entre abas), quando o
//     config.js ainda não foi preenchido.
// Caminhos seguem o Firestore: "colecao", "colecao/id", "colecao/id/sub".
// Datas/horários são guardados como números (Date.now()) ou "AAAA-MM-DD".
// ============================================================================
import { FIREBASE_CONFIG, DEMO_MODE } from './config.js';

// Operações especiais de campo (funcionam nos dois motores)
export const F = {
  arrayUnion: (...values) => ({ __op: 'arrayUnion', values }),
  arrayRemove: (...values) => ({ __op: 'arrayRemove', values }),
  increment: (n) => ({ __op: 'increment', n }),
  del: () => ({ __op: 'delete' })
};
const isOp = (v) => v && typeof v === 'object' && typeof v.__op === 'string';

// Indicador de sincronização
const syncListeners = new Set();
let pendentes = 0;
function notificarSync() {
  const estado = !navigator.onLine ? 'offline' : (pendentes > 0 ? 'salvando' : 'ok');
  syncListeners.forEach(cb => cb(estado));
}
window.addEventListener('online', notificarSync);
window.addEventListener('offline', notificarSync);
async function rastrear(promise) {
  pendentes++; notificarSync();
  try { return await promise; } finally { pendentes--; notificarSync(); }
}

// ----------------------------------------------------------------------------
// MOTOR DEMONSTRAÇÃO
// ----------------------------------------------------------------------------
function criarMotorDemo() {
  const CHAVE = 'lacmes-demo-db-v2';
  const canal = 'BroadcastChannel' in window ? new BroadcastChannel('lacmes-demo') : null;
  let store = {};
  const watchers = new Set();
  const authCbs = new Set();
  let usuarioAtual = null;

  function carregar() { try { store = JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch { store = {}; } }
  function persistir() {
    try { localStorage.setItem(CHAVE, JSON.stringify(store)); }
    catch (e) { console.warn('Armazenamento local cheio — use imagens menores no modo demonstração.', e); }
    canal && canal.postMessage('mudou');
  }
  carregar();
  canal && (canal.onmessage = () => { carregar(); dispararTodos(); });

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const separar = (p) => { const i = p.lastIndexOf('/'); return [p.slice(0, i), p.slice(i + 1)]; };

  function aplicarValor(atual, v) {
    if (!isOp(v)) return clone(v);
    if (v.__op === 'arrayUnion') { const arr = Array.isArray(atual) ? atual.slice() : []; v.values.forEach(x => { if (!arr.some(y => JSON.stringify(y) === JSON.stringify(x))) arr.push(clone(x)); }); return arr; }
    if (v.__op === 'arrayRemove') { const s = v.values.map(x => JSON.stringify(x)); return (Array.isArray(atual) ? atual : []).filter(y => !s.includes(JSON.stringify(y))); }
    if (v.__op === 'increment') return (Number(atual) || 0) + v.n;
    return undefined;
  }
  function limparOps(obj) {
    if (Array.isArray(obj)) return obj.map(limparOps);
    if (obj && typeof obj === 'object') {
      if (isOp(obj)) return aplicarValor(undefined, obj);
      const r = {}; Object.keys(obj).forEach(k => { const v = limparOps(obj[k]); if (v !== undefined) r[k] = v; }); return r;
    }
    return obj;
  }
  function filtrar(lista, opts = {}) {
    let r = lista;
    (opts.where || []).forEach(([campo, op, valor]) => {
      r = r.filter(d => {
        const v = campo.split('.').reduce((o, k) => (o == null ? o : o[k]), d);
        if (op === '==') return v === valor;
        if (op === '!=') return v !== valor;
        if (op === 'array-contains') return Array.isArray(v) && v.includes(valor);
        if (op === 'array-contains-any') return Array.isArray(v) && v.some(x => valor.includes(x));
        if (op === 'in') return valor.includes(v);
        if (op === '>=') return v >= valor;
        if (op === '<=') return v <= valor;
        if (op === '>') return v > valor;
        if (op === '<') return v < valor;
        return true;
      });
    });
    if (opts.orderBy) {
      const [campo, dir] = opts.orderBy;
      r = r.slice().sort((a, b) => ((a[campo] ?? 0) > (b[campo] ?? 0) ? 1 : -1) * (dir === 'desc' ? -1 : 1));
    }
    if (opts.limit) r = r.slice(0, opts.limit);
    return r;
  }
  function lerCol(path, opts) {
    const col = store[path] || {};
    return filtrar(Object.keys(col).map(id => ({ id, ...clone(col[id]) })), opts);
  }
  function dispararTodos() { watchers.forEach(w => w.disparar()); }

  const motor = {
    modo: 'demo',
    async init() {},
    watchCol(path, cb, opts) {
      const w = { disparar: () => cb(lerCol(path, opts)) };
      watchers.add(w); setTimeout(w.disparar, 0);
      return () => watchers.delete(w);
    },
    watchDoc(path, cb) {
      const [col, id] = separar(path);
      const w = { disparar: () => { const d = (store[col] || {})[id]; cb(d ? { id, ...clone(d) } : null); } };
      watchers.add(w); setTimeout(w.disparar, 0);
      return () => watchers.delete(w);
    },
    async getDoc(path) { const [col, id] = separar(path); const d = (store[col] || {})[id]; return d ? { id, ...clone(d) } : null; },
    async getCol(path, opts) { return lerCol(path, opts); },
    newId() { return rid(); },
    async add(path, data) { const id = rid(); await motor.set(`${path}/${id}`, data); return id; },
    async set(path, data, opts = {}) {
      const [col, id] = separar(path);
      store[col] = store[col] || {};
      store[col][id] = opts.merge ? { ...(store[col][id] || {}), ...limparOps(data) } : limparOps(data);
      persistir(); dispararTodos();
    },
    async update(path, parcial) {
      const [col, id] = separar(path);
      const doc = (store[col] || {})[id];
      if (!doc) throw new Error('Documento não existe: ' + path);
      Object.keys(parcial).forEach(chave => {
        const partes = chave.split('.');
        let alvo = doc;
        for (let i = 0; i < partes.length - 1; i++) { if (typeof alvo[partes[i]] !== 'object' || alvo[partes[i]] === null) alvo[partes[i]] = {}; alvo = alvo[partes[i]]; }
        const ultima = partes[partes.length - 1];
        const novo = aplicarValor(alvo[ultima], parcial[chave]);
        if (novo === undefined) delete alvo[ultima]; else alvo[ultima] = novo;
      });
      persistir(); dispararTodos();
    },
    async del(path) {
      const [col, id] = separar(path);
      if (store[col]) delete store[col][id];
      Object.keys(store).forEach(k => { if (k.startsWith(path + '/')) delete store[k]; });
      persistir(); dispararTodos();
    },
    async batch(ops) {
      for (const op of ops) {
        if (op.tipo === 'set') await motor.set(op.path, op.data, op.opts);
        else if (op.tipo === 'update') await motor.update(op.path, op.data);
        else if (op.tipo === 'del') await motor.del(op.path);
      }
    },
    // --- autenticação simulada ---
    auth: {
      onChange(cb) {
        authCbs.add(cb);
        const uid = sessionStorage.getItem('lacmes-demo-uid');
        usuarioAtual = uid ? { uid, email: ((store.usuarios || {})[uid] || {}).email } : null;
        setTimeout(() => cb(usuarioAtual), 0);
        return () => authCbs.delete(cb);
      },
      async login(identificador, senha) {
        const id = identificador.trim().toLowerCase();
        const usuarios = store.usuarios || {};
        const uid = Object.keys(usuarios).find(k => (usuarios[k].username || '').toLowerCase() === id || (usuarios[k].email || '').toLowerCase() === id);
        const senhas = (store._demo_senhas || {}).mapa || {};
        if (!uid || senhas[uid] !== senha) throw new Error('auth/invalid-credential');
        sessionStorage.setItem('lacmes-demo-uid', uid);
        usuarioAtual = { uid, email: usuarios[uid].email };
        authCbs.forEach(cb => cb(usuarioAtual));
      },
      async logout() { sessionStorage.removeItem('lacmes-demo-uid'); usuarioAtual = null; authCbs.forEach(cb => cb(null)); },
      async criarConta(email, senha) {
        const uid = 'u_' + rid();
        store._demo_senhas = store._demo_senhas || {};
        store._demo_senhas.mapa = { ...((store._demo_senhas.mapa) || {}), [uid]: senha };
        persistir();
        return uid;
      },
      async criarContaPropria(email, senha) {
        const uid = await motor.auth.criarConta(email, senha);
        sessionStorage.setItem('lacmes-demo-uid', uid);
        usuarioAtual = { uid, email };
        return uid;
      },
      async recuperarSenha() { throw new Error('No modo demonstração não há envio de e-mail.'); },
      async alterarSenha(atual, nova) {
        const mapa = (store._demo_senhas || {}).mapa || {};
        if (mapa[usuarioAtual.uid] !== atual) throw new Error('auth/wrong-password');
        mapa[usuarioAtual.uid] = nova; persistir();
      },
      async token() { return 'demo'; },
      atual: () => usuarioAtual
    },
    // usado para popular os dados de exemplo
    _resetar(dados) { store = dados; persistir(); dispararTodos(); },
    _vazio() { return !store.usuarios || Object.keys(store.usuarios).length === 0; }
  };
  return motor;
}

// ----------------------------------------------------------------------------
// MOTOR FIREBASE
// ----------------------------------------------------------------------------
const V = '10.14.1';
const CDN = `https://www.gstatic.com/firebasejs/${V}`;

function criarMotorFirebase() {
  let fb = {}, app, auth, db, usuarioAtual = null;

  function converter(v) {
    if (isOp(v)) {
      if (v.__op === 'arrayUnion') return fb.fs.arrayUnion(...v.values);
      if (v.__op === 'arrayRemove') return fb.fs.arrayRemove(...v.values);
      if (v.__op === 'increment') return fb.fs.increment(v.n);
      if (v.__op === 'delete') return fb.fs.deleteField();
    }
    if (Array.isArray(v)) return v.map(converter);
    if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
      const r = {}; Object.keys(v).forEach(k => { if (v[k] !== undefined) r[k] = converter(v[k]); }); return r;
    }
    return v;
  }
  const ref = (path) => fb.fs.doc(db, path);
  function montarQuery(path, opts = {}) {
    const partes = [fb.fs.collection(db, path)];
    (opts.where || []).forEach(([c, op, val]) => partes.push(fb.fs.where(c, op, val)));
    if (opts.orderBy) partes.push(fb.fs.orderBy(opts.orderBy[0], opts.orderBy[1] || 'asc'));
    if (opts.limit) partes.push(fb.fs.limit(opts.limit));
    return partes.length === 1 ? partes[0] : fb.fs.query(...partes);
  }
  const mapear = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const motor = {
    modo: 'firebase',
    async init() {
      const [a, au, fs] = await Promise.all([
        import(`${CDN}/firebase-app.js`), import(`${CDN}/firebase-auth.js`), import(`${CDN}/firebase-firestore.js`)
      ]);
      fb = { app: a, auth: au, fs };
      app = a.initializeApp(FIREBASE_CONFIG);
      auth = au.getAuth(app);
      try {
        db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
      } catch { db = fs.getFirestore(app); }
      motor._app = app;
    },
    watchCol(path, cb, opts) {
      return fb.fs.onSnapshot(montarQuery(path, opts), (s) => cb(mapear(s)), (e) => { console.warn('Leitura negada/erro em', path, e.code || e); cb([]); });
    },
    watchDoc(path, cb) {
      return fb.fs.onSnapshot(ref(path), (s) => cb(s.exists() ? { id: s.id, ...s.data() } : null), (e) => { console.warn('Erro em', path, e.code || e); cb(null); });
    },
    async getDoc(path) { const s = await fb.fs.getDoc(ref(path)); return s.exists() ? { id: s.id, ...s.data() } : null; },
    async getCol(path, opts) { return mapear(await fb.fs.getDocs(montarQuery(path, opts))); },
    newId() { return fb.fs.doc(fb.fs.collection(db, '_ids')).id; },
    async add(path, data) { const r = await rastrear(fb.fs.addDoc(fb.fs.collection(db, path), converter(data))); return r.id; },
    set: (path, data, opts = {}) => rastrear(fb.fs.setDoc(ref(path), converter(data), opts.merge ? { merge: true } : {})),
    update: (path, parcial) => rastrear(fb.fs.updateDoc(ref(path), converter(parcial))),
    del: (path) => rastrear(fb.fs.deleteDoc(ref(path))),
    async batch(ops) {
      // o Firestore aceita até 500 operações por lote
      for (let i = 0; i < ops.length; i += 450) {
        const b = fb.fs.writeBatch(db);
        ops.slice(i, i + 450).forEach(op => {
          if (op.tipo === 'set') b.set(ref(op.path), converter(op.data), op.opts && op.opts.merge ? { merge: true } : {});
          else if (op.tipo === 'update') b.update(ref(op.path), converter(op.data));
          else if (op.tipo === 'del') b.delete(ref(op.path));
        });
        await rastrear(b.commit());
      }
    },
    auth: {
      onChange(cb) { return fb.auth.onAuthStateChanged(auth, (u) => { usuarioAtual = u ? { uid: u.uid, email: u.email } : null; cb(usuarioAtual); }); },
      async login(identificador, senha) {
        let email = identificador.trim();
        if (!email.includes('@')) {
          const l = await motor.getDoc(`logins/${email.toLowerCase()}`);
          if (!l) throw new Error('auth/invalid-credential');
          email = l.email;
        }
        await fb.auth.signInWithEmailAndPassword(auth, email, senha);
      },
      logout: () => fb.auth.signOut(auth),
      // Cria a conta de OUTRA pessoa sem derrubar a sessão de quem está logado
      // (usa uma segunda instância do Firebase só para isso).
      async criarConta(email, senha) {
        const sec = fb.app.initializeApp(FIREBASE_CONFIG, 'secundario-' + Date.now());
        try {
          const a2 = fb.auth.getAuth(sec);
          const cred = await fb.auth.createUserWithEmailAndPassword(a2, email, senha);
          await fb.auth.signOut(a2);
          return cred.user.uid;
        } finally { await fb.app.deleteApp(sec); }
      },
      async criarContaPropria(email, senha) { const c = await fb.auth.createUserWithEmailAndPassword(auth, email, senha); return c.user.uid; },
      recuperarSenha: (email) => fb.auth.sendPasswordResetEmail(auth, email),
      async alterarSenha(atual, nova) {
        const cred = fb.auth.EmailAuthProvider.credential(auth.currentUser.email, atual);
        await fb.auth.reauthenticateWithCredential(auth.currentUser, cred);
        await fb.auth.updatePassword(auth.currentUser, nova);
      },
      token: () => auth.currentUser ? auth.currentUser.getIdToken() : null,
      atual: () => usuarioAtual
    }
  };
  return motor;
}

export const Data = DEMO_MODE ? criarMotorDemo() : criarMotorFirebase();
export const onSync = (cb) => { syncListeners.add(cb); cb(navigator.onLine ? 'ok' : 'offline'); return () => syncListeners.delete(cb); };
export const op = {
  set: (path, data, opts) => ({ tipo: 'set', path, data, opts }),
  update: (path, data) => ({ tipo: 'update', path, data }),
  del: (path) => ({ tipo: 'del', path })
};
