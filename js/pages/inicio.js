// ============================================================================
// INÍCIO — resumo do dia: próximos compromissos, caso da semana, tarefas,
// oportunidades abertas e novidades do fórum
// ============================================================================
import { S, nomeDe, meusProjetos } from '../store.js';
import { P, eixosChips } from '../dominio.js';
import { ic, esc, avatar, tempoRelativo, hojeISO, somarDias, dataExtensa, isoParaBR, textoPuro } from '../util.js';
import { vazio } from '../ui.js';
import { compromissos } from './agenda.js';

function saudacao() { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : (h < 18 ? 'Boa tarde' : 'Boa noite'); }

function render() {
  const eu = S.eu, hoje = hojeISO();
  const prox = compromissos(hoje, somarDias(hoje, 7)).slice(0, 6);
  const caso = S.forum.find(p => p.tipo === 'caso' && p.casoDaSemana);
  const tarefas = meusProjetos().flatMap(p => (p.tarefas || []).filter(t => !t.concluida && (t.resp || []).includes(S.uid)).map(t => ({ ...t, p }))).sort((a, b) => (a.prazo || '9').localeCompare(b.prazo || '9')).slice(0, 5);
  const abertas = Object.values(S.oportunidades).filter(o => o.faseAtual === 0 && !(o.inscritos || []).includes(S.uid)).sort((a, b) => b.criadoEm - a.criadoEm).slice(0, 4);
  const forum = S.forum.filter(p => p.id !== caso?.id).slice(0, 4);
  const assinar = S.certificados.filter(c => (c.status === 'pendente_presidencia' && P.admin(eu)) || (c.status === 'pendente_orientador' && c.signerUid === S.uid)).length;

  return `<div class="inicio-cab"><div><p class="mudo">${saudacao()},</p><h2>${esc(eu.nome.split(' ')[0])}</h2></div>${eixosChips(eu.eixosSeguidos, { mini: true })}</div>
    ${assinar ? `<a class="aviso link-aviso" href="#/certificados/assinar">${ic('caneta')}<div><b>${assinar} certificado(s) aguardando sua assinatura.</b> Toque para assinar.</div>${ic('dir')}</a>` : ''}
    <div class="painel-inicio">
      <section class="bloco"><div class="bloco-cab"><h4>${ic('calendario')} Próximos 7 dias</h4><a href="#/agenda" class="link">Agenda ${ic('dir')}</a></div>
        ${prox.length ? prox.map(c => `<a class="prox" href="${c.url || '#/agenda'}" style="--c:${c.cor}"><span class="prox-data"><b>${c.data === hoje ? 'Hoje' : (c.data === somarDias(hoje, 1) ? 'Amanhã' : dataExtensa(c.data).split(',')[0])}</b><small>${esc(c.hora || 'dia todo')}</small></span><span class="prox-txt"><strong>${esc(c.titulo)}</strong><small>${esc(c.tipo)}${c.local ? ' · ' + esc(c.local) : ''}</small></span></a>`).join('') : vazio('Semana livre por enquanto.', 'calendario')}
      </section>
      ${caso ? `<a class="bloco bloco-caso" href="#/forum/${caso.id}"><small>${ic('estrela')} Caso clínico da semana</small><h3>${esc(caso.titulo)}</h3>${eixosChips(caso.eixos, { mini: true })}<p>${esc(textoPuro(caso.caso?.pergunta || '').slice(0, 140))}</p><span class="btn btn-pri">${ic('lampada')}Resolver o desafio</span></a>` : ''}
      <section class="bloco"><div class="bloco-cab"><h4>${ic('tarefa')} Minhas tarefas</h4></div>
        ${tarefas.length ? tarefas.map(t => `<a class="linha-item" href="#/projetos/${t.p.id}/tarefas">${ic('tarefa')}<div class="li-txt"><strong>${esc(t.titulo)}</strong><small>${esc(t.p.titulo)}${t.prazo ? ` · <span class="${t.prazo < hoje ? 'txt-perigo' : ''}">${isoParaBR(t.prazo)}</span>` : ''}</small></div></a>`).join('') : vazio('Nenhuma tarefa pendente.', 'concluido')}
      </section>
      <section class="bloco"><div class="bloco-cab"><h4>${ic('maleta')} Inscrições abertas</h4><a href="#/oportunidades" class="link">Ver todas ${ic('dir')}</a></div>
        ${abertas.length ? abertas.map(o => `<a class="linha-item" href="#/oportunidades">${ic(o.tipo === 'Estágio' ? 'maleta' : 'lupa')}<div class="li-txt"><strong>${esc(o.titulo)}</strong><small>${esc(o.tipo)}${o.data ? ' · ' + isoParaBR(o.data) : ''} · ${o.vagas} vaga(s)</small></div></a>`).join('') : vazio('Você já viu todas as oportunidades abertas.', 'maleta')}
      </section>
      <section class="bloco bloco-largo"><div class="bloco-cab"><h4>${ic('forum')} No fórum</h4><a href="#/forum" class="link">Abrir ${ic('dir')}</a></div>
        ${forum.length ? forum.map(p => `<a class="linha-item" href="#/forum/${p.id}">${avatar(S.usuarios[p.autor], 28)}<div class="li-txt"><strong>${esc(p.titulo)}</strong><small>${esc(nomeDe(p.autor))} · ${tempoRelativo(p.criadoEm)}${p.enquete ? ' · enquete' : ''} · ${p.nComentarios || 0} comentário(s)</small></div></a>`).join('') : vazio('Nada publicado ainda.', 'forum')}
      </section>
    </div>`;
}

export default { titulo: 'Início', render };
