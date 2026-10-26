import { Data } from '../data.js';
import { S } from '../store.js';
import { P, TIPOS_USUARIO, cargoBadge, eixoPicker, lerEixos, PREFS_NOTIF, prefsPadrao } from '../dominio.js';
import { ic, esc, acao, avatar, toast, val, enviarArquivo, comprimirImagem, blobParaDataURL, rerender } from '../util.js';
import { cabecalho, btn, campo, linhaCampos } from '../ui.js';
import { ativarPush, pushStatus } from '../notificar.js';
import { resetarCacheAssinatura } from './certificados.js';
import { DEMO_MODE } from '../config.js';

let assinaturaAtual;

function render(params) {
  const u = S.eu; const prefs = { ...prefsPadrao(), ...(u.notifPrefs || {}) };
  const assina = P.admin(u) || P.orientador(u);
  if (assina && assinaturaAtual === undefined) Data.getDoc(`assinaturas/${S.uid}`).then(d => { assinaturaAtual = (d && d.img) || null; rerender(); });
  const status = pushStatus();
  return `${cabecalho('Meu perfil')}
  <div class="perfil-grade">
    <section class="card perfil-id">
      <label class="perfil-foto" title="Trocar foto">${avatar(u, 96)}<span>${ic('imagem')}</span><input type="file" accept="image/*" data-change="trocarFoto" hidden></label>
      <div class="acoes-linha centro" style="margin:10px 0 0">
        <label class="btn btn-peq">${ic('imagem')}<span>${u.foto ? 'Trocar foto' : 'Adicionar foto'}</span><input type="file" accept="image/*" data-change="trocarFoto" hidden></label>
        ${u.foto ? btn('Remover', 'removerFoto', { classe: 'btn-peq btn-perigo-txt', icone: 'lixeira' }) : ''}</div>
      <h3>${esc(u.nome)}</h3><p class="mudo">${esc(u.email)}</p>
      <div class="linha-chk centro"><span class="pill">${TIPOS_USUARIO[u.tipo]}</span>${u.cargo ? cargoBadge(u.cargo) : ''}</div>
      <p class="mudo pequeno">Login rápido: <code>${esc(u.username || '—')}</code></p>
      <div class="perfil-form">${campo('Titulação', `<input id="pf-tit" value="${esc(u.titulacao || '')}">`)}${campo('Vínculo', `<input id="pf-vinc" value="${esc(u.vinculo || '')}">`)}${btn('Salvar dados', 'salvarPerfil', { classe: 'btn-peq' })}</div>
    </section>

    <section class="card">
      <h4>${ic('estrela')} Eixos que eu sigo</h4>
      <p class="mudo">Você recebe avisos de tudo que for publicado nesses eixos (fórum, casos, projetos, oportunidades, estágios e aulas).</p>
      ${eixoPicker('pf-eixos', u.eixosSeguidos || [])}
      <div class="acoes-linha esq">${btn('Salvar eixos', 'salvarEixos', { classe: 'btn-peq btn-pri' })}</div>
    </section>

    <section class="card">
      <h4>${ic('sino')} Notificações</h4>
      <div class="push-box push-${status}">
        ${status === 'granted' ? `${ic('concluido')}<div><b>Notificações ativadas neste dispositivo.</b><small>${DEMO_MODE ? 'Modo demonstração: avisos locais.' : 'Você receberá avisos mesmo com o app fechado.'}</small></div>${btn('Reativar', 'ativarPush', { classe: 'btn-peq' })}`
        : status === 'denied' ? `${ic('alerta')}<div><b>Bloqueadas no navegador.</b><small>Libere em Configurações do site → Notificações.</small></div>`
        : status === 'indisponivel' ? `${ic('info')}<div><b>Indisponível neste navegador.</b><small>No iPhone, instale o app (Compartilhar → Tela de Início) e abra por ele.</small></div>`
        : `${ic('sino')}<div><b>Receba avisos no celular</b><small>Novas oportunidades, estágio amanhã, caso da semana, reuniões, menções…</small></div>${btn('Ativar', 'ativarPush', { classe: 'btn-pri btn-peq' })}`}
      </div>
      <div class="prefs">${PREFS_NOTIF.map(p => `<label class="pref"><span><b>${esc(p.nome)}</b><small>${esc(p.desc)}</small></span><input type="checkbox" class="switch" data-change="pref" data-id="${p.id}" ${prefs[p.id] ? 'checked' : ''}></label>`).join('')}</div>
    </section>

    ${assina ? `<section class="card" id="sec-assinatura">
      <h4>${ic('caneta')} Assinatura eletrônica</h4>
      <p class="mudo">Aplicada nos certificados que você assinar. Desenhe com o dedo/mouse ou envie uma imagem (fundo branco ou transparente).</p>
      ${assinaturaAtual ? `<div class="assin-atual"><img src="${esc(assinaturaAtual)}" alt="Assinatura atual"><small>Assinatura atual</small></div>` : ''}
      <canvas id="assin-canvas" class="assin-canvas" width="600" height="200"></canvas>
      <div class="acoes-linha esq">${btn('Limpar', 'limparAssin', { classe: 'btn-peq' })}<label class="btn btn-peq">${ic('subir')}<span>Enviar imagem</span><input type="file" accept="image/*" data-change="imgAssin" hidden></label>${btn('Salvar assinatura', 'salvarAssin', { classe: 'btn-peq btn-pri' })}</div>
    </section>` : ''}

    <section class="card">
      <h4>${ic('cadeado')} Segurança</h4>
      ${linhaCampos(campo('Senha atual', '<input type="password" id="pf-senha-atual" autocomplete="current-password">'), campo('Nova senha', '<input type="password" id="pf-senha-nova" minlength="6" autocomplete="new-password">'))}
      <div class="acoes-linha esq">${btn('Alterar senha', 'alterarSenha', { classe: 'btn-peq' })}</div>
    </section>

    <section class="card">
      <h4>${ic('instalar')} App no celular</h4>
      <p class="mudo">Instale o portal como aplicativo, com o ícone da LACMES na tela inicial.</p>
      <div class="acoes-linha esq">${btn('Instalar app', 'instalarApp', { classe: 'btn-peq btn-pri', icone: 'instalar' })}${btn('Sair da conta', 'sair', { classe: 'btn-peq btn-perigo-txt', icone: 'sair' })}</div>
    </section>
  </div>`;
}

acao('trocarFoto', async (d, input) => {
  const f = input.files[0]; input.value = '';
  if (!f) return;
  if (!/^image\//.test(f.type)) { toast('Escolha uma imagem (JPG, PNG…).', 'erro'); return; }
  toast('Enviando foto…', 'info', 1500);
  try { const url = await enviarArquivo(f, 'avatares', { imagemMax: 360 }); await Data.update(`usuarios/${S.uid}`, { foto: url }); toast('Foto atualizada.', 'ok'); }
  catch (e) { toast(e.message, 'erro'); }
});
acao('removerFoto', async () => { await Data.update(`usuarios/${S.uid}`, { foto: '' }); toast('Foto removida.', 'ok'); });
acao('salvarPerfil', async () => { await Data.update(`usuarios/${S.uid}`, { titulacao: val('pf-tit'), vinculo: val('pf-vinc') }); toast('Dados salvos.', 'ok'); });
acao('salvarEixos', async () => { await Data.update(`usuarios/${S.uid}`, { eixosSeguidos: lerEixos('pf-eixos') }); toast('Eixos atualizados.', 'ok'); });
acao('pref', ({ id }, el) => Data.update(`usuarios/${S.uid}`, { [`notifPrefs.${id}`]: el.checked }));
acao('ativarPush', async () => { await ativarPush(); rerender(); });
acao('alterarSenha', async () => {
  const a = document.getElementById('pf-senha-atual').value, n = document.getElementById('pf-senha-nova').value;
  if (n.length < 6) { toast('A nova senha precisa ter 6+ caracteres.', 'erro'); return; }
  try { await Data.auth.alterarSenha(a, n); toast('Senha alterada.', 'ok'); document.getElementById('pf-senha-atual').value = document.getElementById('pf-senha-nova').value = ''; }
  catch (e) { toast(/wrong-password|invalid-credential/.test(e.code || e.message) ? 'Senha atual incorreta.' : e.message, 'erro'); }
});

let desenhou = false;
function prepararCanvas(cv) {
  if (!cv || cv._ok) return; cv._ok = true; desenhou = false;
  const g = cv.getContext('2d');
  g.lineWidth = 3.2; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#12375c';
  let ativo = false, ult = null;
  const pos = (e) => { const r = cv.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return [(t.clientX - r.left) * cv.width / r.width, (t.clientY - r.top) * cv.height / r.height]; };
  const ini = (e) => { e.preventDefault(); ativo = true; ult = pos(e); };
  const mov = (e) => { if (!ativo) return; e.preventDefault(); const p = pos(e); g.beginPath(); g.moveTo(...ult); g.lineTo(...p); g.stroke(); ult = p; desenhou = true; };
  const fim = () => { ativo = false; };
  cv.addEventListener('pointerdown', ini); cv.addEventListener('pointermove', mov); window.addEventListener('pointerup', fim);
  cv.style.touchAction = 'none';
}
acao('limparAssin', () => { const cv = document.getElementById('assin-canvas'); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); desenhou = false; });
acao('imgAssin', async (d, input) => {
  const f = input.files[0]; if (!f) return;
  const cv = document.getElementById('assin-canvas'); const g = cv.getContext('2d');
  const img = new Image(); img.onload = () => { g.clearRect(0, 0, cv.width, cv.height); const k = Math.min(cv.width / img.width, cv.height / img.height); g.drawImage(img, (cv.width - img.width * k) / 2, (cv.height - img.height * k) / 2, img.width * k, img.height * k); desenhou = true; URL.revokeObjectURL(img.src); };
  img.src = URL.createObjectURL(f);
});
acao('salvarAssin', async () => {
  if (!desenhou) { toast('Desenhe ou envie sua assinatura primeiro.', 'erro'); return; }
  const cv = document.getElementById('assin-canvas');
  const img = cv.toDataURL('image/png');
  await Data.set(`assinaturas/${S.uid}`, { img, em: Date.now() });
  assinaturaAtual = img; resetarCacheAssinatura(); toast('Assinatura salva.', 'ok'); rerender();
});

export default {
  titulo: 'Meu perfil', render,
  montar(view, params) {
    prepararCanvas(view.querySelector('#assin-canvas'));
    if (params[0] === 'assinatura') setTimeout(() => view.querySelector('#sec-assinatura')?.scrollIntoView({ behavior: 'smooth' }), 100);
  }
};
