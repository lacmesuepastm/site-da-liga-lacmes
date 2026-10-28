import { Data } from './data.js';
import { S } from './store.js';
import { WORKER_URL } from './config.js';
import { ic, esc, acao, comprimirImagem, blobParaDataURL, enviarArquivo, baixarBlob, toast } from './util.js';
import { campo } from './ui.js';

export const LIMITE_LOCAL = 650 * 1024;

const TIPOS = {
  pdf: { rot: 'PDF', icone: 'artigo', cor: '#c62828' },
  doc: { rot: 'Word', icone: 'resumo', cor: '#2b6cb0' }, docx: { rot: 'Word', icone: 'resumo', cor: '#2b6cb0' }, odt: { rot: 'Documento', icone: 'resumo', cor: '#2b6cb0' }, rtf: { rot: 'Documento', icone: 'resumo', cor: '#2b6cb0' },
  xls: { rot: 'Excel', icone: 'grade', cor: '#1a7f5a' }, xlsx: { rot: 'Excel', icone: 'grade', cor: '#1a7f5a' }, csv: { rot: 'Planilha', icone: 'grade', cor: '#1a7f5a' }, ods: { rot: 'Planilha', icone: 'grade', cor: '#1a7f5a' },
  ppt: { rot: 'PowerPoint', icone: 'painel', cor: '#c05621' }, pptx: { rot: 'PowerPoint', icone: 'painel', cor: '#c05621' }, odp: { rot: 'Apresentação', icone: 'painel', cor: '#c05621' },
  png: { rot: 'Imagem', icone: 'imagem', cor: '#6b46c1' }, jpg: { rot: 'Imagem', icone: 'imagem', cor: '#6b46c1' }, jpeg: { rot: 'Imagem', icone: 'imagem', cor: '#6b46c1' }, gif: { rot: 'Imagem', icone: 'imagem', cor: '#6b46c1' }, webp: { rot: 'Imagem', icone: 'imagem', cor: '#6b46c1' },
  zip: { rot: 'ZIP', icone: 'pasta', cor: '#4a5568' }
};

export function tipoDe(nome = '', url = '') {
  if (/^https?:\/\//i.test(url) && !/\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|zip)(\?|$)/i.test(url)) {
    if (/docs\.google\.com\/document/.test(url)) return { rot: 'Google Docs', icone: 'resumo', cor: '#2b6cb0' };
    if (/docs\.google\.com\/spreadsheets/.test(url)) return { rot: 'Google Sheets', icone: 'grade', cor: '#1a7f5a' };
    if (/docs\.google\.com\/presentation/.test(url)) return { rot: 'Google Slides', icone: 'painel', cor: '#c05621' };
    if (/drive\.google\.com/.test(url)) return { rot: 'Google Drive', icone: 'pasta', cor: '#4a5568' };
    return { rot: 'Link', icone: 'link', cor: '#4a5568' };
  }
  const ext = (nome.split('.').pop() || '').toLowerCase();
  return TIPOS[ext] || { rot: 'Arquivo', icone: 'clipe', cor: '#4a5568' };
}

export function tamanho(bytes) {
  if (!bytes) return '';
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

export function iconeArquivo(nome, url) {
  const t = tipoDe(nome, url);
  return `<span class="arq-ico" style="--c:${t.cor}" title="${esc(t.rot)}">${ic(t.icone)}</span>`;
}

export function botaoAbrir(url, nome, rotulo = 'Abrir') {
  if (/^anexo:/.test(url)) return `<button type="button" class="btn btn-peq" data-action="abrirArq" data-url="${esc(url)}" data-nome="${esc(nome)}">${ic('olho')}<span>${esc(rotulo)}</span></button>`;
  return `<a class="btn btn-peq" href="${esc(url)}" target="_blank" rel="noopener">${ic('olho')}<span>${esc(rotulo)}</span></a>`;
}

export async function anexar(file, { pasta = 'geral', restrito = false, dono = null } = {}) {
  if (WORKER_URL) {
    const url = await enviarArquivo(file, pasta);
    return { url, nome: file.name, tipo: file.type, tam: file.size };
  }
  const ehImagem = /^image\//.test(file.type) && file.type !== 'image/gif';
  const blob = ehImagem ? await comprimirImagem(file, 1600, 0.8) : file;
  if (blob.size > LIMITE_LOCAL) throw new Error(`Arquivo maior que ${Math.round(LIMITE_LOCAL / 1024)} KB. Use um link do Google Drive ou publique o Cloudflare Worker (aceita até 15 MB).`);
  const data = await blobParaDataURL(blob);
  const tipo = ehImagem ? 'image/jpeg' : (file.type || 'application/octet-stream');
  const id = await Data.add('anexos', { data, nome: file.name, tipo, tam: blob.size, restrito, dono: dono || null, por: S.uid, criadoEm: Date.now() });
  return { url: 'anexo:' + id, nome: file.name, tipo, tam: blob.size };
}

export async function anexarBlob(blob, nome, opcoes = {}) {
  return anexar(new File([blob], nome, { type: blob.type || 'application/pdf' }), opcoes);
}

export async function abrirArquivo(url, nome) {
  if (!/^anexo:/.test(url)) { window.open(url, '_blank', 'noopener'); return; }
  try {
    const d = await Data.getDoc('anexos/' + url.slice(6));
    if (!d) { toast('Arquivo não encontrado ou sem permissão.', 'erro'); return; }
    const blob = await (await fetch(d.data)).blob();
    if (/pdf|image/.test(d.tipo)) {
      const obj = URL.createObjectURL(blob);
      const w = window.open(obj, '_blank');
      if (w) { setTimeout(() => URL.revokeObjectURL(obj), 60000); return; }
      URL.revokeObjectURL(obj);
    }
    baixarBlob(blob, nome || d.nome);
  } catch (e) { toast('Não foi possível abrir: ' + (e.code || e.message), 'erro'); }
}

export async function copiarAnexo(url, restrito = false) {
  if (!/^anexo:/.test(url)) return url;
  const d = await Data.getDoc('anexos/' + url.slice(6));
  if (!d) throw new Error('Arquivo de origem não encontrado.');
  const { id, ...resto } = d;
  const novo = await Data.add('anexos', { ...resto, restrito, por: S.uid, criadoEm: Date.now() });
  return 'anexo:' + novo;
}

export async function apagarAnexo(url) {
  if (/^anexo:/.test(url || '')) await Data.del('anexos/' + url.slice(6)).catch(() => { });
}

export const camposArquivoOuLink = (p) => `${campo('Arquivo (PDF, Word, PowerPoint, Excel…)', `<input type="file" id="${p}-arquivo" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.odt,.ods,.odp,.rtf,.txt,.zip,image/*">`, WORKER_URL ? 'Até 15 MB.' : `Até ${Math.round(LIMITE_LOCAL / 1024)} KB. Para arquivos maiores, use o link do Google Drive.`)}
  <p class="ou"><span>ou link</span></p>
  ${campo('Link do Google Drive, Docs, Slides ou outro', `<input id="${p}-url" placeholder="https://docs.google.com/…">`)}`;

export async function lerArquivoOuLink(p, { restrito = false, pasta = 'geral' } = {}) {
  const f = document.getElementById(`${p}-arquivo`).files[0];
  const url = document.getElementById(`${p}-url`).value.trim();
  if (f) return anexar(f, { pasta, restrito });
  if (/^https?:\/\//i.test(url)) return { url, nome: '', tipo: 'link', tam: 0 };
  return null;
}

acao('abrirArq', ({ url, nome }) => abrirArquivo(url, nome));
