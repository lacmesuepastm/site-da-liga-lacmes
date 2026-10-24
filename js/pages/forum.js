// ============================================================================
// FÓRUM — publicações, enquetes e CASOS CLÍNICOS (desafios semanais)
// ============================================================================
import { Data, F } from '../data.js';
import { S, tela, ouvirTela, nomeDe, usuariosAtivos } from '../store.js';
import { P, eixosChips, eixoPicker, lerEixos, EIXOS, EIXO } from '../dominio.js';
import { ic, esc, sanitizar, textoPuro, acao, avatar, tempoRelativo, abrirModal, fecharModal, confirmar, toast, val, novoId } from '../util.js';
import { cabecalho, vazio, colapsavel, btn, btnIc, chk, campo, ui } from '../ui.js';
import { editorHTML, lerEditor, ativarMencoes, mencionados } from '../editor.js';
import { notificar } from '../notificar.js';

const filtro = { tipo: 'todos', eixo: null, busca: '' };
const podeEditar = (p) => P.admin(S.eu) || p.autor === S.uid;

// --------------------------------------------------------- LISTAGEM ----
function cardPost(p) {
  const caso = p.tipo === 'caso';
  const resumo = textoPuro(caso ? (p.caso?.anamnese?.[0]?.html || '') + ' ' + (p.caso?.pergunta || '') : p.html).slice(0, 190);
  const u = S.usuarios[p.autor];
  return `<a class="card card-post ${p.fixado ? 'fixado' : ''}" href="#/forum/${p.id}">
    <div class="cp-topo">
      <span class="tag-linha" style="--tc:${caso ? '#0d9488' : 'var(--accent)'}">${ic(caso ? 'caso' : 'forum')}${caso ? 'Caso clínico' : 'Publicação'}</span>
      ${p.enquete ? `<span class="tag-linha" style="--tc:#6b46c1">${ic('enquete')}Enquete</span>` : ''}
      ${p.casoDaSemana ? `<span class="tag-linha" style="--tc:var(--gold)">${ic('estrela')}Caso da semana</span>` : ''}
      ${p.fixado ? `<span class="cp-fixado" title="Fixado">${ic('pin')}</span>` : ''}
    </div>
    <h3>${esc(p.titulo)}</h3>
    ${resumo ? `<p class="cp-resumo">${esc(resumo)}${resumo.length >= 190 ? '…' : ''}</p>` : ''}
    ${eixosChips(p.eixos, { mini: true })}
    <div class="cp-rodape">${avatar(u, 22)}<span>${esc(nomeDe(p.autor))}</span><span class="mudo">· ${tempoRelativo(p.criadoEm)}</span>
      <span class="cp-cont">${ic('comentario')}${p.nComentarios || 0}</span></div>
  </a>`;
}

function renderLista() {
  const eu = S.eu;
  let lista = S.forum.slice();
  if (filtro.tipo === 'post') lista = lista.filter(p => p.tipo !== 'caso');
  if (filtro.tipo === 'caso') lista = lista.filter(p => p.tipo === 'caso');
  if (filtro.tipo === 'enquete') lista = lista.filter(p => p.enquete);
  if (filtro.eixo) lista = lista.filter(p => (p.eixos || ['clinica']).includes(filtro.eixo));
  if (filtro.busca) { const q = filtro.busca.toLowerCase(); lista = lista.filter(p => (p.titulo + ' ' + textoPuro(p.html || '')).toLowerCase().includes(q)); }
  lista.sort((a, b) => (b.fixado ? 1 : 0) - (a.fixado ? 1 : 0) || (b.criadoEm || 0) - (a.criadoEm || 0));
  const destaque = S.forum.find(p => p.tipo === 'caso' && p.casoDaSemana);

  const acoes = P.forum(eu) ? btn('Publicação', 'novoPost', { icone: 'mais', dados: { tipo: 'post' } }) + btn('Caso clínico', 'novoPost', { icone: 'caso', classe: 'btn-pri', dados: { tipo: 'caso' } }) : '';
  const tipos = [['todos', 'Tudo'], ['post', 'Publicações'], ['caso', 'Casos clínicos'], ['enquete', 'Enquetes']];
  return `${cabecalho('Fórum', 'Avisos, discussões, enquetes e casos clínicos da liga.', acoes)}
    ${destaque && filtro.tipo !== 'post' ? `<a class="destaque-caso" href="#/forum/${destaque.id}">
      <span class="dc-icone">${ic('caso')}</span>
      <span class="dc-txt"><small>${ic('estrela')} Caso clínico da semana</small><strong>${esc(destaque.titulo)}</strong>${eixosChips(destaque.eixos, { mini: true })}</span>
      <span class="dc-seta">${ic('dir')}</span></a>` : ''}
    <div class="filtros">
      <div class="seg">${tipos.map(([id, n]) => `<button class="seg-btn ${filtro.tipo === id ? 'ativo' : ''}" data-action="forumTipo" data-tipo="${id}">${n}</button>`).join('')}</div>
      <span class="campo-busca">${ic('busca')}<input type="search" id="forum-busca" placeholder="Buscar no fórum…" value="${esc(filtro.busca)}" data-input="forumBusca"></span>
    </div>
    <div class="filtro-eixos">${EIXOS.map(e => `<button class="eixo-filtro ${filtro.eixo === e.id ? 'ativo' : ''}" style="--ec:${e.c};--eb:${e.b}" data-action="forumEixo" data-eixo="${e.id}" title="${esc(e.nome)}">${e.svg}<span>${esc(e.nome)}</span></button>`).join('')}</div>
    <div class="lista-cards">${lista.length ? lista.map((p, i) => cardPost(p).replace('class="card ', `style="--i:${Math.min(i, 12)}" class="card `)).join('') : vazio('Nada publicado com esses filtros.', 'forum')}</div>`;
}
acao('forumTipo', ({ tipo }) => { filtro.tipo = tipo; location.hash = '#/forum'; window.dispatchEvent(new Event('lacmes-render')); });
acao('forumEixo', ({ eixo }) => { filtro.eixo = filtro.eixo === eixo ? null : eixo; window.dispatchEvent(new Event('lacmes-render')); });
let tBusca; acao('forumBusca', (d, el) => { clearTimeout(tBusca); tBusca = setTimeout(() => { filtro.busca = el.value; window.dispatchEvent(new Event('lacmes-render')); }, 250); });

// ------------------------------------------------------------ EXAMES ----
const num = (s) => { if (s == null) return NaN; const t = String(s).trim().replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'); return parseFloat(t); };
function foraDaReferencia(valor, ref) {
  const v = num(valor); if (isNaN(v) || !ref) return '';
  const r = String(ref).replace(/\s/g, '');
  let m = r.match(/^(-?[\d.,]+)[-–a](-?[\d.,]+)$/);
  if (m) { const a = num(m[1]), b = num(m[2]); if (v < a) return 'baixo'; if (v > b) return 'alto'; return ''; }
  m = r.match(/^(<|≤|<=)([\d.,]+)$/); if (m) return v > num(m[2]) || (m[1] === '<' && v === num(m[2])) ? 'alto' : '';
  m = r.match(/^(>|≥|>=)([\d.,]+)$/); if (m) return v < num(m[2]) || (m[1] === '>' && v === num(m[2])) ? 'baixo' : '';
  return '';
}
function tabelaExame(g) {
  const linhas = (g.parametros || []).map(p => {
    const flag = g.mostrarRef !== false ? foraDaReferencia(p.valor, p.ref) : '';
    return `<tr class="${flag ? 'fora-' + flag : ''}"><td>${esc(p.nome)}</td>
      <td class="ex-valor">${esc(p.valor)}${flag ? `<span class="ex-flag">${flag === 'alto' ? '↑' : '↓'}</span>` : ''}</td>
      <td class="mudo">${esc(p.unidade || '')}</td>${g.mostrarRef !== false ? `<td class="mudo">${esc(p.ref || '—')}</td>` : ''}</tr>`;
  }).join('');
  return `<div class="tabela-rolagem"><table class="tabela-exame"><thead><tr><th>Parâmetro</th><th>Resultado</th><th>Unidade</th>${g.mostrarRef !== false ? '<th>Referência</th>' : ''}</tr></thead><tbody>${linhas}</tbody></table></div>`;
}

// ---------------------------------------------------------- ENQUETE ----
function renderEnquete(p) {
  const e = p.enquete; if (!e) return '';
  const votos = (tela.votos && tela.votos[p.id]) || [];
  const meu = votos.find(v => v.id === S.uid);
  const total = votos.length;
  const mostrar = !!meu || e.encerrada || podeEditar(p);
  const opcoes = e.opcoes.map((o, i) => {
    const qtd = votos.filter(v => (v.opcoes || []).includes(i)).length;
    const pct = total ? Math.round(qtd / total * 100) : 0;
    const escolhida = meu && (meu.opcoes || []).includes(i);
    const quem = !e.anonima && mostrar ? votos.filter(v => (v.opcoes || []).includes(i)).slice(0, 6).map(v => avatar(S.usuarios[v.id], 18)).join('') : '';
    return `<button class="enq-opcao ${escolhida ? 'escolhida' : ''} ${mostrar ? 'com-result' : ''}" ${e.encerrada ? 'disabled' : ''} data-action="votar" data-post="${p.id}" data-i="${i}">
      <span class="enq-barra" style="width:${mostrar ? pct : 0}%"></span>
      <span class="enq-marca">${e.multipla ? `<span class="quad">${escolhida ? ic('check') : ''}</span>` : `<span class="bola">${escolhida ? '<i></i>' : ''}</span>`}</span>
      <span class="enq-txt">${esc(o)}</span>
      ${mostrar ? `<span class="enq-quem">${quem}</span><span class="enq-pct">${pct}%</span>` : ''}
    </button>`;
  }).join('');
  return `<div class="enquete">
    <div class="enq-cab">${ic('enquete')}<strong>${esc(e.pergunta)}</strong></div>
    <div class="enq-opcoes">${opcoes}</div>
    <div class="enq-rodape mudo">${total} voto${total === 1 ? '' : 's'}${e.multipla ? ' · múltipla escolha' : ''}${e.anonima ? ' · anônima' : ''}${e.encerrada ? ' · <b>encerrada</b>' : (meu ? ' · você pode mudar seu voto' : '')}
      ${podeEditar(p) ? `<button class="link" data-action="encerrarEnquete" data-post="${p.id}">${e.encerrada ? 'Reabrir' : 'Encerrar enquete'}</button>` : ''}</div>
  </div>`;
}
acao('votar', async ({ post, i }) => {
  const p = S.forum.find(x => x.id === post); if (!p || p.enquete.encerrada) return;
  const idx = Number(i);
  const meu = ((tela.votos && tela.votos[post]) || []).find(v => v.id === S.uid);
  let opcoes = meu ? (meu.opcoes || []).slice() : [];
  if (p.enquete.multipla) opcoes = opcoes.includes(idx) ? opcoes.filter(x => x !== idx) : [...opcoes, idx];
  else opcoes = (opcoes.length === 1 && opcoes[0] === idx) ? [] : [idx];
  if (opcoes.length) await Data.set(`forum/${post}/votos/${S.uid}`, { opcoes, em: Date.now() });
  else await Data.del(`forum/${post}/votos/${S.uid}`);
});
acao('encerrarEnquete', ({ post }) => { const p = S.forum.find(x => x.id === post); Data.update(`forum/${post}`, { 'enquete.encerrada': !p.enquete.encerrada }); });

// ------------------------------------------------------- COMENTÁRIOS ----
function comentarioHTML(c, p, filhos) {
  const u = S.usuarios[c.autor];
  const curtiu = (c.curtidas || []).includes(S.uid);
  const meu = c.autor === S.uid || P.admin(S.eu);
  return `<div class="coment" id="c-${c.id}">
    ${avatar(u, 32)}
    <div class="coment-corpo">
      <div class="coment-cab"><strong>${esc(nomeDe(c.autor))}</strong>${c.autor === p.autor ? '<span class="tag-autor">autor</span>' : ''}<span class="mudo">${tempoRelativo(c.criadoEm)}</span></div>
      <div class="rich">${sanitizar(c.html)}</div>
      <div class="coment-acoes">
        <button class="link-ic ${curtiu ? 'curtido' : ''}" data-action="curtir" data-post="${p.id}" data-c="${c.id}">${ic('coracao')}${(c.curtidas || []).length || ''}</button>
        ${!c.pai ? `<button class="link-ic" data-action="responder" data-c="${c.id}">${ic('responder')}Responder</button>` : ''}
        ${meu ? `<button class="link-ic" data-action="apagarComent" data-post="${p.id}" data-c="${c.id}">${ic('lixeira')}</button>` : ''}
      </div>
      ${filhos ? `<div class="coment-filhos">${filhos}</div>` : ''}
      ${!c.pai && ui.respondendo === c.id ? `<div class="coment-resp">${compositor(`resp-${c.id}`, 'Escreva uma resposta…')}<div class="acoes-linha"><button class="btn" data-action="responder" data-c="">Cancelar</button><button class="btn btn-pri" data-action="comentar" data-post="${p.id}" data-pai="${c.id}">${ic('enviar')}Responder</button></div></div>` : ''}
    </div></div>`;
}
const compositor = (id, ph) => `<div class="compositor rich" id="${id}" contenteditable="true" data-placeholder="${esc(ph)}"></div>`;
function renderComentarios(p) {
  const todos = ((tela.comentarios && tela.comentarios[p.id]) || []).slice().sort((a, b) => a.criadoEm - b.criadoEm);
  const jaComentei = todos.some(c => c.autor === S.uid);
  const bloqueado = p.ocultarAteComentar && !jaComentei && !podeEditar(p);
  const raiz = todos.filter(c => !c.pai);
  const lista = raiz.map(c => comentarioHTML(c, p, todos.filter(f => f.pai === c.id).map(f => comentarioHTML(f, p)).join(''))).join('');
  return `<section class="comentarios">
    <h4>${ic('comentario')} ${todos.length} comentário${todos.length === 1 ? '' : 's'}</h4>
    <div class="coment-novo">${avatar(S.eu, 32)}<div style="flex:1">${editorHTML('novo-coment', { placeholder: p.tipo === 'caso' ? 'Escreva sua resposta ao desafio… (use @ para citar alguém)' : 'Comente… (use @ para citar alguém)', compacto: true, altura: 70 })}
      <div class="acoes-linha"><button class="btn btn-pri" data-action="comentar" data-post="${p.id}">${ic('enviar')}Comentar</button></div></div></div>
    ${bloqueado && raiz.length ? `<div class="bloqueio">${ic('cadeado')}<p><b>${raiz.length} resposta${raiz.length > 1 ? 's' : ''} oculta${raiz.length > 1 ? 's' : ''}.</b> Envie a sua para ver como os colegas resolveram o caso.</p></div>` : lista}
  </section>`;
}
acao('responder', ({ c }) => { ui.respondendo = c || null; window.dispatchEvent(new Event('lacmes-render')); setTimeout(() => document.getElementById('resp-' + c)?.focus(), 50); });
acao('comentar', async ({ post, pai }) => {
  const id = pai ? `resp-${pai}` : 'novo-coment';
  const el = document.getElementById(id);
  const html = pai ? sanitizar(el.innerHTML) : lerEditor(id);
  if (!textoPuro(html).trim() && !/<img/.test(html)) return;
  const p = S.forum.find(x => x.id === post);
  await Data.add(`forum/${post}/comentarios`, { autor: S.uid, html, criadoEm: Date.now(), curtidas: [], pai: pai || null });
  Data.update(`forum/${post}`, { nComentarios: F.increment(1), ultimoComentario: Date.now() }).catch(() => { });
  el.innerHTML = ''; ui.respondendo = null;
  const citados = mencionados(html);
  const nome = S.eu.nome.split(' ')[0];
  if (citados.length) notificar({ tipo: 'mencao', pref: 'mencoes', uids: citados, titulo: `${nome} citou você no fórum`, corpo: p.titulo, url: `#/forum/${post}` });
  const alvo = pai ? ((tela.comentarios[post] || []).find(c => c.id === pai) || {}).autor : p.autor;
  if (alvo && !citados.includes(alvo)) notificar({ tipo: 'forum', pref: 'forum', uids: [alvo], titulo: pai ? `${nome} respondeu seu comentário` : `${nome} comentou em "${p.titulo}"`, corpo: textoPuro(html).slice(0, 90), url: `#/forum/${post}` });
});
acao('curtir', ({ post, c }) => {
  const com = (tela.comentarios[post] || []).find(x => x.id === c); if (!com) return;
  Data.update(`forum/${post}/comentarios/${c}`, { curtidas: (com.curtidas || []).includes(S.uid) ? F.arrayRemove(S.uid) : F.arrayUnion(S.uid) });
});
acao('apagarComent', async ({ post, c }) => {
  if (!(await confirmar('Apagar este comentário?', { ok: 'Apagar', perigo: true }))) return;
  await Data.del(`forum/${post}/comentarios/${c}`);
  Data.update(`forum/${post}`, { nComentarios: F.increment(-1) }).catch(() => { });
});

// ----------------------------------------------------------- DETALHE ----
function renderDetalhe(id) {
  const p = S.forum.find(x => x.id === id);
  if (!p) return `${voltar()}${vazio('Publicação não encontrada ou removida.', 'forum')}`;
  const caso = p.tipo === 'caso';
  const u = S.usuarios[p.autor];
  const menu = podeEditar(p) ? `<div class="pg-acoes">
      ${btnIc('pin', 'fixarPost', { post: p.id }, p.fixado ? 'Desafixar' : 'Fixar no topo', p.fixado ? 'ativo' : '')}
      ${caso ? btnIc('estrela', 'casoSemana', { post: p.id }, p.casoDaSemana ? 'Tirar de caso da semana' : 'Marcar como caso da semana', p.casoDaSemana ? 'ativo' : '') : ''}
      ${btnIc('lapis', 'editarPost', { post: p.id }, 'Editar')}${btnIc('lixeira', 'apagarPost', { post: p.id }, 'Excluir')}</div>` : '';
  let corpo = '';
  if (caso) {
    const c = p.caso || {};
    const secoes = (lista, grupo) => (lista || []).map((s, i) => colapsavel(`${p.id}-${grupo}-${i}`, esc(s.titulo), `<div class="rich">${sanitizar(s.html)}</div>`, { padrao: s.aberto !== false })).join('');
    corpo = `
      ${c.anamnese?.length ? `<h4 class="sec-titulo">${ic('usuario')} Anamnese</h4>${secoes(c.anamnese, 'an')}` : ''}
      ${c.exameFisico?.length ? `<h4 class="sec-titulo">${ic('olho')} Exame físico</h4>${secoes(c.exameFisico, 'ef')}` : ''}
      ${c.exames?.length ? `<h4 class="sec-titulo">${ic('lupa')} Exames complementares</h4>${c.exames.map((g, i) => colapsavel(`${p.id}-ex-${i}`, esc(g.titulo), tabelaExame(g), { padrao: g.aberto !== false, extra: `<span class="mudo pequeno">${(g.parametros || []).length} parâmetro(s)</span>` })).join('')}` : ''}
      ${c.pergunta ? `<div class="desafio">${ic('lampada')}<div class="rich">${sanitizar(c.pergunta)}</div></div>` : ''}
      ${c.resolucao ? (c.resolucaoVisivel || podeEditar(p) ? colapsavel(`${p.id}-res`, `Resolução comentada${!c.resolucaoVisivel ? ' <span class="mudo pequeno">(visível só para você até revelar)</span>' : ''}`, `<div class="rich">${sanitizar(c.resolucao)}</div>`, { padrao: false, icone: 'concluido' }) : `<div class="bloqueio">${ic('cadeado')}<p>A resolução comentada será revelada pelo autor depois das respostas.</p></div>`) : ''}
      ${c.resolucao && podeEditar(p) ? `<div class="acoes-linha esq">${btn(c.resolucaoVisivel ? 'Ocultar resolução' : 'Revelar resolução a todos', 'revelarResolucao', { icone: c.resolucaoVisivel ? 'olhoFechado' : 'olho', dados: { post: p.id } })}</div>` : ''}`;
  } else corpo = `<div class="rich corpo-post">${sanitizar(p.html)}</div>`;

  return `${voltar()}
    <article class="post-detalhe">
      <div class="pd-cab">
        <div class="cp-topo"><span class="tag-linha" style="--tc:${caso ? '#0d9488' : 'var(--accent)'}">${ic(caso ? 'caso' : 'forum')}${caso ? 'Caso clínico' : 'Publicação'}</span>${p.casoDaSemana ? `<span class="tag-linha" style="--tc:var(--gold)">${ic('estrela')}Caso da semana</span>` : ''}</div>
        ${menu}
      </div>
      <h1 class="pd-titulo">${esc(p.titulo)}</h1>
      ${eixosChips(p.eixos)}
      <div class="pd-autor">${avatar(u, 30)}<div><strong>${esc(nomeDe(p.autor))}</strong><small>${esc((u && u.cargo) || '')} · ${tempoRelativo(p.criadoEm)}${p.editadoEm ? ' · editado' : ''}</small></div></div>
      ${corpo}
      ${renderEnquete(p)}
    </article>
    ${renderComentarios(p)}`;
}
const voltar = () => `<a class="voltar" href="#/forum">${ic('voltar')} Fórum</a>`;

acao('fixarPost', ({ post }) => { const p = S.forum.find(x => x.id === post); Data.update(`forum/${post}`, { fixado: !p.fixado }); });
acao('casoSemana', async ({ post }) => {
  const p = S.forum.find(x => x.id === post);
  const marcar = !p.casoDaSemana;
  const ops = S.forum.filter(x => x.casoDaSemana && x.id !== post).map(x => Data.update(`forum/${x.id}`, { casoDaSemana: false }));
  await Promise.all([...ops, Data.update(`forum/${post}`, { casoDaSemana: marcar })]);
  if (marcar) notificar({ tipo: 'caso', pref: 'casoSemana', todos: true, eixos: p.eixos, titulo: 'Caso clínico da semana: ' + p.titulo, corpo: 'Um novo desafio foi publicado. Participe!', url: `#/forum/${post}` });
});
acao('revelarResolucao', async ({ post }) => {
  const p = S.forum.find(x => x.id === post);
  const vis = !p.caso.resolucaoVisivel;
  await Data.update(`forum/${post}`, { 'caso.resolucaoVisivel': vis });
  if (vis) notificar({ tipo: 'caso', pref: 'casoSemana', todos: true, titulo: 'Resolução revelada: ' + p.titulo, url: `#/forum/${post}` });
});
acao('apagarPost', async ({ post }) => {
  if (!(await confirmar('Excluir esta publicação e todos os comentários?', { ok: 'Excluir', perigo: true }))) return;
  const [cs, vs] = await Promise.all([Data.getCol(`forum/${post}/comentarios`), Data.getCol(`forum/${post}/votos`)]);
  await Data.batch([...cs.map(c => ({ tipo: 'del', path: `forum/${post}/comentarios/${c.id}` })), ...vs.map(v => ({ tipo: 'del', path: `forum/${post}/votos/${v.id}` })), { tipo: 'del', path: `forum/${post}` }]);
  location.hash = '#/forum'; toast('Publicação excluída.', 'ok');
});

// ---------------------------------------------------------- CRIAÇÃO ----
const MODELO_ANAMNESE = ['Identificação', 'Queixa principal', 'História da doença atual', 'Antecedentes pessoais', 'Antecedentes familiares', 'Hábitos de vida', 'Revisão de sistemas'];
const MODELO_EXAME = ['Estado geral', 'Sinais vitais', 'Aparelho cardiovascular', 'Aparelho respiratório', 'Abdome', 'Neurológico', 'Extremidades'];

function secaoHTML(grupo, s = {}) {
  const id = novoId('ed');
  return `<div class="caso-secao" data-grupo="${grupo}">
    <div class="cs-topo"><input class="cs-titulo" value="${esc(s.titulo || '')}" placeholder="Título da seção">
      <label class="chk pequeno" title="Se desmarcado, a seção aparece recolhida"><input type="checkbox" class="cs-aberto" ${s.aberto !== false ? 'checked' : ''}><span>Aberta</span></label>
      ${btnIc('lixeira', 'removerBloco', {}, 'Remover seção')}</div>
    ${editorHTML(id, { valor: s.html || '', compacto: true, altura: 60, placeholder: 'Conteúdo…' })}
  </div>`;
}
function paramHTML(p = {}) {
  return `<div class="param-linha"><input class="pm-nome" placeholder="Parâmetro" value="${esc(p.nome || '')}"><input class="pm-valor" placeholder="Valor" value="${esc(p.valor || '')}">
    <input class="pm-unid" placeholder="Unidade" value="${esc(p.unidade || '')}"><input class="pm-ref" placeholder="Ref. (ex.: 3,5 – 5,0)" value="${esc(p.ref || '')}">${btnIc('x', 'removerLinha', {}, 'Remover')}</div>`;
}
function grupoExameHTML(g = { parametros: [{}, {}] }) {
  return `<div class="exame-grupo">
    <div class="cs-topo"><input class="eg-titulo" value="${esc(g.titulo || '')}" placeholder="Ex.: Hemograma, Gasometria arterial…">${btnIc('lixeira', 'removerBloco', {}, 'Remover exame')}</div>
    <div class="eg-opcoes"><label class="chk pequeno"><input type="checkbox" class="eg-ref" ${g.mostrarRef !== false ? 'checked' : ''}><span>Mostrar valores de referência</span></label>
      <label class="chk pequeno"><input type="checkbox" class="eg-aberto" ${g.aberto !== false ? 'checked' : ''}><span>Aberto por padrão</span></label></div>
    <div class="eg-params">${(g.parametros || []).map(paramHTML).join('')}</div>
    <button type="button" class="link" data-action="addParam">${ic('mais')} parâmetro</button>
  </div>`;
}
function enqueteForm(e) {
  return `<div class="enq-form" id="enq-form" ${e ? '' : 'hidden'}>
    ${campo('Pergunta da enquete', `<input id="enq-pergunta" value="${esc(e?.pergunta || '')}">`)}
    <div id="enq-opcoes">${(e?.opcoes || ['', '']).map(o => `<div class="enq-op-linha"><input class="enq-op" value="${esc(o)}" placeholder="Opção">${btnIc('x', 'removerLinha', {}, 'Remover')}</div>`).join('')}</div>
    <button type="button" class="link" data-action="addOpcaoEnquete">${ic('mais')} opção</button>
    <div class="linha-chk">${chk('enq-multipla', 'Permitir várias respostas', e?.multipla)}${chk('enq-anonima', 'Votos anônimos', e?.anonima)}</div>
  </div>`;
}

function abrirComposer(tipo, p = null) {
  const caso = tipo === 'caso';
  const c = (p && p.caso) || {};
  const corpo = `
    ${campo('Título', `<input id="fp-titulo" value="${esc(p?.titulo || '')}" placeholder="${caso ? 'Ex.: Dor torácica em jovem atleta' : 'Assunto da publicação'}">`)}
    ${campo('Eixos (um ou mais — sem seleção vale Clínica Médica)', eixoPicker('fp-eixos', p?.eixos || []))}
    ${caso ? `
      <div class="bloco-form"><div class="bf-cab"><h5>${ic('usuario')} Anamnese</h5><button type="button" class="link" data-action="modeloSecoes" data-grupo="anamnese">usar modelo</button></div>
        <div id="lista-anamnese">${(c.anamnese || [{ titulo: 'Identificação' }, { titulo: 'Queixa principal' }, { titulo: 'História da doença atual' }]).map(s => secaoHTML('anamnese', s)).join('')}</div>
        <button type="button" class="btn btn-peq" data-action="addSecao" data-grupo="anamnese">${ic('mais')}Seção</button></div>
      <div class="bloco-form"><div class="bf-cab"><h5>${ic('olho')} Exame físico</h5><button type="button" class="link" data-action="modeloSecoes" data-grupo="exameFisico">usar modelo</button></div>
        <div id="lista-exameFisico">${(c.exameFisico || [{ titulo: 'Sinais vitais' }]).map(s => secaoHTML('exameFisico', s)).join('')}</div>
        <button type="button" class="btn btn-peq" data-action="addSecao" data-grupo="exameFisico">${ic('mais')}Seção</button></div>
      <div class="bloco-form"><div class="bf-cab"><h5>${ic('lupa')} Exames complementares</h5></div>
        <div id="lista-exames">${(c.exames || []).map(grupoExameHTML).join('')}</div>
        <button type="button" class="btn btn-peq" data-action="addExame">${ic('mais')}Exame</button></div>
      ${campo('Desafio — o que os membros devem responder', editorHTML('fp-pergunta', { valor: c.pergunta || '', altura: 70, compacto: true }))}
      ${campo('Resolução comentada (opcional — só aparece quando você revelar)', editorHTML('fp-resolucao', { valor: c.resolucao || '', altura: 70, compacto: true }))}
      <div class="linha-chk">${chk('fp-semana', 'Caso clínico da semana (notifica todos)', p ? p.casoDaSemana : true)}${chk('fp-ocultar', 'Ocultar respostas até o membro comentar', p ? p.ocultarAteComentar : true)}</div>
    ` : campo('Conteúdo', editorHTML('fp-html', { valor: p?.html || '', altura: 180 }))}
    <div class="bloco-form"><label class="chk"><input type="checkbox" id="fp-tem-enquete" ${p?.enquete ? 'checked' : ''} data-change="toggleEnquete"><span>${ic('enquete')} Incluir enquete</span></label>${enqueteForm(p?.enquete)}</div>
    <div class="acoes-form">${btn('Cancelar', 'fecharModal')}<button class="btn btn-pri" data-action="salvarPost" data-tipo="${tipo}" data-id="${p?.id || ''}">${ic('enviar')}<span>${p ? 'Salvar alterações' : 'Publicar'}</span></button></div>`;
  abrirModal({ titulo: p ? 'Editar' : (caso ? 'Novo caso clínico' : 'Nova publicação'), corpo, largura: caso ? 860 : 720 });
}
acao('novoPost', ({ tipo }) => abrirComposer(tipo));
acao('editarPost', ({ post }) => { const p = S.forum.find(x => x.id === post); abrirComposer(p.tipo, p); });
acao('toggleEnquete', (d, el) => { document.getElementById('enq-form').hidden = !el.checked; });
acao('addOpcaoEnquete', () => document.getElementById('enq-opcoes').insertAdjacentHTML('beforeend', `<div class="enq-op-linha"><input class="enq-op" placeholder="Opção">${btnIc('x', 'removerLinha', {}, 'Remover')}</div>`));
acao('addSecao', ({ grupo }) => document.getElementById('lista-' + grupo).insertAdjacentHTML('beforeend', secaoHTML(grupo)));
acao('modeloSecoes', ({ grupo }) => {
  const lista = document.getElementById('lista-' + grupo);
  const existentes = [...lista.querySelectorAll('.cs-titulo')].map(i => i.value.trim().toLowerCase());
  (grupo === 'anamnese' ? MODELO_ANAMNESE : MODELO_EXAME).filter(t => !existentes.includes(t.toLowerCase())).forEach(t => lista.insertAdjacentHTML('beforeend', secaoHTML(grupo, { titulo: t, aberto: grupo === 'anamnese' })));
});
acao('addExame', () => document.getElementById('lista-exames').insertAdjacentHTML('beforeend', grupoExameHTML()));
acao('addParam', (d, el) => el.previousElementSibling.insertAdjacentHTML('beforeend', paramHTML()));
acao('removerBloco', (d, el) => { const b = el.closest('.caso-secao, .exame-grupo'); b.classList.add('saindo'); setTimeout(() => b.remove(), 180); });
acao('removerLinha', (d, el) => el.parentElement.remove());

function lerSecoes(grupo) {
  return [...document.querySelectorAll(`#lista-${grupo} .caso-secao`)].map(s => ({
    titulo: s.querySelector('.cs-titulo').value.trim(), aberto: s.querySelector('.cs-aberto').checked, html: lerEditor(s.querySelector('.editor-area').id)
  })).filter(s => s.html).map(s => ({ ...s, titulo: s.titulo || 'Sem título' }));
}
function lerExames() {
  return [...document.querySelectorAll('#lista-exames .exame-grupo')].map(g => ({
    titulo: g.querySelector('.eg-titulo').value.trim() || 'Exames', mostrarRef: g.querySelector('.eg-ref').checked, aberto: g.querySelector('.eg-aberto').checked,
    parametros: [...g.querySelectorAll('.param-linha')].map(l => ({ nome: l.querySelector('.pm-nome').value.trim(), valor: l.querySelector('.pm-valor').value.trim(), unidade: l.querySelector('.pm-unid').value.trim(), ref: l.querySelector('.pm-ref').value.trim() })).filter(x => x.nome || x.valor)
  })).filter(g => g.parametros.length);
}

acao('salvarPost', async ({ tipo, id }, botao) => {
  const titulo = val('fp-titulo');
  if (!titulo) { toast('Dê um título.', 'erro'); return; }
  const dados = { tipo, titulo, eixos: lerEixos('fp-eixos') };
  if (tipo === 'caso') {
    dados.caso = { anamnese: lerSecoes('anamnese'), exameFisico: lerSecoes('exameFisico'), exames: lerExames(), pergunta: lerEditor('fp-pergunta'), resolucao: lerEditor('fp-resolucao') };
    const anterior = id ? S.forum.find(x => x.id === id) : null;
    dados.caso.resolucaoVisivel = !!(anterior && anterior.caso && anterior.caso.resolucaoVisivel);
    dados.casoDaSemana = val('fp-semana'); dados.ocultarAteComentar = val('fp-ocultar');
  } else {
    dados.html = lerEditor('fp-html');
    if (!dados.html) { toast('Escreva o conteúdo.', 'erro'); return; }
  }
  if (val('fp-tem-enquete')) {
    const opcoes = [...document.querySelectorAll('.enq-op')].map(i => i.value.trim()).filter(Boolean);
    if (!val('enq-pergunta') || opcoes.length < 2) { toast('A enquete precisa de pergunta e pelo menos 2 opções.', 'erro'); return; }
    const antes = id ? (S.forum.find(x => x.id === id) || {}).enquete : null;
    dados.enquete = { pergunta: val('enq-pergunta'), opcoes, multipla: val('enq-multipla'), anonima: val('enq-anonima'), encerrada: !!(antes && antes.encerrada) };
  } else dados.enquete = null;

  botao.disabled = true;
  try {
    if (id) {
      await Data.update(`forum/${id}`, { ...dados, editadoEm: Date.now() });
      fecharModal(); toast('Alterações salvas.', 'ok');
    } else {
      if (dados.casoDaSemana) await Promise.all(S.forum.filter(x => x.casoDaSemana).map(x => Data.update(`forum/${x.id}`, { casoDaSemana: false })));
      const nid = await Data.add('forum', { ...dados, autor: S.uid, criadoEm: Date.now(), fixado: false, nComentarios: 0 });
      fecharModal(); toast('Publicado!', 'ok');
      location.hash = `#/forum/${nid}`;
      const semana = tipo === 'caso' && dados.casoDaSemana;
      notificar({
        tipo: tipo === 'caso' ? 'caso' : 'forum', pref: semana ? 'casoSemana' : 'forum', todos: true, eixos: dados.eixos,
        titulo: semana ? `Caso clínico da semana: ${titulo}` : (tipo === 'caso' ? `Novo caso clínico: ${titulo}` : `Fórum: ${titulo}`),
        corpo: dados.enquete ? 'Inclui enquete — vote!' : (dados.eixos.map(e => EIXO[e].nome).join(' · ')), url: `#/forum/${nid}`
      });
    }
  } catch (e) { toast('Erro ao salvar: ' + e.message, 'erro'); botao.disabled = false; }
});

// ------------------------------------------------------------ PÁGINA ----
export default {
  titulo: 'Fórum',
  render: (params) => params[0] ? renderDetalhe(params[0]) : renderLista(),
  montar(view, params) {
    const id = params[0]; if (!id) return;
    ouvirTela('coment-' + id, (avisar) => Data.watchCol(`forum/${id}/comentarios`, (l) => { tela.comentarios = { ...(tela.comentarios || {}), [id]: l }; avisar(); }));
    ouvirTela('votos-' + id, (avisar) => Data.watchCol(`forum/${id}/votos`, (l) => { tela.votos = { ...(tela.votos || {}), [id]: l }; avisar(); }));
    const pessoas = () => usuariosAtivos().map(u => ({ kind: 'user', id: u.id, label: u.nome, sub: u.cargo || '' }));
    view.querySelectorAll('#novo-coment, .compositor').forEach(el => ativarMencoes(el, pessoas));
  }
};
