import { Data, F, op } from './data.js';
import { S } from './store.js';
import { SITE_URL } from './config.js';
import { blobParaDataURL, isoParaBR, dataDeISO, MESES, toast, novoId } from './util.js';
import { notificar } from './notificar.js';
import { anexarBlob, abrirArquivo } from './arquivos.js';

export const STATUS = {
  solicitado: { nome: 'Solicitado', cor: '#b7791f' },
  aguardando_assinatura: { nome: 'Em assinatura', cor: '#2b6cb0' },
  emitido: { nome: 'Emitido', cor: '#1a7f5a' },
  cancelado: { nome: 'Cancelado', cor: '#888888' }
};

export const PAPEIS = ['Participante', 'Palestrante', 'Organizador(a)', 'Monitor(a)', 'Coordenador(a)', 'Membro da LACMES', 'Diretor(a) da LACMES'];

export const REFS = {
  aula: { rot: 'Aula', de: 'da aula', em: 'na aula', por: 'promovida pela' },
  evento: { rot: 'Evento ou reunião', de: 'do evento', em: 'no evento', por: 'promovido pela' },
  acao: { rot: 'Ação, extensão ou pesquisa', de: 'da ação', em: 'na ação', por: 'promovida pela' },
  projeto: { rot: 'Projeto', de: 'do projeto', em: 'no projeto', por: 'desenvolvido no âmbito da' },
  estagio: { rot: 'Estágio', de: 'do estágio', em: 'no estágio', por: 'promovido pela' },
  livre: { rot: 'Atividade livre', de: 'da atividade', em: 'na atividade', por: 'promovida pela' },
  membro: { rot: 'Membro ou diretoria', de: '', em: '', por: '' }
};

const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const gerarCodigo = () => 'LAC-' + [4, 4].map(n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => ALFA[b % ALFA.length]).join('')).join('-');

export const soDigitos = (s) => String(s || '').replace(/\D/g, '');

export function cpfValido(s) {
  const d = soDigitos(s);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const dv = (n) => { let soma = 0; for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i); const r = (soma * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export function formatarCPF(s) {
  const d = soDigitos(s).slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
}

export const mascararCPF = (s) => { const d = soDigitos(s); return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : ''; };

export async function cpfDe(uid) {
  try { const d = await Data.getDoc(`dadosPessoais/${uid}`); return (d && d.cpf) || ''; } catch { return ''; }
}

export const rotuloCert = (c) => `${c.papel || 'Participante'} — ${c.atividade || ''}`;

const fmtNum = (n) => String(Number(n) || 0).replace('.', ',');
const papelMin = (p) => String(p || '').toLowerCase();

function dataTexto(c) {
  if (c.data) { const d = dataDeISO(c.data); return `${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`; }
  const i = isoParaBR(c.periodoInicio), f = isoParaBR(c.periodoFim);
  if (i && f) return `${i} a ${f}`;
  if (i) return `a partir de ${i}`;
  if (f) return `até ${f}`;
  return '';
}

function trechos(c) {
  const ref = REFS[c.refKind] || REFS.livre;
  const L = ['Liga Acadêmica de Clínica Médica de Santarém (LACMES)', false];
  const CH = [`${fmtNum(c.cargaHoraria)} ${Number(c.cargaHoraria) === 1 ? 'hora' : 'horas'}`, true];
  const fim = [[', com carga horária de ', 0], CH, ['.', 0]];
  if (c.refKind === 'membro') {
    const funcao = c.papel === 'Diretor(a) da LACMES' ? (c.cargoTexto || 'diretor(a)') : 'membro';
    const per = dataTexto(c);
    return [['atuou como ', 0], [funcao, true], [' da ', 0], L, [per ? `, no período de ${per}` : '', 0], ...fim];
  }
  const inicio = (!c.papel || c.papel === 'Participante')
    ? [[`participou ${ref.de} `, 0]]
    : [['atuou como ', 0], [papelMin(c.papel), true], [` ${ref.em} `, 0]];
  return [...inicio, [c.atividade || '', true], [`, ${ref.por} `, 0], L, ...fim];
}

let logoCache = null;
async function logoDataURL() {
  if (logoCache) return logoCache;
  const r = await fetch('assets/logo-lacmes.png');
  logoCache = await blobParaDataURL(await r.blob());
  return logoCache;
}

async function esperarJsPDF() {
  for (let i = 0; i < 40 && !(window.jspdf && window.jspdf.jsPDF); i++) await new Promise(r => setTimeout(r, 100));
  if (!(window.jspdf && window.jspdf.jsPDF)) throw new Error('A biblioteca de PDF ainda não carregou. Recarregue a página e tente de novo.');
  return window.jspdf.jsPDF;
}

const AZUL = [18, 55, 92], AMARELO = [217, 162, 27], CINZA = [105, 112, 122], TEXTO = [45, 52, 62];

function losango(doc, x, y, r) {
  doc.triangle(x - r, y, x, y - r, x + r, y, 'F');
  doc.triangle(x - r, y, x, y + r, x + r, y, 'F');
}

function iconeCalendario(doc, x, y, s) {
  doc.roundedRect(x, y + 0.8, s, s - 0.8, 0.7, 0.7, 'S');
  doc.line(x, y + 2.7, x + s, y + 2.7);
  doc.line(x + s * 0.3, y, x + s * 0.3, y + 1.6); doc.line(x + s * 0.7, y, x + s * 0.7, y + 1.6);
}
function iconeRelogio(doc, x, y, s) {
  doc.circle(x + s / 2, y + s / 2, s / 2, 'S');
  doc.line(x + s / 2, y + s / 2, x + s / 2, y + s * 0.2); doc.line(x + s / 2, y + s / 2, x + s * 0.74, y + s * 0.62);
}
function iconeLocal(doc, x, y, s) {
  doc.circle(x + s / 2, y + s * 0.36, s * 0.3, 'S');
  doc.line(x + s * 0.24, y + s * 0.55, x + s / 2, y + s); doc.line(x + s * 0.76, y + s * 0.55, x + s / 2, y + s);
  doc.circle(x + s / 2, y + s * 0.36, s * 0.1, 'S');
}

function textoRico(doc, partes, xCentro, y, larguraMax, tam, entre) {
  const palavras = [];
  partes.forEach(([t, b]) => String(t).split(/(\s+)/).forEach(w => { if (w) palavras.push({ w, b: !!b }); }));
  const medir = (p) => { doc.setFont('times', p.b ? 'bold' : 'normal'); doc.setFontSize(tam); return doc.getTextWidth(p.w); };
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
    l.forEach(p => {
      doc.setFont('times', p.b ? 'bold' : 'normal');
      doc.setTextColor(...(p.b ? AZUL : TEXTO));
      doc.text(p.w, x, y + i * entre);
      x += p.lw;
    });
  });
  return linhas.length;
}

function desenharPagina(doc, c, { logo, assinaturas }) {
  const W = 297, H = 210;
  doc.setFillColor(255, 255, 255); doc.rect(0, 0, W, H, 'F');

  try {
    doc.setGState(new doc.GState({ opacity: 0.045 }));
    doc.addImage(logo, 'PNG', W / 2 - 60, H / 2 - 62, 120, 120);
    doc.setGState(new doc.GState({ opacity: 1 }));
  } catch { }

  doc.setDrawColor(...AZUL); doc.setLineWidth(0.7); doc.rect(8, 8, W - 16, H - 16);
  doc.setDrawColor(...AMARELO); doc.setLineWidth(0.3); doc.rect(11, 11, W - 22, H - 22);
  doc.setFillColor(...AMARELO);
  [[11, 11], [W - 11, 11], [11, H - 11], [W - 11, H - 11]].forEach(([x, y]) => doc.rect(x - 1.4, y - 1.4, 2.8, 2.8, 'F'));

  doc.addImage(logo, 'PNG', W / 2 - 13, 15, 26, 26);
  doc.setDrawColor(...AMARELO); doc.setLineWidth(0.35);
  doc.line(52, 28, W / 2 - 20, 28); doc.line(W / 2 + 20, 28, W - 52, 28);
  doc.setFillColor(...AMARELO); losango(doc, W / 2 - 24, 28, 1.3); losango(doc, W / 2 + 24, 28, 1.3);

  doc.setFont('times', 'bold'); doc.setFontSize(34); doc.setTextColor(...AZUL);
  textoEspacado(doc, 'CERTIFICADO', W / 2, 58, 4);
  doc.setFont('times', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...AZUL);
  textoEspacado(doc, 'LIGA ACADÊMICA DE CLÍNICA MÉDICA DE SANTARÉM', W / 2, 65, 1.4);

  doc.setFont('times', 'italic'); doc.setFontSize(14); doc.setTextColor(...CINZA);
  doc.text('Certificamos que', W / 2, 80, { align: 'center' });

  let tamNome = 25;
  doc.setFont('times', 'bold');
  while (tamNome > 14) { doc.setFontSize(tamNome); if (doc.getTextWidth(c.nomeMembro || '') <= 215) break; tamNome -= 1; }
  doc.setFontSize(tamNome); doc.setTextColor(...AZUL);
  doc.text(c.nomeMembro || '', W / 2, 92, { align: 'center' });
  const larguraNome = Math.min(doc.getTextWidth(c.nomeMembro || '') + 16, 240);
  doc.setDrawColor(...AMARELO); doc.setLineWidth(0.5); doc.line(W / 2 - larguraNome / 2, 95.5, W / 2 + larguraNome / 2, 95.5);

  let y = 104;
  if (soDigitos(c.cpf).length === 11) {
    doc.setFont('times', 'normal'); doc.setFontSize(11.5); doc.setTextColor(...CINZA);
    doc.text(`CPF ${formatarCPF(c.cpf)}`, W / 2, y, { align: 'center' });
    y += 2;
  }
  textoRico(doc, trechos(c), W / 2, y + 10, 205, 14.5, 7.6);

  const itens = [];
  const dt = dataTexto(c);
  if (dt) itens.push({ icone: iconeCalendario, texto: dt });
  if (c.refKind !== 'membro' && c.local) itens.push({ icone: iconeLocal, texto: c.local });
  itens.push({ icone: iconeRelogio, texto: `Carga horária: ${fmtNum(c.cargaHoraria)} h` });
  doc.setFont('times', 'normal'); doc.setFontSize(10.5);
  const tam = 4.6, folga = 2.2, entre = 14;
  const larguras = itens.map(i => tam + folga + doc.getTextWidth(i.texto));
  let x = W / 2 - (larguras.reduce((a, b) => a + b, 0) + entre * (itens.length - 1)) / 2;
  const yi = 146;
  doc.setDrawColor(...AZUL); doc.setLineWidth(0.35); doc.setTextColor(...TEXTO);
  itens.forEach((item, i) => { item.icone(doc, x, yi - 3.6, tam); doc.text(item.texto, x + tam + folga, yi); x += larguras[i] + entre; });

  const sig = c.signatarios || [];
  const n = sig.length;
  if (n) {
    const centros = ({ 1: [W / 2], 2: [86, 211], 3: [58, W / 2, 239], 4: [46, 116, 181, 251] })[Math.min(n, 4)];
    const lw = n >= 4 ? 56 : 70;
    sig.slice(0, 4).forEach((s, i) => {
      const cx = centros[i];
      if (assinaturas && assinaturas[i]) { try { doc.addImage(assinaturas[i], 'PNG', cx - 24, 153, 48, 16, undefined, 'FAST'); } catch { } }
      doc.setDrawColor(...AZUL); doc.setLineWidth(0.3); doc.line(cx - lw / 2, 171, cx + lw / 2, 171);
      doc.setFont('times', 'bold'); doc.setFontSize(11); doc.setTextColor(...TEXTO);
      doc.text(doc.splitTextToSize(s.nome || '', lw + 8).slice(0, 2), cx, 176, { align: 'center' });
      doc.setFont('times', 'italic'); doc.setFontSize(9.5); doc.setTextColor(...CINZA);
      doc.text(doc.splitTextToSize(s.titulo || '', lw + 8).slice(0, 2), cx, 181, { align: 'center' });
    });
  }

  const emitido = new Date(c.emitidoEm || Date.now());
  doc.setFont('times', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...CINZA);
  doc.text(`Santarém-PA, ${emitido.getDate()} de ${MESES[emitido.getMonth()].toLowerCase()} de ${emitido.getFullYear()}`, W / 2, 191, { align: 'center' });
  desenharQR(doc, `${SITE_URL}/verificar.html?c=${c.codigo}`, 17, 183, 14);
  doc.setFont('times', 'normal'); doc.setFontSize(8); doc.setTextColor(...CINZA);
  doc.text('Verifique a autenticidade', 34, 187.5);
  doc.setFont('times', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...AZUL);
  doc.text(c.codigo || '', 34, 192.5);
  doc.setFont('times', 'normal'); doc.setFontSize(7); doc.setTextColor(...CINZA);
  doc.text('Aponte a câmera para o QR Code', 34, 196);
}

function desenharQR(doc, texto, x, y, tamanho) {
  if (!window.qrcode) return;
  const qr = window.qrcode(0, 'M'); qr.addData(texto); qr.make();
  const n = qr.getModuleCount(), m = tamanho / n;
  doc.setFillColor(...AZUL);
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qr.isDark(r, k)) doc.rect(x + k * m, y + r * m, m + 0.02, m + 0.02, 'F');
}

function textoEspacado(doc, texto, xCentro, y, espaco) {
  const larg = doc.getTextWidth(texto) + espaco * (texto.length - 1);
  doc.text(texto, xCentro - larg / 2, y, { charSpace: espaco });
}

export async function gerarPDFLote(certs, { assinaturas = {} } = {}) {
  const jsPDF = await esperarJsPDF();
  const logo = await logoDataURL();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  certs.forEach((c, i) => { if (i) doc.addPage(); desenharPagina(doc, c, { logo, assinaturas }); });
  doc.setProperties({ title: certs.length === 1 ? `Certificado — ${certs[0].nomeMembro}` : `Certificados — ${certs[0] ? certs[0].atividade : ''}`, author: 'LACMES' });
  return doc.output('blob');
}

function abrirBlob(blob) {
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) { const a = document.createElement('a'); a.href = url; a.download = 'certificado.pdf'; a.click(); }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function previa(c) { abrirBlob(await gerarPDFLote([c])); }

export async function baixar(c) {
  if (c.pdfUrl) { await abrirArquivo(c.pdfUrl, `certificado-${c.codigo}.pdf`); return; }
  await previa(c);
}

export async function minhaAssinatura() {
  const d = await Data.getDoc(`assinaturas/${S.uid}`);
  return (d && d.img) || null;
}

const registro = (acao) => ({ em: Date.now(), por: S.uid, acao });

export async function criarCertificados(lista) {
  const agora = Date.now();
  const ops = lista.map(c => {
    const u = S.usuarios[c.userId];
    const refKind = ({ Projeto: 'projeto', Aula: 'aula', Estagio: 'estagio', Diretor: 'membro', Membro: 'membro' })[c.tipo] || 'livre';
    const papel = c.tipo === 'Diretor' ? 'Diretor(a) da LACMES' : (c.tipo === 'Membro' ? 'Membro da LACMES' : 'Participante');
    return op.set(`certificados/${novoId('ce')}`, {
      userId: c.userId, nomeMembro: u ? u.nome : (c.nomeMembro || ''), cpf: '', papel, refKind,
      refId: c.projetoId || c.aulaId || null, atividade: c.tipo === 'Estagio' ? 'Estágios supervisionados da LACMES' : (c.cargoTexto || ''),
      cargoTexto: c.cargoTexto || '', cargaHoraria: Number(c.cargaHoraria) || 0, periodoInicio: c.periodoInicio || null, periodoFim: c.periodoFim || null,
      status: 'solicitado', solicitadoPor: S.uid, criadoPor: S.uid, criadoEm: agora, historico: [registro('Solicitado')]
    });
  });
  await Data.batch(ops);
  const admins = Object.values(S.usuarios).filter(u => u.tipo === 'admin').map(u => u.id);
  notificar({ tipo: 'certificado', pref: 'certificados', uids: admins, titulo: `${lista.length} certificado(s) solicitado(s)`, corpo: 'Aguardando a Presidência montar o lote.', url: '#/certificados/solicitacoes' });
  return ops.length;
}

export async function criarLote({ ref, destinatarios, signatarios, modo, descartar = [] }) {
  const agora = Date.now();
  const loteId = novoId('lt');
  const comuns = {
    atividade: ref.atividade, refKind: ref.kind, refId: ref.id || null, data: ref.data || null,
    periodoInicio: ref.periodoInicio || null, periodoFim: ref.periodoFim || null, local: ref.local || '',
    signatarios: signatarios.map(s => ({ nome: s.nome, titulo: s.titulo, uid: s.uid || null })), loteId
  };
  const certs = destinatarios.map((d, i) => ({
    ...comuns, id: novoId('ce'), userId: d.uid || null, nomeMembro: d.nome, cpf: soDigitos(d.cpf), papel: d.papel,
    cargoTexto: d.cargoTexto || '', cargaHoraria: Number(d.ch) || 0, ordem: i, status: 'aguardando_assinatura', codigo: gerarCodigo(),
    criadoPor: S.uid, criadoEm: agora, historico: [registro('Incluído no lote')]
  }));
  const ops = [
    op.set(`lotesCert/${loteId}`, { ...comuns, modo, total: certs.length, criadoPor: S.uid, criadoEm: agora }),
    ...certs.map(({ id, ...doc }) => op.set(`certificados/${id}`, doc)),
    ...descartar.map(id => op.del(`certificados/${id}`))
  ];
  await Data.batch(ops);
  return { loteId, certs };
}

export async function publicarVerificacao(c) {
  await Data.set(`verificacoes/${c.codigo}`, {
    nome: c.nomeMembro, cpf: mascararCPF(c.cpf), titulo: rotuloCert(c), cargaHoraria: c.cargaHoraria, emitidoEm: c.emitidoEm || Date.now(),
    signatarios: (c.signatarios || []).map(s => `${s.nome} — ${s.titulo}`), status: 'valido'
  });
}

export async function emitirCertificado(c, { arquivo = null, assinaturas = {} } = {}) {
  const agora = Date.now();
  const emitido = { ...c, emitidoEm: agora };
  const blob = arquivo || await gerarPDFLote([emitido], { assinaturas });
  const r = await anexarBlob(blob, `certificado-${c.codigo}.pdf`, { pasta: 'certificados', restrito: true, dono: c.userId || S.uid });
  await Data.update(`certificados/${c.id}`, { status: 'emitido', pdfUrl: r.url, emitidoEm: agora, historico: F.arrayUnion(registro(arquivo ? 'PDF assinado enviado' : 'Emitido digitalmente')) });
  await publicarVerificacao(emitido);
  if (c.userId) notificar({ tipo: 'certificado', pref: 'certificados', uids: [c.userId], titulo: 'Seu certificado está disponível', corpo: rotuloCert(c), url: '#/certificados' });
  return r.url;
}

export async function cancelarCertificado(c) {
  await Data.update(`certificados/${c.id}`, { status: 'cancelado', historico: F.arrayUnion(registro('Cancelado')) });
  if (c.codigo) await Data.set(`verificacoes/${c.codigo}`, { status: 'cancelado' }, { merge: true }).catch(() => { });
}

export async function removerLote(lote, certs) {
  const ops = certs.filter(c => c.status !== 'emitido').map(c => op.del(`certificados/${c.id}`));
  if (!certs.some(c => c.status === 'emitido')) ops.push(op.del(`lotesCert/${lote.id}`));
  await Data.batch(ops);
}

async function carregarPdfLib() {
  if (window.PDFLib) return window.PDFLib;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
    s.onload = res; s.onerror = () => rej(new Error('Não foi possível carregar o leitor de PDF. Verifique a internet.'));
    document.head.appendChild(s);
  });
  return window.PDFLib;
}

export async function dividirPDF(file) {
  const { PDFDocument } = await carregarPdfLib();
  const origem = await PDFDocument.load(await file.arrayBuffer());
  const blobs = [];
  for (let i = 0; i < origem.getPageCount(); i++) {
    const novo = await PDFDocument.create();
    const [pagina] = await novo.copyPages(origem, [i]);
    novo.addPage(pagina);
    blobs.push(new Blob([await novo.save()], { type: 'application/pdf' }));
  }
  return blobs;
}

export function horasEstagio(uid) {
  return Object.values(S.oportunidades).filter(o => o.tipo === 'Estágio' && (o.confirmados || []).includes(uid) && (o.presencas ? o.presencas.includes(uid) : true)).reduce((s, o) => s + (o.cargaHoraria || 0), 0);
}

export function cargaTotal(uid) {
  let t = horasEstagio(uid);
  S.aulas.forEach(a => { if ((a.presentes || a.seguidores || []).includes(uid)) t += (a.cargaHoraria || 0); });
  Object.values(S.projetos).forEach(p => { if (p.concluido && (p.membroIds || []).includes(uid)) t += (p.cargaHoraria || 0); });
  return Math.round(t * 100) / 100;
}
