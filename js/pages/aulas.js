import { Data, F } from '../data.js';
import { S, nomeDe } from '../store.js';
import { P, eixosChips, eixoPicker, lerEixos, EIXOS } from '../dominio.js';
import { ic, esc, sanitizar, acao, avatar, abrirModal, fecharModal, confirmar, toast, val, hojeISO, dataExtensa, dataDeISO, MESES, enviarArquivo, rerender } from '../util.js';
import { cabecalho, vazio, btn, btnIc, campo, linhaCampos, meta, seletorPessoas } from '../ui.js';
import { editorHTML, lerEditor } from '../editor.js';
import { notificar } from '../notificar.js';
import { criarCertificados } from '../cert.js';
import { avisarAlteracao, mudancasEntre, botoesGestao } from '../eventos.js';

const filtro = { eixo: null };

function card(a, passada) {
  const seguindo = (a.seguidores || []).includes(S.uid);
  const gerir = P.aulas(S.eu);
  const d = dataDeISO(a.data);
  const pendCert = (a.presentes || a.seguidores || []).filter(u => !(a.certificadosEnviados || []).includes(u)).length;
  return `<article class="card card-aula ${passada ? 'passada' : ''} ${a.cancelada ? 'cancelada' : ''}">
    <div class="ca-capa">${a.imagem ? `<img src="${esc(a.imagem)}" alt="" loading="lazy">` : `<div class="ca-capa-vazia">${ic('livro')}</div>`}
      ${d ? `<div class="ca-data"><b>${d.getDate()}</b><span>${MESES[d.getMonth()].slice(0, 3)}</span></div>` : ''}</div>
    <div class="ca-corpo">
      <div class="ca-topo">${eixosChips(a.eixos, { mini: true })}${gerir ? `<span>${btnIc('lapis', 'editarAula', { id: a.id }, 'Editar')}${btnIc('lixeira', 'apagarAula', { id: a.id }, 'Excluir')}</span>` : ''}</div>
      ${a.tipo === 'Hands-on' || a.certifica ? `<div class="cp-topo">${a.tipo === 'Hands-on' ? `<span class="tag-linha" style="--tc:#0987a0">${ic('caneta')}Hands-on</span>` : ''}${a.certifica ? `<span class="tag-linha" style="--tc:#AB9748">${ic('certificado')}Emite certificado</span>` : ''}</div>` : ''}
      ${a.cancelada ? `<div class="aviso-cancelado">${ic('alerta')}<div><b>Aula cancelada</b>${a.motivoCancelamento ? `<p>${esc(a.motivoCancelamento)}</p>` : ''}</div></div>` : ''}
      <h3>${esc(a.titulo)}</h3>
      <div class="meta">${meta('usuario', esc(a.professor))}${meta('calendario', `${dataExtensa(a.data)} · ${esc(a.hora)}`)}${meta('local', esc(a.local))}${meta('relogio', `${a.cargaHoraria || 0}h`)}</div>
      ${a.descHtml ? `<div class="rich ca-desc">${sanitizar(a.descHtml)}</div>` : ''}
      <div class="acoes-linha esq">
        ${!passada && !a.cancelada ? `<button class="btn ${seguindo ? 'btn-on' : 'btn-pri'}" data-action="seguirAula" data-id="${a.id}">${ic(seguindo ? 'check' : 'mais')}<span>${seguindo ? 'Acompanhando' : 'Acompanhar'}</span></button>` : ''}
        ${gerir && !passada ? botoesGestao('aula', a.id, a.cancelada) : ''}
        <span class="mudo pequeno">${(a.seguidores || []).length} acompanhando</span>
        ${passada && gerir ? btn('Chamada', 'chamadaAula', { icone: 'tarefa', classe: 'btn-peq', dados: { id: a.id } }) + btn(`Certificar${pendCert ? ` (${pendCert})` : ' ✓'}`, 'certificarAula', { icone: 'certificado', classe: 'btn-peq', dados: { id: a.id } }) : ''}
      </div>
    </div></article>`;
}

function render() {
  const hoje = hojeISO();
  let l = S.aulas;
  if (filtro.eixo) l = l.filter(a => (a.eixos || ['clinica']).includes(filtro.eixo));
  const fut = l.filter(a => !a.data || a.data >= hoje), pas = l.filter(a => a.data && a.data < hoje).reverse();
  return `${cabecalho('Aulas', 'Acompanhe as aulas — elas entram na sua agenda e você recebe lembrete na véspera.', P.aulas(S.eu) ? btn('Agendar aula', 'novaAula', { icone: 'mais', classe: 'btn-pri' }) : '')}
    <div class="filtro-eixos">${EIXOS.map(e => `<button class="eixo-filtro ${filtro.eixo === e.id ? 'ativo' : ''}" style="--ec:${e.c};--eb:${e.b}" data-action="aulaEixo" data-eixo="${e.id}">${e.svg}<span>${esc(e.nome)}</span></button>`).join('')}</div>
    <div class="lista-aulas">${fut.map(a => card(a, false)).join('') || vazio('Nenhuma aula futura agendada.', 'livro')}</div>
    ${pas.length ? `<h4 class="sec-titulo">Histórico</h4><div class="lista-aulas">${pas.map(a => card(a, true)).join('')}</div>` : ''}`;
}
acao('aulaEixo', ({ eixo }) => { filtro.eixo = filtro.eixo === eixo ? null : eixo; rerender(); });
acao('seguirAula', async ({ id }) => { const a = S.aulas.find(x => x.id === id); await Data.update(`aulas/${id}`, { seguidores: (a.seguidores || []).includes(S.uid) ? F.arrayRemove(S.uid) : F.arrayUnion(S.uid) }); });

function form(a = {}) {
  return `<div class="capa-upload" id="capa-prev" data-url="${esc(a.imagem || '')}">${a.imagem ? `<img src="${esc(a.imagem)}" alt="">` : `<span>${ic('imagem')}Foto de capa (aparece na lista)</span>`}
      <input type="file" accept="image/*" id="na-capa" data-change="capaAula"></div>
    ${a.imagem ? `<button type="button" class="link" data-action="tirarCapa">remover foto</button>` : ''}
    ${campo('Título', `<input id="na-titulo" value="${esc(a.titulo || '')}">`)}
    ${linhaCampos(campo('Professor(a)', `<input id="na-prof" value="${esc(a.professor || '')}">`), campo('Carga horária (h)', `<input type="number" id="na-carga" min="0" step="0.5" value="${a.cargaHoraria ?? 2}">`))}
    ${linhaCampos(campo('Data', `<input type="date" id="na-data" value="${esc(a.data || '')}">`), campo('Horário', `<input type="time" id="na-hora" value="${esc(a.hora || '')}">`))}
    ${campo('Local / link', `<input id="na-local" value="${esc(a.local || '')}">`)}
    ${campo('Eixos', eixoPicker('na-eixos', a.eixos || []))}
    ${campo('Descrição', editorHTML('na-desc', { valor: a.descHtml || '', altura: 120 }))}`;
}
acao('capaAula', async (d, input) => {
  const f = input.files[0]; if (!f) return;
  const box = document.getElementById('capa-prev');
  box.classList.add('enviando');
  try { const url = await enviarArquivo(f, 'aulas', { imagemMax: 1200 }); box.dataset.url = url; box.querySelector('img, span').outerHTML = `<img src="${esc(url)}" alt="">`; }
  catch (e) { toast(e.message, 'erro'); } finally { box.classList.remove('enviando'); }
});
acao('tirarCapa', (d, el) => { const box = document.getElementById('capa-prev'); box.dataset.url = ''; const img = box.querySelector('img'); if (img) img.outerHTML = `<span>${ic('imagem')}Foto de capa</span>`; el.remove(); });
acao('novaAula', () => abrirModal({ titulo: 'Agendar aula', largura: 680, corpo: form() + `<div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Publicar e notificar', 'salvarAula', { classe: 'btn-pri', icone: 'sino' })}</div>` }));
acao('editarAula', ({ id }) => abrirModal({ titulo: 'Editar aula', largura: 680, corpo: form(S.aulas.find(a => a.id === id)) + `<div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Salvar', 'salvarAula', { classe: 'btn-pri', dados: { id } })}</div>` }));
acao('salvarAula', async ({ id }) => {
  if (document.getElementById('capa-prev').classList.contains('enviando')) { toast('Aguarde o envio da foto terminar.', 'info'); return; }
  const titulo = val('na-titulo'); if (!titulo || !val('na-data')) { toast('Informe título e data.', 'erro'); return; }
  const d = { titulo, professor: val('na-prof'), data: val('na-data'), hora: val('na-hora'), local: val('na-local'), cargaHoraria: Number(val('na-carga')) || 0, eixos: lerEixos('na-eixos'), descHtml: lerEditor('na-desc'), imagem: document.getElementById('capa-prev').dataset.url || '' };
  if (id) {
    const antes = S.aulas.find(a => a.id === id);
    await Data.update(`aulas/${id}`, d);
    fecharModal();
    if (antes) await avisarAlteracao('aula', antes, mudancasEntre('aula', antes, d));
    return;
  }
  await Data.add('aulas', { ...d, seguidores: [], presentes: null, certificadosEnviados: [], criadoPor: S.uid, criadoEm: Date.now() });
  fecharModal(); toast('Aula publicada!', 'ok');
  notificar({ tipo: 'aula', pref: 'aulas', todos: true, eixos: d.eixos, titulo: `Nova aula: ${titulo}`, corpo: `${dataExtensa(d.data)} às ${d.hora} · ${d.professor}`, url: '#/aulas' });
});
acao('apagarAula', async ({ id }) => { if (await confirmar('Excluir esta aula?', { ok: 'Excluir', perigo: true })) Data.del(`aulas/${id}`); });
acao('chamadaAula', ({ id }) => {
  const a = S.aulas.find(x => x.id === id);
  const todos = [...new Set([...(a.seguidores || []), ...(a.presentes || [])])];
  abrirModal({ titulo: `Chamada — ${a.titulo}`, largura: 520, corpo: `<p class="mudo">Marque quem compareceu. Só os presentes recebem certificado (se não fizer chamada, valem os que acompanharam).</p>
    ${seletorPessoas('ch-uids', Object.keys(S.usuarios).filter(u => S.usuarios[u].ativo !== false), a.presentes || a.seguidores || [], { todosOpcao: true })}
    <div class="acoes-form">${btn('Salvar chamada', 'salvarChamada', { classe: 'btn-pri', dados: { id } })}</div>` });
});
acao('salvarChamada', async ({ id }) => { await Data.update(`aulas/${id}`, { presentes: [...document.querySelectorAll('input[name="ch-uids"]:checked')].map(i => i.value) }); fecharModal(); toast('Chamada salva.', 'ok'); });
acao('certificarAula', ({ id }) => {
  const a = S.aulas.find(x => x.id === id);
  const base = a.presentes || a.seguidores || [];
  const pend = base.filter(u => !(a.certificadosEnviados || []).includes(u) && S.usuarios[u]);
  if (!pend.length) { toast('Todos os participantes já foram certificados.', 'info'); return; }
  abrirModal({ titulo: `Certificar — ${a.titulo}`, largura: 520, corpo: `<p class="mudo">Carga: <b>${a.cargaHoraria || 0}h</b>. Os certificados vão para a fila de assinatura.</p>${seletorPessoas('ca-uids', pend, pend, { todosOpcao: true })}
    <div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Gerar certificados', 'gerarCertAula', { classe: 'btn-pri', icone: 'certificado', dados: { id } })}</div>` });
});
acao('gerarCertAula', async ({ id }) => {
  const a = S.aulas.find(x => x.id === id);
  const uids = [...document.querySelectorAll('input[name="ca-uids"]:checked')].map(i => i.value); if (!uids.length) return;
  await criarCertificados(uids.map(userId => ({ userId, tipo: 'Aula', cargaHoraria: a.cargaHoraria || 0, cargoTexto: a.titulo, aulaId: id })));
  await Data.update(`aulas/${id}`, { certificadosEnviados: [...new Set([...(a.certificadosEnviados || []), ...uids])] });
  fecharModal(); toast(`${uids.length} certificado(s) enviados para assinatura.`, 'ok');
});

export default { titulo: 'Aulas', render };
