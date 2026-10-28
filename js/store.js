import { Data } from './data.js';
import { P } from './dominio.js';
import { debounce } from './util.js';

export const S = {
  uid: null, eu: null,
  usuarios: {}, projetos: {}, oportunidades: {},
  aulas: [], forum: [], financeiro: [], atas: [], certificados: [], lotes: [],
  config: {}, eventos: [], eventosLiga: [], notificacoes: [], planejamento: [], arquivosLiga: [], documentos: [],
  carregado: false
};

const ouvintes = new Set();
export const aoMudar = (cb) => { ouvintes.add(cb); return () => ouvintes.delete(cb); };
const avisar = debounce(() => ouvintes.forEach(cb => cb()), 60);

let subs = [], subsPapel = [], papelAtual = '';
const ordenarDesc = (a, b) => (b.criadoEm || 0) - (a.criadoEm || 0);

export function iniciarStore(uid) {
  pararStore();
  S.uid = uid;
  const mapa = (alvo) => (lista) => { S[alvo] = Object.fromEntries(lista.map(d => [d.id, d])); avisar(); };
  const lista = (alvo, ord) => (l) => { S[alvo] = ord ? l.sort(ord) : l; avisar(); };

  subs.push(Data.watchCol('usuarios', (l) => {
    S.usuarios = Object.fromEntries(l.map(d => [d.id, d]));
    S.eu = S.usuarios[uid] || null;
    const papel = S.eu ? `${S.eu.tipo}|${S.eu.cargo || ''}` : '';
    if (papel !== papelAtual) { papelAtual = papel; iniciarPapel(); }
    S.carregado = true;
    avisar();
  }));
  subs.push(Data.watchDoc('config/geral', (d) => { S.config = d || {}; avisar(); }));
  subs.push(Data.watchCol('projetos', mapa('projetos')));
  subs.push(Data.watchCol('oportunidades', mapa('oportunidades')));
  subs.push(Data.watchCol('aulas', lista('aulas', (a, b) => (a.data || '').localeCompare(b.data || '') || (a.hora || '').localeCompare(b.hora || ''))));
  subs.push(Data.watchCol('forum', lista('forum', ordenarDesc), { orderBy: ['criadoEm', 'desc'], limit: 300 }));
  subs.push(Data.watchCol('financeiro', lista('financeiro', (a, b) => (b.data || '').localeCompare(a.data || ''))));
  subs.push(Data.watchCol('eventosLiga', lista('eventosLiga')));
  subs.push(Data.watchCol('arquivosLiga', lista('arquivosLiga', ordenarDesc)));
  subs.push(Data.watchCol(`usuarios/${uid}/eventos`, lista('eventos')));
  subs.push(Data.watchCol(`usuarios/${uid}/notificacoes`, lista('notificacoes', ordenarDesc), { orderBy: ['criadoEm', 'desc'], limit: 60 }));
}

function iniciarPapel() {
  subsPapel.forEach(u => u()); subsPapel = [];
  const eu = S.eu; if (!eu) return;
  if (P.verAtas(eu)) subsPapel.push(Data.watchCol('atas', (l) => { S.atas = l.sort((a, b) => (b.data || '').localeCompare(a.data || '')); avisar(); }));
  else S.atas = [];

  if (P.documentos(eu)) subsPapel.push(Data.watchCol('documentos', (l) => { S.documentos = l.sort(ordenarDesc); avisar(); }));
  else S.documentos = [];

  const ordPlan = (l) => { S.planejamento = l.sort((a, b) => (a.data || '9999').localeCompare(b.data || '9999') || (a.hora || '').localeCompare(b.hora || '')); avisar(); };
  if (P.admin(eu)) subsPapel.push(Data.watchCol('planejamento', ordPlan));
  else if (eu.cargo) subsPapel.push(Data.watchCol('planejamento', ordPlan, { where: [['cargos', 'array-contains', eu.cargo]] }));
  else S.planejamento = [];

  if (P.admin(eu)) {
    subsPapel.push(Data.watchCol('certificados', (l) => { S.certificados = l.sort(ordenarDesc); avisar(); }));
    subsPapel.push(Data.watchCol('lotesCert', (l) => { S.lotes = l.sort(ordenarDesc); avisar(); }));
  } else {
    subsPapel.push(Data.watchCol('certificados', (l) => { S.certificados = l.sort(ordenarDesc); avisar(); }, { where: [['userId', '==', S.uid]] }));
    S.lotes = [];
  }
}

export function pararStore() {
  subs.forEach(u => u()); subsPapel.forEach(u => u());
  subs = []; subsPapel = []; papelAtual = '';
  Object.assign(S, { uid: null, eu: null, usuarios: {}, projetos: {}, oportunidades: {}, aulas: [], forum: [], financeiro: [], atas: [], certificados: [], lotes: [], config: {}, eventos: [], eventosLiga: [], notificacoes: [], planejamento: [], arquivosLiga: [], documentos: [], carregado: false });
}

let subsTela = {};
export function ouvirTela(chave, criar) {
  if (subsTela[chave]) return;
  subsTela[chave] = criar(avisar);
}
export function limparTela() { Object.values(subsTela).forEach(u => u && u()); subsTela = {}; }
export const tela = {};

export const usuario = (uid) => S.usuarios[uid] || null;
export const nomeDe = (uid) => (S.usuarios[uid] && S.usuarios[uid].nome) || 'Usuário removido';
export const primeiroNome = (uid) => nomeDe(uid).split(' ')[0];
export const usuariosAtivos = () => Object.values(S.usuarios).filter(u => u.ativo !== false).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
export const meusProjetos = () => {
  const eu = S.eu; if (!eu) return [];
  const tipos = P.tipos(eu);
  return Object.values(S.projetos).filter(p => P.admin(eu) || (p.membroIds || []).includes(S.uid) || tipos.includes(p.categoria) || p.orientadorUid === S.uid)
    .sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
};
export const souMembro = (p) => (p.membroIds || []).includes(S.uid);
export const souCoordenador = (p) => {
  const eu = S.eu; if (!eu || !p) return false;
  if (P.admin(eu) || P.tipos(eu).includes(p.categoria) || p.orientadorUid === S.uid) return true;
  return (p.membros || []).some(m => m.uid === S.uid && (m.papel === 'Orientador' || m.papel === 'Coordenador'));
};
