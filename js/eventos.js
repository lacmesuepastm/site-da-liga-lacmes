import { Data } from './data.js';
import { S } from './store.js';
import { P } from './dominio.js';
import { esc, acao, abrirModal, fecharModal, confirmar, toast, val, isoParaBR, hojeISO, horasEntre } from './util.js';
import { btn, campo, linhaCampos } from './ui.js';
import { notificar } from './notificar.js';

export const DESTINOS = {
  aula: { colecao: 'aulas', pref: 'aulas', url: '#/aulas', rotulo: 'aula', campos: { titulo: 'titulo', data: 'data', hora: 'hora', horaFim: null, local: 'local', resp: 'professor' } },
  oportunidade: { colecao: 'oportunidades', pref: 'oportunidades', url: '#/inscricoes', rotulo: 'oportunidade', campos: { titulo: 'titulo', data: 'data', hora: 'horaInicio', horaFim: 'horaFim', local: 'local', resp: 'orientador' } },
  evento: { colecao: 'eventosLiga', pref: 'reunioes', url: '#/agenda', rotulo: 'evento', campos: { titulo: 'titulo', data: 'data', hora: 'hora', horaFim: 'horaFim', local: 'local', resp: 'docente' } }
};
const ROTULOS = { titulo: 'título', data: 'data', hora: 'horário', horaFim: 'término', local: 'local', resp: 'responsável' };

export function lerPublicado(dest, id) {
  if (dest === 'aula') return S.aulas.find(a => a.id === id) || null;
  if (dest === 'oportunidade') return S.oportunidades[id] || null;
  return S.eventosLiga.find(e => e.id === id) || null;
}

export function podeGerirPublicado(dest, doc) {
  if (!doc) return false;
  if (dest === 'aula') return P.aulas(S.eu);
  if (dest === 'oportunidade') return P.oportunidade(S.eu, doc.tipo);
  return P.admin(S.eu) || (P.diretor(S.eu) && doc.criadoPor === S.uid);
}

function audiencia(dest, doc) {
  const pref = DESTINOS[dest].pref;
  if (dest === 'aula') return { pref, uids: doc.seguidores || [] };
  if (dest === 'oportunidade') return { pref, uids: [...new Set([...(doc.inscritos || []), ...(doc.confirmados || [])])] };
  return (doc.participantes || []).length ? { pref, uids: doc.participantes } : { pref, todos: true, eixos: doc.eixos };
}

const formatar = (campo, v) => (campo === 'data' ? isoParaBR(v) : (v || '—'));

export function mudancasEntre(dest, antigo, novo) {
  const lista = [];
  Object.entries(DESTINOS[dest].campos).forEach(([chave, real]) => {
    if (!real || !(real in novo)) return;
    if ((antigo[real] || '') !== (novo[real] || '')) lista.push(`${ROTULOS[chave]}: ${formatar(chave, antigo[real])} → ${formatar(chave, novo[real])}`);
  });
  return lista;
}

const jaPassou = (doc) => doc.data && doc.data < hojeISO();

export async function avisarAlteracao(dest, doc, mudancas, motivo = '') {
  if (!mudancas.length || doc.cancelada || jaPassou(doc)) return;
  await notificar({ tipo: 'alteracao', titulo: `Alterado: ${doc.titulo}`, corpo: mudancas.join(' · ') + (motivo ? ` — ${motivo}` : ''), url: DESTINOS[dest].url, ...audiencia(dest, doc) });
}

async function avisarCancelamento(dest, doc, motivo) {
  await notificar({ tipo: 'cancelamento', titulo: `Cancelado: ${doc.titulo}`, corpo: motivo || 'Este compromisso foi cancelado.', url: DESTINOS[dest].url, ...audiencia(dest, doc) });
}

async function avisarRetomada(dest, doc) {
  await notificar({ tipo: 'retomada', titulo: `Retomado: ${doc.titulo}`, corpo: 'O compromisso voltou a acontecer.', url: DESTINOS[dest].url, ...audiencia(dest, doc) });
}

async function sincronizarPlano(doc, dados) {
  const plano = doc.planejamentoId && S.planejamento.find(p => p.id === doc.planejamentoId);
  if (plano) await Data.update(`planejamento/${plano.id}`, dados).catch(() => { });
}

function formAlterar(dest, doc) {
  const c = DESTINOS[dest].campos;
  const horas = c.horaFim ? linhaCampos(campo('Início', `<input type="time" id="al-hora" value="${esc(doc[c.hora] || '')}">`), campo('Término', `<input type="time" id="al-fim" value="${esc(doc[c.horaFim] || '')}">`)) : campo('Horário', `<input type="time" id="al-hora" value="${esc(doc[c.hora] || '')}">`);
  return `${campo('Título', `<input id="al-titulo" value="${esc(doc[c.titulo] || '')}">`)}
    ${campo('Data', `<input type="date" id="al-data" value="${esc(doc[c.data] || '')}">`)}${horas}
    ${campo('Local', `<input id="al-local" value="${esc(doc[c.local] || '')}">`)}
    ${campo('Responsável / docente', `<input id="al-resp" value="${esc(doc[c.resp] || '')}">`)}
    ${campo('Motivo da alteração (vai na notificação)', '<input id="al-motivo" placeholder="Ex.: mudança de sala">')}
    <p class="dica">Quem acompanha este compromisso será avisado do que mudou.</p>`;
}

acao('alterarPublicado', ({ dest, id }) => {
  const doc = lerPublicado(dest, id); if (!doc) { toast('Publicação não encontrada.', 'erro'); return; }
  abrirModal({ titulo: 'Alterar compromisso', largura: 520, corpo: formAlterar(dest, doc) + `<div class="acoes-form">${btn('Voltar', 'fecharModal')}${btn('Salvar e avisar', 'salvarAlteracao', { classe: 'btn-pri', icone: 'sino', dados: { dest, id } })}</div>` });
});

acao('salvarAlteracao', async ({ dest, id }, botao) => {
  const doc = lerPublicado(dest, id); if (!doc) return;
  const c = DESTINOS[dest].campos;
  if (!val('al-titulo') || !val('al-data')) { toast('Informe título e data.', 'erro'); return; }
  const novo = { [c.titulo]: val('al-titulo'), [c.data]: val('al-data'), [c.hora]: val('al-hora'), [c.local]: val('al-local'), [c.resp]: val('al-resp') };
  if (c.horaFim) novo[c.horaFim] = val('al-fim');
  if (dest === 'oportunidade' && doc.tipo === 'Estágio') novo.cargaHoraria = horasEntre(novo.horaInicio, novo.horaFim);
  const mudancas = mudancasEntre(dest, doc, novo);
  if (!mudancas.length) { toast('Nada foi alterado.', 'info'); return; }
  botao.disabled = true;
  try {
    await Data.update(`${DESTINOS[dest].colecao}/${id}`, { ...novo, alteradoEm: Date.now() });
    await sincronizarPlano(doc, { titulo: novo[c.titulo], data: novo[c.data], hora: novo[c.hora], horaFim: c.horaFim ? novo[c.horaFim] : (doc.horaFim || ''), local: novo[c.local], docente: novo[c.resp] });
    await avisarAlteracao(dest, doc, mudancas, val('al-motivo'));
    fecharModal(); toast('Alterado. Quem acompanha foi avisado.', 'ok');
  } catch (e) { toast('Não foi possível alterar: ' + (e.code || e.message), 'erro'); botao.disabled = false; }
});

acao('cancelarPublicado', ({ dest, id }) => {
  const doc = lerPublicado(dest, id); if (!doc) return;
  abrirModal({ titulo: 'Cancelar compromisso', largura: 460, corpo: `<p><b>${esc(doc.titulo)}</b></p>
    ${campo('Motivo (vai na notificação)', '<textarea id="ca-motivo" rows="2" placeholder="Ex.: professor indisponível"></textarea>')}
    <p class="dica">O compromisso sai da agenda de todos e quem acompanha é avisado. Você pode reativá-lo depois.</p>
    <div class="acoes-form">${btn('Voltar', 'fecharModal')}${btn('Cancelar compromisso', 'confirmarCancelamento', { classe: 'btn-perigo', dados: { dest, id } })}</div>` });
});

acao('confirmarCancelamento', async ({ dest, id }, botao) => {
  const doc = lerPublicado(dest, id); if (!doc) return;
  const motivo = val('ca-motivo');
  botao.disabled = true;
  try {
    await Data.update(`${DESTINOS[dest].colecao}/${id}`, { cancelada: true, motivoCancelamento: motivo, canceladaEm: Date.now() });
    await sincronizarPlano(doc, { cancelada: true });
    await avisarCancelamento(dest, doc, motivo);
    fecharModal(); toast('Cancelado. Quem acompanha foi avisado.', 'ok');
  } catch (e) { toast('Não foi possível cancelar: ' + (e.code || e.message), 'erro'); botao.disabled = false; }
});

acao('reativarPublicado', async ({ dest, id }) => {
  const doc = lerPublicado(dest, id); if (!doc) return;
  if (!(await confirmar(`Reativar "${doc.titulo}" e avisar quem acompanha?`, { ok: 'Reativar' }))) return;
  await Data.update(`${DESTINOS[dest].colecao}/${id}`, { cancelada: false, motivoCancelamento: '' });
  await sincronizarPlano(doc, { cancelada: false });
  await avisarRetomada(dest, doc);
  toast('Reativado. Quem acompanha foi avisado.', 'ok');
});

export const botoesGestao = (dest, id, cancelada, classe = 'btn-peq') => cancelada
  ? btn('Reativar', 'reativarPublicado', { classe, icone: 'check', dados: { dest, id } })
  : btn('Alterar', 'alterarPublicado', { classe, icone: 'lapis', dados: { dest, id } }) + btn('Cancelar', 'cancelarPublicado', { classe: classe + ' btn-perigo-txt', icone: 'x', dados: { dest, id } });
