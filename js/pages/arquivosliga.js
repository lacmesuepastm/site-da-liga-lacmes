import { Data } from '../data.js';
import { S, nomeDe } from '../store.js';
import { P } from '../dominio.js';
import { ic, esc, sanitizar, acao, avatar, tempoRelativo, abrirModal, fecharModal, confirmar, toast, val, opcoes, rerender } from '../util.js';
import { vazio, btn, btnIc, campo, chk } from '../ui.js';
import { camposArquivoOuLink, lerArquivoOuLink, iconeArquivo, botaoAbrir, tipoDe, tamanho, apagarAnexo } from '../arquivos.js';
import { notificar } from '../notificar.js';

export const CATEGORIAS_ARQ = ['Edital de seleção', 'Regimento e estatuto', 'Cronograma', 'Formulário', 'Modelo', 'Outros'];
const filtro = { cat: 'todas', busca: '' };

const podeEditar = (a) => P.admin(S.eu) || a.por === S.uid;

function linha(a, i) {
  const t = tipoDe(a.nome, a.url);
  return `<div class="card arq-liga" style="--i:${Math.min(i, 12)}">
    ${iconeArquivo(a.nome, a.url)}
    <div class="arq-corpo">
      <div class="cp-topo"><span class="tag-linha" style="--tc:${a.categoria === 'Edital de seleção' ? '#c05621' : '#2b6cb0'}">${ic(a.categoria === 'Edital de seleção' ? 'maleta' : 'pasta')}${esc(a.categoria)}</span><span class="mudo pequeno">${esc(t.rot)}${a.tam ? ' · ' + tamanho(a.tam) : ''}</span></div>
      <h3>${esc(a.titulo)}</h3>
      ${a.descricao ? `<p class="cp-resumo">${esc(a.descricao)}</p>` : ''}
      <div class="plano-rodape"><span class="mudo pequeno">${avatar(S.usuarios[a.por], 18)} ${esc(nomeDe(a.por))} · ${tempoRelativo(a.criadoEm)}</span>
        <span class="plano-acoes">${botaoAbrir(a.url, a.nome || a.titulo, a.url.startsWith('http') && !/\.(pdf|docx?|pptx?|xlsx?)$/i.test(a.url) ? 'Abrir link' : 'Abrir')}${podeEditar(a) ? btnIc('lapis', 'editarArqLiga', { id: a.id }, 'Editar') + btnIc('lixeira', 'apagarArqLiga', { id: a.id }, 'Excluir') : ''}</span></div>
    </div></div>`;
}

export function renderArquivosLiga() {
  let l = S.arquivosLiga.slice();
  if (filtro.cat !== 'todas') l = l.filter(a => a.categoria === filtro.cat);
  if (filtro.busca) { const q = filtro.busca.toLowerCase(); l = l.filter(a => `${a.titulo} ${a.descricao || ''} ${a.nome || ''}`.toLowerCase().includes(q)); }
  const cats = ['todas', ...CATEGORIAS_ARQ];
  return `<div class="filtros">
      ${P.forum(S.eu) ? btn('Adicionar arquivo', 'novoArqLiga', { icone: 'mais', classe: 'btn-pri' }) : ''}
      <span class="campo-busca">${ic('busca')}<input type="search" id="arq-busca" placeholder="Buscar arquivos…" value="${esc(filtro.busca)}" data-input="buscaArqLiga"></span></div>
    <div class="filtros"><div class="seg">${cats.map(c => `<button class="seg-btn ${filtro.cat === c ? 'ativo' : ''}" data-action="catArqLiga" data-c="${c}">${c === 'todas' ? 'Todos' : c}</button>`).join('')}</div></div>
    <div class="lista-cards">${l.map(linha).join('') || vazio('Nenhum arquivo por aqui. Editais de seleção e documentos da liga ficam nesta aba.', 'pasta')}</div>`;
}
acao('catArqLiga', ({ c }) => { filtro.cat = c; rerender(); });
let tB; acao('buscaArqLiga', (d, el) => { clearTimeout(tB); tB = setTimeout(() => { filtro.busca = el.value; rerender(); }, 250); });

const form = (a = {}) => `${campo('Título', `<input id="al-titulo" value="${esc(a.titulo || '')}" placeholder="Ex.: Edital de seleção 2026.2">`)}
  ${campo('Categoria', `<select id="al-cat">${opcoes(CATEGORIAS_ARQ, a.categoria || 'Edital de seleção')}</select>`)}
  ${campo('Descrição (opcional)', `<textarea id="al-desc" rows="2">${esc(a.descricao || '')}</textarea>`)}
  ${a.id ? '' : camposArquivoOuLink('al')}
  ${a.id ? '' : `<div class="linha-chk">${chk('al-avisar', 'Avisar todos os membros', true)}</div>`}`;

acao('novoArqLiga', () => abrirModal({ titulo: 'Adicionar arquivo da liga', largura: 560, corpo: form() + `<div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Publicar', 'salvarArqLiga', { classe: 'btn-pri', icone: 'check' })}</div>` }));
acao('editarArqLiga', ({ id }) => abrirModal({ titulo: 'Editar arquivo', largura: 520, corpo: form(S.arquivosLiga.find(a => a.id === id)) + `<div class="acoes-form">${btn('Cancelar', 'fecharModal')}${btn('Salvar', 'salvarArqLiga', { classe: 'btn-pri', dados: { id } })}</div>` }));
acao('salvarArqLiga', async ({ id }, b) => {
  const titulo = val('al-titulo'); if (!titulo) { toast('Informe o título.', 'erro'); return; }
  const base = { titulo, categoria: val('al-cat'), descricao: val('al-desc') };
  if (id) { await Data.update(`arquivosLiga/${id}`, base); fecharModal(); toast('Salvo.', 'ok'); return; }
  b.disabled = true;
  try {
    const arq = await lerArquivoOuLink('al', { pasta: 'liga' });
    if (!arq) { toast('Envie um arquivo ou informe um link (https://…).', 'erro'); b.disabled = false; return; }
    await Data.add('arquivosLiga', { ...base, url: arq.url, nome: arq.nome || titulo, tipo: arq.tipo, tam: arq.tam, por: S.uid, criadoEm: Date.now() });
    fecharModal(); toast('Arquivo publicado.', 'ok');
    if (val('al-avisar')) notificar({ tipo: 'forum', pref: 'forum', todos: true, titulo: `${base.categoria}: ${titulo}`, corpo: base.descricao.slice(0, 100) || 'Novo arquivo da liga disponível.', url: '#/forum/arquivos' });
  } catch (e) { toast(e.message, 'erro', 7000); b.disabled = false; }
});
acao('apagarArqLiga', async ({ id }) => {
  const a = S.arquivosLiga.find(x => x.id === id);
  if (!(await confirmar(`Excluir "${a.titulo}"?`, { ok: 'Excluir', perigo: true }))) return;
  await Data.del(`arquivosLiga/${id}`); apagarAnexo(a.url);
});
