// ============================================================================
// FINANCEIRO (Diretoria Financeira) e ATAS DA DIRETORIA (Secretaria)
// ============================================================================
import { Data } from '../data.js';
import { S } from '../store.js';
import { P } from '../dominio.js';
import { ic, esc, sanitizar, acao, abrirModal, fecharModal, confirmar, toast, val, opcoes, hojeISO, isoParaBR, MESES, baixarBlob } from '../util.js';
import { cabecalho, vazio, btn, btnIc, campo, linhaCampos } from '../ui.js';
import { editorHTML, lerEditor } from '../editor.js';

const brl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function renderFin() {
  const pode = P.financeiro(S.eu);
  const l = S.financeiro;
  const saldo = l.reduce((s, f) => s + (f.tipo === 'Entrada' ? f.valor : -f.valor), 0);
  const ent = l.filter(f => f.tipo === 'Entrada').reduce((s, f) => s + f.valor, 0), sai = l.filter(f => f.tipo !== 'Entrada').reduce((s, f) => s + f.valor, 0);
  // últimos 6 meses
  const meses = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); }
  const porMes = meses.map(m => ({ m, e: l.filter(f => f.tipo === 'Entrada' && (f.data || '').startsWith(m)).reduce((s, f) => s + f.valor, 0), s: l.filter(f => f.tipo !== 'Entrada' && (f.data || '').startsWith(m)).reduce((s, f) => s + f.valor, 0) }));
  const max = Math.max(1, ...porMes.flatMap(x => [x.e, x.s]));
  return `${cabecalho('Financeiro', 'Transparência das contas da liga.', (pode ? btn('Exportar CSV', 'csvFin', { icone: 'baixar' }) + btn('Lançamento', 'novoLanc', { icone: 'mais', classe: 'btn-pri' }) : ''))}
    <div class="stats"><div class="stat" style="--c:${saldo >= 0 ? '#1a7f5a' : '#b23b3b'}"><b>${brl(saldo)}</b><span>Saldo</span></div><div class="stat" style="--c:#1a7f5a"><b>${brl(ent)}</b><span>Entradas</span></div><div class="stat" style="--c:#b23b3b"><b>${brl(sai)}</b><span>Saídas</span></div></div>
    <div class="card grafico-fin"><h5>Últimos 6 meses</h5><div class="barras">${porMes.map(x => `<div class="barra-grupo" title="${MESES[Number(x.m.slice(5)) - 1]}: +${brl(x.e)} / −${brl(x.s)}"><div class="barras-par"><span class="b-ent" style="height:${x.e / max * 100}%"></span><span class="b-sai" style="height:${x.s / max * 100}%"></span></div><small>${MESES[Number(x.m.slice(5)) - 1].slice(0, 3)}</small></div>`).join('')}</div>
      <div class="legenda"><span><i class="b-ent"></i>Entradas</span><span><i class="b-sai"></i>Saídas</span></div></div>
    <div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th class="dir">Valor</th>${pode ? '<th></th>' : ''}</tr></thead><tbody>
      ${l.map(f => `<tr><td>${isoParaBR(f.data)}</td><td>${esc(f.descricao)}${f.comprovante ? ` <a href="${esc(f.comprovante)}" target="_blank" rel="noopener" title="Comprovante">${ic('clipe')}</a>` : ''}</td><td><span class="pill" style="--c:${f.tipo === 'Entrada' ? '#1a7f5a' : '#b23b3b'}">${esc(f.tipo)}</span></td><td class="dir ${f.tipo === 'Entrada' ? 'txt-ok' : 'txt-perigo'}">${f.tipo === 'Entrada' ? '+' : '−'} ${brl(f.valor)}</td>${pode ? `<td>${btnIc('lixeira', 'apagarLanc', { id: f.id }, 'Excluir')}</td>` : ''}</tr>`).join('') || `<tr><td colspan="5">${vazio('Nenhum lançamento.', 'carteira')}</td></tr>`}
    </tbody></table></div>`;
}
acao('novoLanc', () => abrirModal({ titulo: 'Novo lançamento', largura: 460, corpo: `${linhaCampos(campo('Tipo', `<select id="nl-tipo">${opcoes(['Entrada', 'Saída'])}</select>`), campo('Data', `<input type="date" id="nl-data" value="${hojeISO()}">`))}
  ${campo('Descrição', '<input id="nl-desc">')}${campo('Valor (R$)', '<input type="number" id="nl-valor" step="0.01" min="0">')}${campo('Link do comprovante (opcional)', '<input id="nl-comp" placeholder="https://">')}
  <div class="acoes-form">${btn('Registrar', 'salvarLanc', { classe: 'btn-pri' })}</div>` }));
acao('salvarLanc', async () => {
  const desc = val('nl-desc'), valor = Number(val('nl-valor')); if (!desc || !valor) { toast('Informe descrição e valor.', 'erro'); return; }
  await Data.add('financeiro', { tipo: val('nl-tipo'), descricao: desc, valor, data: val('nl-data'), comprovante: val('nl-comp'), por: S.uid, criadoEm: Date.now() }); fecharModal();
});
acao('apagarLanc', async ({ id }) => { if (await confirmar('Excluir lançamento?', { ok: 'Excluir', perigo: true })) Data.del(`financeiro/${id}`); });
acao('csvFin', () => {
  const linhas = [['Data', 'Descrição', 'Tipo', 'Valor']].concat(S.financeiro.map(f => [isoParaBR(f.data), f.descricao, f.tipo, String(f.valor).replace('.', ',')]));
  baixarBlob(new Blob(['﻿' + linhas.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')], { type: 'text/csv' }), `financeiro-lacmes-${hojeISO()}.csv`);
});

function renderAtas() {
  const pode = P.atas(S.eu);
  return `${cabecalho('Atas da diretoria', 'Registro das reuniões gerais da diretoria.', pode ? btn('Nova ata', 'novaAta', { icone: 'mais', classe: 'btn-pri' }) : '')}
    <div class="lista-cards">${S.atas.map(a => `<div class="card card-ata"><div class="aba-cab"><div><h3>${esc(a.titulo)}</h3><small class="mudo">${isoParaBR(a.data)}</small></div>${pode ? `<span>${btnIc('lapis', 'editarAta', { id: a.id }, 'Editar')}${btnIc('lixeira', 'apagarAta', { id: a.id }, 'Excluir')}</span>` : ''}</div>
      ${a.resumoHtml ? `<div class="rich">${sanitizar(a.resumoHtml)}</div>` : ''}${a.link ? `<a class="btn btn-peq" href="${esc(a.link)}" target="_blank" rel="noopener">${ic('ata')}Ata completa</a>` : ''}</div>`).join('') || vazio('Nenhuma ata registrada.', 'ata')}</div>`;
}
const formAta = (a = {}) => `${campo('Título', `<input id="at-titulo" value="${esc(a.titulo || '')}">`)}${campo('Data', `<input type="date" id="at-data" value="${esc(a.data || hojeISO())}">`)}${campo('Resumo / deliberações', editorHTML('at-resumo', { valor: a.resumoHtml || '', altura: 140 }))}${campo('Link da ata completa (opcional)', `<input id="at-link" value="${esc(a.link || '')}">`)}`;
acao('novaAta', () => abrirModal({ titulo: 'Nova ata', largura: 640, corpo: formAta() + `<div class="acoes-form">${btn('Registrar', 'salvarAta', { classe: 'btn-pri' })}</div>` }));
acao('editarAta', ({ id }) => abrirModal({ titulo: 'Editar ata', largura: 640, corpo: formAta(S.atas.find(a => a.id === id)) + `<div class="acoes-form">${btn('Salvar', 'salvarAta', { classe: 'btn-pri', dados: { id } })}</div>` }));
acao('salvarAta', async ({ id }) => {
  const d = { titulo: val('at-titulo'), data: val('at-data'), resumoHtml: lerEditor('at-resumo'), link: val('at-link') }; if (!d.titulo) return;
  if (id) await Data.update(`atas/${id}`, d); else await Data.add('atas', { ...d, por: S.uid, criadoEm: Date.now() });
  fecharModal();
});
acao('apagarAta', async ({ id }) => { if (await confirmar('Excluir ata?', { ok: 'Excluir', perigo: true })) Data.del(`atas/${id}`); });

export const financeiro = { titulo: 'Financeiro', render: renderFin };
export const atas = { titulo: 'Atas da diretoria', render: renderAtas, visivel: (u) => P.verAtas(u) };
