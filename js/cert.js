// ============================================================================
// CERTIFICADOS — criação, fluxo de assinatura e geração do PDF no navegador
//
// Fluxo eletrônico (padrão, sem papel):
//   pendente_presidencia ──(Presidência assina)──▶ pendente_orientador
//   ──(Orientador(a) assina)──▶ emitido  (PDF final + código de verificação)
//   Qualquer assinante pode "devolver" com motivo → devolvido → reenviar.
// Fluxo manual (alternativo): em cada etapa, enviar o PDF assinado à mão.
// ============================================================================
import { Data, F, op } from './data.js';
import { S, nomeDe } from './store.js';
import { P } from './dominio.js';
import { WORKER_URL, SITE_URL } from './config.js';
import { enviarArquivo, blobParaDataURL, isoParaBR, toast, novoId } from './util.js';
import { notificar } from './notificar.js';

export const STATUS = {
  pendente_presidencia: { nome: 'Aguardando Presidência', cor: '#b7791f', passo: 1 },
  pendente_orientador: { nome: 'Aguardando Orientador(a)', cor: '#2b6cb0', passo: 2 },
  emitido: { nome: 'Emitido', cor: '#1a7f5a', passo: 3 },
  devolvido: { nome: 'Devolvido para correção', cor: '#b23b3b', passo: 0 },
  cancelado: { nome: 'Cancelado', cor: '#888', passo: 0 }
};

const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codigo = () => 'LAC-' + [4, 4].map(n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => ALFA[b % ALFA.length]).join('')).join('-');

export function tituloCert(tipo, cargoTexto) {
  return ({
    Projeto: `Participação em Projeto — ${cargoTexto}`, Aula: `Participação em Aula — ${cargoTexto}`,
    Estagio: 'Participação em Estágio(s)', Diretor: `Atuação na Diretoria — ${cargoTexto}`, Caso: `Participação em Casos Clínicos`
  })[tipo] || 'Membro da LACMES';
}

// Quem assina como orientador(a): o orientador com conta no projeto, senão a orientadora geral da liga.
export function assinanteDe({ tipo, projetoId }) {
  const proj = projetoId && S.projetos[projetoId];
  if (tipo === 'Projeto' && proj && proj.orientadorUid && S.usuarios[proj.orientadorUid]) {
    return { signerUid: proj.orientadorUid, signerNome: nomeDe(proj.orientadorUid), signerCargo: 'Orientador(a) do Projeto' };
  }
  const uid = S.config.orientadoraUid;
  return { signerUid: uid || null, signerNome: uid ? nomeDe(uid) : (S.config.orientadoraNome || 'Orientadora'), signerCargo: 'Orientadora — LACMES' };
}

export async function criarCertificados(lista) {
  const agora = Date.now();
  const ops = lista.map(c => {
    const u = S.usuarios[c.userId];
    const doc = {
      userId: c.userId, nomeMembro: u ? u.nome : c.nomeMembro, tipo: c.tipo, cargaHoraria: Number(c.cargaHoraria) || 0,
      cargoTexto: c.cargoTexto || '', projetoId: c.projetoId || null, aulaId: c.aulaId || null,
      periodoInicio: c.periodoInicio || null, periodoFim: c.periodoFim || null,
      titulo: tituloCert(c.tipo, c.cargoTexto), ...assinanteDe(c),
      status: 'pendente_presidencia', codigo: codigo(), criadoPor: S.uid, criadoEm: agora,
      historico: [{ em: agora, por: S.uid, acao: 'Criado' }]
    };
    return op.set(`certificados/${novoId('ce')}`, doc);
  });
  await Data.batch(ops);
  const admins = Object.values(S.usuarios).filter(u => u.tipo === 'admin').map(u => u.id);
  notificar({ tipo: 'certificado', pref: 'certificados', uids: admins, titulo: `${lista.length} certificado(s) aguardando assinatura da Presidência`, url: '#/certificados/assinar' });
  return ops.length;
}

const registrar = (acao) => F.arrayUnion({ em: Date.now(), por: S.uid, acao });

export async function minhaAssinatura() { const d = await Data.getDoc(`assinaturas/${S.uid}`); return d && d.img; }

export async function assinarPresidencia(ids) {
  const img = await minhaAssinatura();
  if (!img) { toast('Cadastre sua assinatura em Meu perfil → Assinatura antes de assinar.', 'erro', 6000); return false; }
  const certs = ids.map(id => S.certificados.find(c => c.id === id)).filter(c => c && c.status === 'pendente_presidencia');
  await Data.batch(certs.map(c => op.update(`certificados/${c.id}`, {
    status: 'pendente_orientador', presidenteUid: S.uid, presidenteNome: S.eu.nome, assinadoPresEm: Date.now(), historico: registrar('Assinado pela Presidência')
  })));
  const porSigner = {};
  certs.forEach(c => { if (c.signerUid) porSigner[c.signerUid] = (porSigner[c.signerUid] || 0) + 1; });
  Object.entries(porSigner).forEach(([uid, n]) => notificar({ tipo: 'certificado', pref: 'certificados', uids: [uid], titulo: `${n} certificado(s) aguardando sua assinatura`, corpo: 'Já assinados pela Presidência.', url: '#/certificados/assinar' }));
  return certs.length;
}

async function guardarPDF(cert, blob) {
  if (WORKER_URL) {
    const file = new File([blob], `certificado-${cert.codigo}.pdf`, { type: 'application/pdf' });
    return { pdfUrl: await enviarArquivo(file, 'certificados') };
  }
  await Data.set(`certificados_pdf/${cert.id}`, { data: await blobParaDataURL(blob), userId: cert.userId, em: Date.now() });
  return { pdfNoBanco: true };
}
async function publicarVerificacao(c, extra = {}) {
  await Data.set(`verificacoes/${c.codigo}`, { nome: c.nomeMembro, titulo: c.titulo, cargaHoraria: c.cargaHoraria, tipo: c.tipo, emitidoEm: Date.now(), presidente: c.presidenteNome || '', orientador: c.signerNome || '', status: 'valido', ...extra });
}

export async function assinarOrientador(ids, aoProgresso) {
  const img = await minhaAssinatura();
  if (!img) { toast('Cadastre sua assinatura em Meu perfil → Assinatura antes de assinar.', 'erro', 6000); return false; }
  const certs = ids.map(id => S.certificados.find(c => c.id === id)).filter(c => c && c.status === 'pendente_orientador' && (c.signerUid === S.uid || P.admin(S.eu)));
  const cachePres = {};
  let n = 0;
  for (const c of certs) {
    if (!(c.presidenteUid in cachePres)) cachePres[c.presidenteUid] = c.presidenteUid ? ((await Data.getDoc(`assinaturas/${c.presidenteUid}`)) || {}).img : null;
    const final = { ...c, signerNome: S.eu.nome, emitidoEm: Date.now() };
    const blob = await gerarPDF(final, { assinaturaPres: cachePres[c.presidenteUid], assinaturaOrient: img });
    const local = await guardarPDF(c, blob);
    await Data.update(`certificados/${c.id}`, { status: 'emitido', signerUid: S.uid, signerNome: S.eu.nome, assinadoOrientEm: Date.now(), emitidoEm: final.emitidoEm, ...local, historico: registrar('Assinado pelo(a) orientador(a) — emitido') });
    await publicarVerificacao(final);
    notificar({ tipo: 'certificado', pref: 'certificados', uids: [c.userId], titulo: 'Seu certificado foi emitido!', corpo: c.titulo, url: '#/certificados' });
    aoProgresso && aoProgresso(++n, certs.length);
  }
  return certs.length;
}

export async function devolver(id, motivo) {
  const c = S.certificados.find(x => x.id === id); if (!c) return;
  await Data.update(`certificados/${id}`, { status: 'devolvido', motivoDevolucao: motivo, devolvidoPor: S.uid, historico: registrar('Devolvido: ' + motivo) });
  notificar({ tipo: 'certificado', pref: 'certificados', uids: [c.criadoPor], titulo: 'Certificado devolvido para correção', corpo: `${c.nomeMembro}: ${motivo}`, url: '#/certificados/assinar' });
}
export const reenviar = (id, mudancas = {}) => Data.update(`certificados/${id}`, { ...mudancas, status: 'pendente_presidencia', motivoDevolucao: null, historico: registrar('Corrigido e reenviado') });
export const cancelar = (id) => Data.update(`certificados/${id}`, { status: 'cancelado', historico: registrar('Cancelado') });

// Fluxo manual: PDF assinado fisicamente/por outro app
export async function enviarManual(ids, etapa, file) {
  const url = await enviarArquivo(file, 'certificados');
  for (const id of ids) {
    const c = S.certificados.find(x => x.id === id); if (!c) continue;
    if (etapa === 'presidencia') await Data.update(`certificados/${id}`, { status: 'pendente_orientador', presidenteUid: S.uid, presidenteNome: S.eu.nome, urlPresManual: url, assinadoPresEm: Date.now(), historico: registrar('PDF assinado (manual) — Presidência') });
    else {
      await Data.update(`certificados/${id}`, { status: 'emitido', pdfUrl: url, emitidoEm: Date.now(), assinadoOrientEm: Date.now(), historico: registrar('PDF final assinado (manual) — emitido') });
      await publicarVerificacao(c, { manual: true });
      notificar({ tipo: 'certificado', pref: 'certificados', uids: [c.userId], titulo: 'Seu certificado foi emitido!', corpo: c.titulo, url: '#/certificados' });
    }
  }
}

export async function baixar(c) {
  if (c.pdfUrl) { window.open(c.pdfUrl, '_blank', 'noopener'); return; }
  if (c.pdfNoBanco) {
    const d = await Data.getDoc(`certificados_pdf/${c.id}`);
    if (d && d.data) { const blob = await (await fetch(d.data)).blob(); abrirBlob(blob, `certificado-${c.codigo}.pdf`); return; }
  }
  toast('PDF indisponível.', 'erro');
}
export async function previa(c) { abrirBlob(await gerarPDF(c, { previa: c.status !== 'emitido' }), `previa-${c.codigo}.pdf`); }
function abrirBlob(blob, nome) {
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) { const a = document.createElement('a'); a.href = url; a.download = nome; a.click(); }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// ------------------------------------------------------------- PDF ----
let logoCache = null;
async function logo() {
  if (logoCache) return logoCache;
  const r = await fetch('assets/logo-lacmes.png');
  logoCache = await blobParaDataURL(await r.blob());
  return logoCache;
}
function periodo(c) {
  const i = isoParaBR(c.periodoInicio), f = isoParaBR(c.periodoFim);
  return i && f ? `${i} a ${f}` : (i ? `a partir de ${i}` : (f ? `até ${f}` : ''));
}
// Texto do certificado como trechos [texto, negrito?]
function trechos(c) {
  const N = [c.nomeMembro, true], L = ['Liga Acadêmica de Clínica Médica de Santarém (LACMES)', false];
  const CH = [`${String(c.cargaHoraria).replace('.', ',')} horas`, true];
  const per = periodo(c);
  switch (c.tipo) {
    case 'Projeto': return [['Certificamos que ', 0], N, [' participou do projeto ', 0], [c.cargoTexto, true], [', desenvolvido no âmbito da ', 0], L, [', com carga horária de ', 0], CH, ['.', 0]];
    case 'Aula': return [['Certificamos que ', 0], N, [' participou da aula ', 0], [c.cargoTexto, true], [', promovida pela ', 0], L, [', com carga horária de ', 0], CH, ['.', 0]];
    case 'Estagio': return [['Certificamos que ', 0], N, [' participou de atividades de estágio promovidas pela ', 0], L, [', com carga horária total de ', 0], CH, ['.', 0]];
    case 'Diretor': return [['Certificamos que ', 0], N, [' atuou como ', 0], [c.cargoTexto, true], [' da ', 0], L, per ? [`, no período de ${per}`, 0] : ['', 0], [', com carga horária total de ', 0], CH, ['.', 0]];
    default: return [['Certificamos que ', 0], N, [' atuou como membro da ', 0], L, per ? [`, no período de ${per}`, 0] : ['', 0], [', com carga horária total de ', 0], CH, ['.', 0]];
  }
}
// quebra de linhas com trechos em negrito, centralizado
function textoRico(doc, partes, xCentro, y, larguraMax, tam, entre) {
  const palavras = [];
  partes.forEach(([t, b]) => String(t).split(/(\s+)/).forEach(w => { if (w) palavras.push({ w, b: !!b }); }));
  const medir = (p) => { doc.setFont('helvetica', p.b ? 'bold' : 'normal'); doc.setFontSize(tam); return doc.getTextWidth(p.w); };
  const linhas = []; let atual = [], larg = 0;
  palavras.forEach(p => {
    const lw = medir(p);
    if (larg + lw > larguraMax && atual.length && !/^\s+$/.test(p.w)) { linhas.push(atual); atual = []; larg = 0; }
    if (!atual.length && /^\s+$/.test(p.w)) return;
    atual.push({ ...p, lw }); larg += lw;
  });
  if (atual.length) linhas.push(atual);
  linhas.forEach((l, i) => {
    while (l.length && /^\s+$/.test(l[l.length - 1].w)) l.pop();
    const total = l.reduce((s, p) => s + p.lw, 0);
    let x = xCentro - total / 2;
    l.forEach(p => { doc.setFont('helvetica', p.b ? 'bold' : 'normal'); doc.setTextColor(p.b ? 18 : 60, p.b ? 55 : 60, p.b ? 92 : 60); doc.text(p.w, x, y + i * entre); x += p.lw; });
  });
  return linhas.length;
}

export async function gerarPDF(c, { assinaturaPres, assinaturaOrient, previa = false } = {}) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210, NAVY = [18, 55, 92], GOLD = [181, 146, 73];
  doc.setFillColor(252, 251, 249); doc.rect(0, 0, W, H, 'F');
  doc.setDrawColor(...NAVY); doc.setLineWidth(0.8); doc.rect(9, 9, W - 18, H - 18);
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.3); doc.rect(12, 12, W - 24, H - 24);
  doc.setFillColor(...GOLD); doc.rect(W / 2 - 40, 9, 80, 1.6, 'F');
  try { doc.addImage(await logo(), 'PNG', W / 2 - 13, 17, 26, 26); } catch { }
  doc.setFont('times', 'bold'); doc.setFontSize(40); doc.setTextColor(...NAVY);
  doc.text('CERTIFICADO', W / 2, 60, { align: 'center', charSpace: 3 });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...GOLD);
  doc.text('LIGA ACADÊMICA DE CLÍNICA MÉDICA DE SANTARÉM', W / 2, 69, { align: 'center', charSpace: 1.2 });
  textoRico(doc, trechos(c), W / 2, 90, 215, 15, 9);

  const assinatura = (x, img, nome, cargo) => {
    if (img) { try { doc.addImage(img, img.includes('image/png') ? 'PNG' : 'JPEG', x - 30, 150, 60, 20, undefined, 'FAST'); } catch { } }
    doc.setDrawColor(...NAVY); doc.setLineWidth(0.3); doc.line(x - 38, 171, x + 38, 171);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(50, 50, 50); doc.text(nome || '', x, 177, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110, 110, 110); doc.text(cargo || '', x, 182, { align: 'center' });
  };
  const presNome = c.presidenteNome || nomeDe(S.config.presidenteUid) || 'Presidência LACMES';
  assinatura(85, assinaturaPres, presNome, 'Presidência — LACMES');
  assinatura(212, assinaturaOrient, c.signerNome, c.signerCargo);

  const emitido = c.emitidoEm ? new Date(c.emitidoEm).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(130, 130, 130);
  doc.text(`Santarém-PA, ${emitido}  ·  Código de verificação: ${c.codigo}  ·  Verifique em ${SITE_URL.replace(/^https?:\/\//, '')}/verificar.html?c=${c.codigo}`, W / 2, 195, { align: 'center' });

  if (previa) {
    doc.saveGraphicsState && doc.saveGraphicsState();
    try { doc.setGState(new doc.GState({ opacity: 0.12 })); } catch { }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(60); doc.setTextColor(178, 59, 59);
    doc.text('PRÉVIA — NÃO VÁLIDO', W / 2, H / 2 + 10, { align: 'center', angle: 18 });
    doc.restoreGraphicsState && doc.restoreGraphicsState();
  }
  doc.setProperties({ title: `Certificado — ${c.nomeMembro}`, subject: c.titulo, author: 'LACMES' });
  return doc.output('blob');
}

// ------------------------------------------------- CARGA HORÁRIA ----
export function horasEstagio(uid) {
  return Object.values(S.oportunidades).filter(o => o.tipo === 'Estágio' && (o.confirmados || []).includes(uid) && (o.presencas ? o.presencas.includes(uid) : true)).reduce((s, o) => s + (o.cargaHoraria || 0), 0);
}
export function cargaTotal(uid) {
  let t = horasEstagio(uid);
  S.aulas.forEach(a => { if ((a.presentes || a.seguidores || []).includes(uid)) t += (a.cargaHoraria || 0); });
  Object.values(S.projetos).forEach(p => { if (p.concluido && (p.membroIds || []).includes(uid)) t += (p.cargaHoraria || 0); });
  return Math.round(t * 100) / 100;
}
