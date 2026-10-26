import { Data } from '../data.js';
import { S, nomeDe } from '../store.js';
import { P } from '../dominio.js';
import { ic, esc, acao, tempoRelativo, abrirModal, fecharModal, confirmar, toast, val, opcoes, novoId, rerender } from '../util.js';
import { cabecalho, vazio, btn, btnIc, campo, abas, chk } from '../ui.js';
import { camposArquivoOuLink, lerArquivoOuLink, iconeArquivo, botaoAbrir, tipoDe, tamanho, copiarAnexo, apagarAnexo } from '../arquivos.js';
import { CATEGORIAS_ARQ } from './arquivosliga.js';
import { mencaoHTML } from '../editor.js';
import { notificar } from '../notificar.js';

const CATEGORIAS = {
  modelo: ['Edital', 'Slides', 'Ofício', 'Ata', 'Certificado', 'Formulário', 'Relatório', 'Outro'],
  liga: ['Estatuto', 'Regimento', 'Atas', 'Editais', 'Relatórios', 'Slides', 'Financeiro', 'Outro']
};
const LISTAS = {
  modelo: { nome: 'Documentos-Modelos', icone: 'copiar', sub: 'Modelos para elaborar editais, slides, ofícios e demais documentos. Podem ser enviados a um projeto ou aos arquivos da liga.' },
  liga: { nome: 'Documentos da Liga', icone: 'pasta', sub: 'Acervo oficial da liga: PDF, Word, PowerPoint ou link do Google Drive, Docs e Slides.' }
};
const estado = { aba: 'modelo', cat: 'todas', busca: '' };

function cartao(d, i) {
  const t = tipoDe(d.nome, d.url);
  const ehLink = /^https?:\/\//.test(d.url);
  return `<div class="card arq-liga" style="--i:${Math.min(i, 12)}">
    ${iconeArquivo(d.nome, d.url)}
    <div class="arq-corpo">
      <div class="cp-topo"><span class="tag-linha" style="--tc:#2b6cb0">${ic('pasta')}${esc(d.categoria)}</span><span class="mudo pequeno">${esc(t.rot)}${d.tam ? ' · ' + tamanho(d.tam) : ''}${d.ano ? ' · ' + esc(d.ano) : ''}</span></div>
      <h3>${esc(d.titulo)}</h3>
      ${d.descricao ? `<p class="cp-resumo">${esc(d.descricao)}</p>` : ''}
      <div class="plano-rodape"><span class="mudo pequeno">${esc(nomeDe(d.por))} · ${tempoRelativo(d.criadoEm)}</span>
        <span class="plano-acoes">${botaoAbrir(d.url, d.nome || d.titulo, ehLink && !/\.(pdf|docx?|pptx?|xlsx?)$/i.test(d.url) ? 'Abrir link' : 'Abrir')}
          ${d.lista === 'modelo' ? btn('Enviar…', 'enviarModelo', { icone: 'enviar', classe: 'btn-peq btn-pri', dados: { id: d.id } }) : ''}
          ${ehLink ? btnIc('copiar', 'copiarLinkDoc', { id: d.id }, 'Copiar link') : ''}
          ${btnIc('lapis', 'editarDoc', { id: d.id }, 'Editar')}${btnIc('lixeira', 'apagarDoc', { id: d.id }, 'Excluir')}</span></div>
    </div></div>`;
}

function render() {
  const cfg = LISTAS[estado.aba];
  let l = S.documentos.filter(d => d.lista === estado.aba);
  const total = { modelo: S.documentos.filter(d => d.lista === 'modelo').length, liga: S.documentos.filter(d => d.lista === 'liga').length };
  if (estado.cat !== 'todas') l = l.filter(d => d.categoria === estado.cat);
  if (estado.busca) { const q = estado.busca.toLowerCase(); l = l.filter(d => `${d.titulo} ${d.descricao || ''} ${d.nome || ''}`.toLowerCase().includes(q)); }
  const cats = ['todas', ...CATEGORIAS[estado.aba]];
  return `${cabecalho('Documentos', 'Área restrita à Presidência e à Vice-presidência/Secretaria.', btn('Adicionar', 'novoDoc', { icone: 'mais', classe: 'btn-pri' }))}
    ${abas([{ id: 'modelo', nome: 'Documentos-Modelos', icone: 'copiar', badge: total.modelo || '' }, { id: 'liga', nome: 'Documentos da Liga', icone: 'pasta', badge: total.liga || '' }], estado.aba, 'abaDocs')}
    <p class="mudo">${esc(cfg.sub)}</p>
    <div class="filtros"><span class="campo-busca">${ic('busca')}<input type="search" id="doc-busca" placeholder="Buscar documentos…" value="${esc(estado.busca)}" data-input="buscaDoc"></span></div>
    <div class="filtros"><div class="seg">${cats.map(c => `<button class="seg-btn ${estado.cat === c ? 'ativo' : ''}" data-action="catDoc" data-c="${c}">${c === 'todas' ? 'Todos' : c}</button>`).join('')}</div></div>
    <div class="lista-cards">${l.map(cartao).join('') || vazio('Nada por aqui ainda. Use "Adicionar" para enviar um arquivo ou colar um link do Google Drive.', 'enviarDoc')}</div>`;
}
acao('abaDocs', ({ aba }) => { estado.aba = aba; estado.cat = 'todas'; rerender(); });
acao('catDoc', ({ c }) => { estado.cat = c; rerender(); });
let tB; acao('buscaDoc', (d, el) => { clearTimeout(tB); tB = setTimeout(() => { estado.busca = el.value; rerender(); }, 250); });

const form = (d = {}) => `${campo('Título', `<input id="dc-titulo" value="${esc(d.titulo || '')}">`)}
  ${campo('Lista', `<select id="dc-lista" ${d.id ? 'disabled' : ''}>${opcoes([{ v: 'modelo', t: 'Documentos-Modelos' }, { v: 'liga', t: 'Documentos da Liga' }], d.lista || estado.aba)}</select>`)}
  ${campo('Categoria', `<select id="dc-cat">${opcoes([...new Set([...CATEGORIAS.modelo, ...CATEGORIAS.liga])], d.categoria)}</select>`)}
  ${campo('Ano / referência (opcional)', `<input id="dc-ano" value="${esc(d.ano || '')}" placeholder="2026">`)}
  ${campo('Descrição (opcional)', `<textarea id="dc-desc" rows="2">${esc(d.descricao || '')}</textarea>`)}
  ${d.id ? campo('Link (só para itens do tipo link)', `<input id="dc-url" value="${/^https?:/.test(d.url || '') ? esc(d.url) : ''}" ${/^https?:/.test(d.url || '') ? '' : 'disabled'}>`) : camposArquivoOuLink('dc')}`;

acao('novoDoc', () => abrirModal({ titulo: 'Adicionar documento', largura: 560, corpo: form() + `<div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Salvar', 'salvarDoc', { classe: 'btn-pri', icone: 'check' })}</div>` }));
acao('editarDoc', ({ id }) => abrirModal({ titulo: 'Editar documento', largura: 540, corpo: form(S.documentos.find(d => d.id === id)) + `<div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Salvar', 'salvarDoc', { classe: 'btn-pri', dados: { id } })}</div>` }));
acao('salvarDoc', async ({ id }, b) => {
  const titulo = val('dc-titulo'); if (!titulo) { toast('Informe o título.', 'erro'); return; }
  const base = { titulo, categoria: val('dc-cat'), ano: val('dc-ano'), descricao: val('dc-desc') };
  if (id) {
    const novoLink = document.getElementById('dc-url');
    await Data.update(`documentos/${id}`, novoLink && !novoLink.disabled && /^https?:\/\//.test(novoLink.value.trim()) ? { ...base, url: novoLink.value.trim() } : base);
    fecharModal(); toast('Salvo.', 'ok'); return;
  }
  b.disabled = true;
  try {
    const arq = await lerArquivoOuLink('dc', { restrito: true, pasta: 'documentos' });
    if (!arq) { toast('Envie um arquivo ou informe um link (https://…).', 'erro'); b.disabled = false; return; }
    await Data.add('documentos', { ...base, lista: val('dc-lista'), url: arq.url, nome: arq.nome || titulo, tipo: arq.tipo, tam: arq.tam, por: S.uid, criadoEm: Date.now() });
    estado.aba = val('dc-lista');
    fecharModal(); toast('Documento salvo.', 'ok');
  } catch (e) { toast(e.message, 'erro', 7000); b.disabled = false; }
});
acao('apagarDoc', async ({ id }) => {
  const d = S.documentos.find(x => x.id === id);
  if (!(await confirmar(`Excluir "${d.titulo}"?`, { ok: 'Excluir', perigo: true }))) return;
  await Data.del(`documentos/${id}`); apagarAnexo(d.url);
});
acao('copiarLinkDoc', async ({ id }) => {
  const d = S.documentos.find(x => x.id === id);
  try { await navigator.clipboard.writeText(d.url); toast('Link copiado.', 'ok'); } catch { toast(d.url, 'info', 8000); }
});

acao('enviarModelo', ({ id }) => {
  const d = S.documentos.find(x => x.id === id);
  const projetos = Object.values(S.projetos).sort((a, b) => a.titulo.localeCompare(b.titulo));
  abrirModal({ titulo: `Enviar "${d.titulo}"`, largura: 520, corpo: `
    <div class="campo"><label>Para onde enviar</label>
      <label class="chk"><input type="radio" name="em-dest" value="projeto" checked data-change="destModelo"><span>Chat e arquivos de um projeto</span></label><br>
      <label class="chk"><input type="radio" name="em-dest" value="liga" data-change="destModelo"><span>Arquivos da liga (visível a todos os membros)</span></label></div>
    <div id="em-projeto">${campo('Projeto', `<select id="em-pid">${opcoes(projetos.map(p => ({ v: p.id, t: p.titulo })))}</select>`)}</div>
    <div id="em-liga" hidden>${campo('Categoria', `<select id="em-cat">${opcoes(CATEGORIAS_ARQ, 'Modelo')}</select>`)}</div>
    ${campo('Mensagem (opcional)', '<input id="em-msg" placeholder="Ex.: usem este modelo para o edital">')}
    <div class="linha-chk">${chk('em-avisar', 'Avisar as pessoas', true)}</div>
    <div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Enviar', 'enviarModeloOk', { classe: 'btn-pri', icone: 'enviar', dados: { id } })}</div>` });
});
acao('destModelo', () => {
  const liga = document.querySelector('input[name="em-dest"]:checked').value === 'liga';
  document.getElementById('em-projeto').hidden = liga; document.getElementById('em-liga').hidden = !liga;
});
acao('enviarModeloOk', async ({ id }, b) => {
  const d = S.documentos.find(x => x.id === id);
  const destino = document.querySelector('input[name="em-dest"]:checked').value, msg = val('em-msg'), avisar = val('em-avisar');
  b.disabled = true;
  try {
    const url = await copiarAnexo(d.url, false);
    if (destino === 'projeto') {
      const pid = val('em-pid'), p = S.projetos[pid];
      if (!p) { toast('Escolha um projeto.', 'erro'); b.disabled = false; return; }
      const arq = { id: novoId('a'), nome: d.nome || d.titulo, url, tipo: d.tipo, tam: d.tam, por: S.uid, criadoEm: Date.now() };
      await Data.update(`projetos/${pid}`, { arquivos: [...(p.arquivos || []), arq] });
      await Data.add(`projetos/${pid}/mensagens`, { sistema: true, icone: 'clipe', autor: S.uid, criadoEm: Date.now(), html: `${esc(S.eu.nome.split(' ')[0])} enviou o modelo ${mencaoHTML({ kind: 'file', id: arq.id, label: d.titulo })}${msg ? ' — ' + esc(msg) : ''}` });
      if (avisar) notificar({ tipo: 'mencao', pref: 'mencoes', uids: (p.membros || []).map(m => m.uid), titulo: `Novo modelo em ${p.titulo}`, corpo: d.titulo + (msg ? ' — ' + msg : ''), url: `#/projetos/${pid}/arquivos` });
      toast('Modelo enviado ao projeto.', 'ok');
    } else {
      await Data.add('arquivosLiga', { titulo: d.titulo, categoria: val('em-cat'), descricao: msg || d.descricao || '', url, nome: d.nome || d.titulo, tipo: d.tipo, tam: d.tam, por: S.uid, criadoEm: Date.now() });
      if (avisar) notificar({ tipo: 'forum', pref: 'forum', todos: true, titulo: `Novo arquivo da liga: ${d.titulo}`, corpo: msg, url: '#/forum/arquivos' });
      toast('Modelo publicado nos arquivos da liga.', 'ok');
    }
    fecharModal();
  } catch (e) { toast(e.message, 'erro', 7000); b.disabled = false; }
});

export default { titulo: 'Documentos', render, visivel: (u) => P.documentos(u) };
