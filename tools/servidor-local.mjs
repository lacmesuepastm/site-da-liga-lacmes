// Servidor local para testar o site antes de publicar:  node tools/servidor-local.mjs
// Depois abra http://localhost:5173  (sem config do Firebase → modo demonstração)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const PORTA = Number(process.env.PORT) || 5173;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

http.createServer(async (req, res) => {
  let caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (caminho.endsWith('/')) caminho += 'index.html';
  const arquivo = normalize(join(RAIZ, caminho));
  if (!arquivo.startsWith(RAIZ)) { res.writeHead(403).end(); return; }
  try {
    const dados = await readFile(arquivo);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(dados);
  } catch { res.writeHead(404).end('404'); }
}).listen(PORTA, () => console.log(`LACMES em http://localhost:${PORTA}`));
