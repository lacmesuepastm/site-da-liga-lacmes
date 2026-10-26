import { ic, esc } from './util.js';

const S = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const EIXOS = [
  { id: 'clinica', nome: 'Clínica Médica', c: '#2F5C99', b: '#EDF3FC',
    svg: S('<path d="M5.5 3H4.5v5.5a4.5 4.5 0 0 0 9 0V3h-1"/><path d="M9 13v2.5a5 5 0 0 0 10 0V13"/><circle cx="19" cy="10.5" r="2.5"/>') },
  { id: 'cardio', nome: 'Cardiologia', c: '#C62828', b: '#FDECEC',
    svg: S('<path d="M20.4 5.6a5 5 0 0 0-7.1 0L12 6.9l-1.3-1.3a5 5 0 0 0-7.1 7.1L12 21.1l8.4-8.4a5 5 0 0 0 0-7.1z"/><path d="M6.5 12h2.8l1.4-2.6 2.2 4.7 1.4-2.1h3.2"/>') },
  { id: 'pneumo', nome: 'Pneumologia', c: '#1E3A8A', b: '#E8EDF9',
    svg: S('<path d="M12 3.5v8"/><path d="M12 11.5c-.9.6-1.5 1.5-1.5 2.5M12 11.5c.9.6 1.5 1.5 1.5 2.5"/><path d="M8.7 6.5C5.6 6.5 3 10.6 3 16c0 2.6 1.4 4 3.2 4 2.6 0 4.3-1.7 4.3-4.3V8.3a1.8 1.8 0 0 0-1.8-1.8z"/><path d="M15.3 6.5c3.1 0 5.7 4.1 5.7 9.5 0 2.6-1.4 4-3.2 4-2.6 0-4.3-1.7-4.3-4.3V8.3a1.8 1.8 0 0 1 1.8-1.8z"/>') },
  { id: 'nefro', nome: 'Nefrologia', c: '#946200', b: '#FFF5D6',
    svg: S('<path d="M15.5 3c-3 0-5 2.3-5 5.2 0 1.4.8 2.2.8 3.6s-.8 2.3-.8 3.7c0 3 2.1 5 4.6 5 3.7 0 5.9-4.3 5.9-9C21 6.6 19 3 15.5 3z"/><path d="M11.2 12H8.5A3.5 3.5 0 0 0 5 15.5V21"/>') },
  { id: 'hemato', nome: 'Hematologia', c: '#8B1A1A', b: '#F7E5E5',
    svg: S('<path d="M12 2.8S5.5 9.8 5.5 14.3a6.5 6.5 0 0 0 13 0C18.5 9.8 12 2.8 12 2.8z"/><path d="M9 14.8a3 3 0 0 0 3 3"/>') },
  { id: 'gastro', nome: 'Gastroenterologia', c: '#C25A0A', b: '#FFF0E1',
    svg: S('<path d="M8.5 3v3.2c0 1.6 1.3 2.8 2.9 2.8h2.1a5.5 5.5 0 0 1 5.5 5.5v.3a6.2 6.2 0 0 1-6.2 6.2H9.6A5.6 5.6 0 0 1 4 15.4V14"/><path d="M4 14c0-1.7 1.3-3 3-3h1.5"/><path d="M18 9.5 20.5 7"/>') },
  { id: 'infecto', nome: 'Infectologia', c: '#7C1D3B', b: '#F8E6EC',
    svg: S('<circle cx="12" cy="12" r="5"/><path d="M12 7V3.5M12 20.5V17M7 12H3.5M20.5 12H17M8.5 8.5 6 6M18 18l-2.5-2.5M8.5 15.5 6 18M18 6l-2.5 2.5"/><circle cx="10.5" cy="11" r=".6"/><circle cx="13.5" cy="13" r=".6"/>') },
  { id: 'reumato', nome: 'Reumatologia', c: '#6B21A8', b: '#F3E8FD',
    svg: S('<path d="M17.2 9.6c.8.8 2 1 3 .5a2.3 2.3 0 1 0-2.9-2.9 2.3 2.3 0 1 0-2.9-2.9c-.5 1-.3 2.2.5 3L7.1 15.1c-.8-.8-2-1-3-.5a2.3 2.3 0 1 0 2.9 2.9 2.3 2.3 0 1 0 2.9 2.9c.5-1 .3-2.2-.5-3z"/>') },
  { id: 'endocrino', nome: 'Endocrinologia', c: '#0369A1', b: '#E3F2FB',
    svg: S('<path d="M12 6.5v12"/><path d="M12 9.5C11 6.6 8.9 5 7 5 5 5 4.2 7.3 4.2 10.2c0 4.3 2.2 8.3 5.2 8.3 1.6 0 2.6-1 2.6-2.8"/><path d="M12 9.5C13 6.6 15.1 5 17 5c2 0 2.8 2.3 2.8 5.2 0 4.3-2.2 8.3-5.2 8.3-1.6 0-2.6-1-2.6-2.8"/>') },
  { id: 'emergencia', nome: 'Emergências', c: '#D9480F', b: '#FDEAE1',
    svg: S('<path d="M7 18v-5.5a5 5 0 0 1 10 0V18"/><path d="M5 18h14v3H5z"/><path d="M12 2.5v2M4.6 5.6l1.4 1.4M19.4 5.6 18 7M2.5 12.5h2M19.5 12.5h2"/><path d="M12 11v3"/>') },
  { id: 'geriatria', nome: 'Geriatria', c: '#7B5CC4', b: '#F1ECFB',
    svg: S('<circle cx="10.5" cy="4.2" r="2"/><path d="M10.5 7.5c-1.4 0-2.4 1-2.7 2.3L7 14h3l1 7"/><path d="m11.3 14 2.2 7"/><path d="m11.5 9.3 3.3 2.5"/><path d="M16.5 11.5V21"/><path d="M16.5 11.5a1.6 1.6 0 0 1 3.2 0"/>') },
  { id: 'neuro', nome: 'Neurologia', c: '#0F766E', b: '#E1F4F1',
    svg: S('<path d="M12 5.5a3 3 0 0 0-5.6-1.3A3 3 0 0 0 3.5 8a3 3 0 0 0 .3 5 3.5 3.5 0 0 0 4.2 5.2A3 3 0 0 0 12 19.5z"/><path d="M12 5.5a3 3 0 0 1 5.6-1.3A3 3 0 0 1 20.5 8a3 3 0 0 1-.3 5 3.5 3.5 0 0 1-4.2 5.2A3 3 0 0 1 12 19.5z"/><path d="M12 5.5v14"/>') }
];
export const EIXO = Object.fromEntries(EIXOS.map(e => [e.id, e]));
export const eixosValidos = (ids) => (ids && ids.length ? ids.filter(i => EIXO[i]) : ['clinica']);

export function eixoChip(id, { mini = false, ativo = true } = {}) {
  const e = EIXO[id]; if (!e) return '';
  return `<span class="eixo ${mini ? 'eixo-mini' : ''} ${ativo ? '' : 'eixo-off'}" style="--ec:${e.c};--eb:${e.b}" title="${esc(e.nome)}">${e.svg}<span>${esc(e.nome)}</span></span>`;
}
export const eixosChips = (ids, opts) => `<span class="eixos">${eixosValidos(ids).map(i => eixoChip(i, opts)).join('')}</span>`;

export function eixoPicker(nome, selecionados = []) {
  const sel = new Set(selecionados.length ? selecionados : ['clinica']);
  return `<div class="eixo-picker" data-picker="${nome}">${EIXOS.map(e => `
    <label class="eixo-opcao" style="--ec:${e.c};--eb:${e.b}">
      <input type="checkbox" name="${nome}" value="${e.id}" ${sel.has(e.id) ? 'checked' : ''}>
      <span class="eixo">${e.svg}<span>${esc(e.nome)}</span></span>
    </label>`).join('')}</div>`;
}
export function lerEixos(nome) {
  const v = [...document.querySelectorAll(`input[name="${nome}"]:checked`)].map(i => i.value);
  return v.length ? v : ['clinica'];
}

export const CATEGORIAS = {
  'Pesquisa': { cor: '#2b6cb0', icone: 'lupa' },
  'Extensão': { cor: '#c05621', icone: 'extensao' },
  'Artigo': { cor: '#6b46c1', icone: 'artigo' },
  'Resumo': { cor: '#0d9488', icone: 'resumo' },
  'Estágio': { cor: '#b7791f', icone: 'maleta' }
};
export function categoriaBadge(cat) {
  const c = CATEGORIAS[cat] || { cor: '#4a5568', icone: 'pasta' };
  return `<span class="tag-linha" style="--tc:${c.cor}">${ic(c.icone)}${esc(cat)}</span>`;
}
export function getFasesPadrao(tipo) {
  if (tipo === 'Estágio') return ['Inscrições abertas', 'Selecionados', 'Concluído'];
  return ['Inscrições abertas', 'Em seleção', 'Equipe confirmada', 'Em execução', 'Concluído'];
}

export const CARGOS = {
  'Diretor de Extensão': { cor: '#c05621', icone: 'extensao', painel: 'Painel de Extensão', tipos: ['Extensão'] },
  'Diretor de Pesquisa': { cor: '#2b6cb0', icone: 'lupa', painel: 'Painel de Pesquisa', tipos: ['Pesquisa', 'Artigo', 'Resumo'] },
  'Diretor de Ensino': { cor: '#6b46c1', icone: 'livro', painel: 'Painel de Ensino', tipos: [] },
  'Vice-presidente e Secretário': { cor: '#4a5568', icone: 'ata', painel: 'Secretaria', tipos: [] },
  'Diretor Financeiro': { cor: '#b7791f', icone: 'carteira', painel: 'Financeiro', tipos: [] },
  'Diretor de Comunicação': { cor: '#c05621', icone: 'forum', painel: 'Comunicação', tipos: [] },
  'Diretor de Estágios': { cor: '#b7791f', icone: 'maleta', painel: 'Painel de Estágios', tipos: ['Estágio'] }
};
export const LISTA_CARGOS = Object.keys(CARGOS);
export function cargoBadge(cargo) {
  const c = CARGOS[cargo]; if (!c) return '';
  return `<span class="tag-linha" style="--tc:${c.cor}">${ic(c.icone)}${esc(cargo)}</span>`;
}
export const TIPOS_USUARIO = { admin: 'Presidência', usuario: 'Membro', orientador: 'Orientador(a)' };

export const CATEGORIAS_PLAN = {
  'Aula': { icone: 'livro', cor: '#6b46c1', cargos: ['Diretor de Ensino'], destino: 'aula' },
  'Hands-on': { icone: 'caneta', cor: '#0987a0', cargos: ['Diretor de Ensino'], destino: 'aula' },
  'Reunião': { icone: 'reuniao', cor: '#0d9488', cargos: ['Vice-presidente e Secretário'], destino: 'evento' },
  'Pesquisa': { icone: 'lupa', cor: '#2b6cb0', cargos: ['Diretor de Pesquisa'], destino: 'oportunidade', op: 'Pesquisa' },
  'Extensão': { icone: 'extensao', cor: '#c05621', cargos: ['Diretor de Extensão'], destino: 'oportunidade', op: 'Extensão' },
  'Escrita': { icone: 'artigo', cor: '#6b46c1', cargos: ['Diretor de Pesquisa'], destino: 'oportunidade', op: 'Artigo', subtipos: ['Artigo', 'Resumo'] },
  'Estágio': { icone: 'maleta', cor: '#b7791f', cargos: ['Diretor de Estágios'], destino: 'oportunidade', op: 'Estágio' },
  'Evento': { icone: 'estrela', cor: '#AB9748', cargos: ['Diretor de Comunicação', 'Diretor de Ensino'], destino: 'evento' },
  'Outro': { icone: 'pasta', cor: '#4a5568', cargos: LISTA_CARGOS, destino: 'evento' }
};
export const DESTINO_PLAN = { aula: 'Aulas', oportunidade: 'Oportunidades', evento: 'Agenda de todos' };
export const categoriasPlanDe = (u) => Object.keys(CATEGORIAS_PLAN).filter(c => P.admin(u) || (u && CATEGORIAS_PLAN[c].cargos.includes(u.cargo)));
export function planBadge(cat) {
  const c = CATEGORIAS_PLAN[cat] || CATEGORIAS_PLAN.Outro;
  return `<span class="tag-linha" style="--tc:${c.cor}">${ic(c.icone)}${esc(cat)}</span>`;
}

export const P = {
  admin: (u) => !!u && u.tipo === 'admin',
  orientador: (u) => !!u && u.tipo === 'orientador',
  diretor: (u) => !!u && (u.tipo === 'admin' || !!u.cargo),
  vice: (u) => !!u && u.cargo === 'Vice-presidente e Secretário',
  forum: (u) => P.diretor(u),
  aulas: (u) => P.admin(u) || (u && u.cargo === 'Diretor de Ensino'),
  financeiro: (u) => P.admin(u) || (u && u.cargo === 'Diretor Financeiro'),
  atas: (u) => P.admin(u) || P.vice(u),
  verAtas: (u) => P.diretor(u),
  tipos: (u) => P.admin(u) ? Object.keys(CATEGORIAS) : ((u && CARGOS[u.cargo]) ? CARGOS[u.cargo].tipos : []),
  oportunidade: (u, tipo) => P.tipos(u).includes(tipo),
  usuarios: (u) => P.admin(u),
  planejar: (u) => P.diretor(u),
  documentos: (u) => P.admin(u) || P.vice(u),
  certificados: (u) => P.admin(u),
  emitirCert: (u) => P.diretor(u)
};

export const PAPEIS_PROJETO = { 'Pesquisador': '#11998e', 'Coletador': '#11998e', 'Orientador': '#e65c00', 'Estatístico': '#8E2DE2', 'Coordenador': '#163A5C' };

export const PREFS_NOTIF = [
  { id: 'oportunidades', nome: 'Novas oportunidades', desc: 'Editais de pesquisa, extensão e estágios.' },
  { id: 'estagioAmanha', nome: 'Lembrete de estágio', desc: 'Na véspera de um estágio em que você foi confirmado(a).' },
  { id: 'eixos', nome: 'Eixos que sigo', desc: 'Qualquer novidade da liga nos eixos marcados abaixo.' },
  { id: 'casoSemana', nome: 'Caso clínico da semana', desc: 'Quando um novo desafio for publicado.' },
  { id: 'forum', nome: 'Fórum', desc: 'Novas publicações e enquetes.' },
  { id: 'reunioes', nome: 'Reuniões', desc: 'Quando uma reunião for marcada e na véspera dela.' },
  { id: 'mencoes', nome: 'Menções e tarefas', desc: 'Quando citarem você (@) ou atribuírem uma tarefa.' },
  { id: 'aulas', nome: 'Aulas', desc: 'Novas aulas e lembrete na véspera das que você acompanha.' },
  { id: 'certificados', nome: 'Certificados', desc: 'Andamento das assinaturas e emissão.' }
];
export const prefsPadrao = () => Object.fromEntries(PREFS_NOTIF.map(p => [p.id, true]));
