# Portal LACMES

Portal da **Liga Acadêmica de Clínica Médica de Santarém** — fórum, casos clínicos, projetos, oportunidades/estágios, agenda, aulas, certificados e financeiro.

| Camada | Serviço | Custo |
|---|---|---|
| Site (HTML/CSS/JS estático) | **GitHub Pages** | grátis |
| Login, banco de dados em tempo real, cache offline | **Firebase** Auth + Firestore (plano Spark) | grátis |
| Domínio, HTTPS, API de push, arquivos (R2), lembretes diários | **Cloudflare** DNS + Worker + R2 | grátis nos limites de uma liga |

> O antigo `Code.gs` (Apps Script + Planilha + Drive) foi totalmente substituído:
> `obterEstadoRemoto/salvarEstadoRemoto` → Firestore em tempo real · `salvarCertificadoPDF` (Drive) → PDF gerado no navegador + Cloudflare R2 · polling de 4 s → listeners do Firestore.

---

## ⚠️ Segurança primeiro

O arquivo `site-da-liga-firebase-adminsdk-*.json` é a **chave mestra** do projeto Firebase.

- **Nunca** coloque esse arquivo no GitHub (o `.gitignore` já bloqueia `*adminsdk*.json`).
- Ele vai **apenas** para o Cloudflare Worker, como segredo (`wrangler secret put`).
- Como ele já foi compartilhado fora do Console, **gere uma chave nova e apague a antiga**:
  Console do Firebase → ⚙ Configurações do projeto → Contas de serviço → *Gerar nova chave privada*; depois, no Google Cloud Console → IAM → Contas de serviço → `firebase-adminsdk-…` → Chaves → excluir a chave `037c652f…`.

O site usa só a **configuração Web** (`apiKey`, `appId`…), que é pública por natureza — quem protege os dados são as regras do `firestore.rules`.

---

## 1. Testar no computador (modo demonstração)

Com o `js/config.js` vazio, o portal abre em **modo demonstração**: tudo fica no navegador, com usuários de exemplo.

```bash
node tools/servidor-local.mjs
```

Abra `http://localhost:5173` e entre como `presidencia` / `lacmes2026` (Presidência), `joao.pedro` / `pesquisa123` (Diretor de Pesquisa), `pedro.henrique` / `membro123` (membro) ou `orientadora` / `orienta123` (orientadora). Para recomeçar do zero no modo demo, apague os dados do site no navegador.

---

## 2. Firebase

1. [console.firebase.google.com](https://console.firebase.google.com) → projeto **site-da-liga**.
2. **Authentication** → *Começar* → *Método de login* → ative **E-mail/senha**.
3. **Firestore Database** → *Criar banco* → modo **produção** → região `southamerica-east1` (São Paulo).
4. **Regras**: copie o conteúdo de [`firestore.rules`](firestore.rules) para a aba *Regras* e publique
   (ou, com a Firebase CLI: `firebase deploy --only firestore:rules`).
5. **App Web**: ⚙ Configurações do projeto → *Seus apps* → ícone `</>` → registre "LACMES Web" → copie o objeto `firebaseConfig` para [`js/config.js`](js/config.js).
6. **Push**: ⚙ Configurações → *Cloud Messaging* → *Certificados push da Web* → *Gerar par de chaves* → cole em `VAPID_KEY` no `js/config.js`.
7. **Domínios autorizados**: Authentication → Configurações → *Domínios autorizados* → adicione `lacmesuepastm.github.io` e o seu domínio (ex.: `lacmes.com.br`, `www.lacmes.com.br`).

---

## 3. GitHub Pages

Repositório: `https://github.com/lacmesuepastm/site-da-liga-lacmes`

**Sem instalar nada:** no GitHub, *Add file → Upload files* e arraste **o conteúdo desta pasta** (não a pasta em si). Confirme que `index.html` fica na raiz do repositório.

**Com Git:**

```bash
git clone https://github.com/lacmesuepastm/site-da-liga-lacmes.git
```

Copie estes arquivos para dentro da pasta clonada e então:

```bash
git add . && git commit -m "Portal LACMES: Firebase + Cloudflare + PWA" && git push
```

Depois: repositório → **Settings → Pages** → *Source: Deploy from a branch* → `main` / `(root)` → Save.
Em ~1 minuto o site estará em `https://lacmesuepastm.github.io/site-da-liga-lacmes/`.

---

## 4. Domínio próprio pelo Cloudflare

1. Cloudflare → *Add a site* → seu domínio → plano Free → troque os **nameservers** no registro.br (ou onde comprou) pelos que o Cloudflare indicar.
2. **DNS** do Cloudflare:
   - `CNAME` · `www` → `lacmesuepastm.github.io`
   - `A` · `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - Deixe a nuvem **cinza (DNS only)** até o GitHub emitir o certificado.
3. No repositório, edite o arquivo [`CNAME`](CNAME.exemplo): renomeie `CNAME.exemplo` → `CNAME` com o domínio (ex.: `www.lacmes.com.br`).
4. GitHub → Settings → Pages → *Custom domain* → `www.lacmes.com.br` → aguarde → marque **Enforce HTTPS**.
5. (Opcional) Agora pode ligar a nuvem **laranja** (proxy) — em *SSL/TLS* escolha **Full**.
6. Atualize `SITE_URL` em `js/config.js` para `https://www.lacmes.com.br` (vai impresso nos certificados) e adicione o domínio nos *Domínios autorizados* do Firebase.

---

## 5. Cloudflare Worker (push, arquivos e lembretes)

O Worker em [`worker/`](worker/) faz o que o navegador não pode fazer sozinho com segurança:
envia notificações push (FCM), guarda arquivos no R2 e, todo dia às 18 h, avisa quem tem **estágio, aula, reunião, escala ou prazo no dia seguinte**.

```bash
cd worker
npx wrangler login
npx wrangler r2 bucket create lacmes-arquivos
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT
npx wrangler deploy
```

No `secret put`, cole o **conteúdo inteiro** do JSON da conta de serviço (o novo, gerado após a rotação).

Depois:

1. Em `worker/wrangler.toml`, ajuste `ALLOWED_ORIGINS` (endereços do site) e, se quiser `api.seudominio`, descomente `routes` e preencha `PUBLIC_URL`; rode `npx wrangler deploy` de novo.
2. Copie a URL do Worker (ex.: `https://lacmes-api.SEU-USUARIO.workers.dev` ou `https://api.lacmes.com.br`) para `WORKER_URL` em `js/config.js` e publique no GitHub.

Sem o Worker o portal funciona, mas: não há push com o app fechado (só avisos com o portal aberto), imagens ficam comprimidas dentro do Firestore e PDFs de certificado ficam no Firestore (até ~1 MB cada).

---

## 6. Primeiro acesso e importação do sistema antigo

1. Abra o site → aparece **"Primeiro acesso"** → crie a conta da **Presidência** (vira administradora).
2. **Usuários → Importar do sistema antigo**: no Apps Script antigo, execute `Logger.log(obterEstadoRemoto())`, copie o JSON e cole na tela de importação → *Analisar* → *Importar*.
   Usuários são recriados no Firebase **com as mesmas senhas** (senhas com menos de 6 caracteres ganham o prefixo `lacmes` — a lista aparece no final). Projetos, chats, tarefas, escalas, oportunidades, aulas, mural (vira Fórum), financeiro, atas, agendas e certificados são convertidos.
3. Cadastre a orientadora em **Usuários → Novo usuário** com o nível **Orientador(a)** e escolha-a em **Certificados → Gestão → Assinantes**.

---

## 7. Fluxo dos certificados

```
Diretoria solicita  →  Presidência assina  →  Orientador(a) assina  →  PDF emitido + código de verificação
                  (devolver com motivo em qualquer etapa → corrigir → reenviar)
```

- **Assinatura eletrônica**: Presidência e orientadores desenham/enviam a assinatura uma vez em *Meu perfil → Assinatura*. Ao assinar em lote, o PDF final é gerado no navegador com as duas assinaturas, guardado (R2 ou Firestore) e o membro é notificado.
- **Fluxo manual** (orientador sem conta, ou assinatura física): em cada etapa, *Enviar PDF assinado à mão*.
- **Verificação pública**: todo certificado tem um código `LAC-XXXX-XXXX` e o link `verificar.html?c=…`.
- **O membro acompanha** cada etapa em tempo real em *Certificados*.
- Origem das cargas: aulas (com chamada), estágios (com presença), projetos concluídos e emissão para membros/diretoria (carga sugerida automaticamente).

---

## 8. App no celular (PWA) e notificações

- **Android / Chrome / Edge**: menu → *Instalar app* (ou botão **Instalar app** no portal).
- **iPhone (iOS 16.4+)**: Safari → Compartilhar → *Adicionar à Tela de Início* → abra pelo ícone → *Meu perfil → Ativar notificações*.
- Cada pessoa escolhe em *Meu perfil* o que quer receber: novas oportunidades, estágio no dia seguinte, eixos que segue, caso clínico da semana, fórum, reuniões, menções/tarefas, aulas e certificados.
- Ao publicar mudanças grandes, aumente `VERSAO` em `sw.js` para os celulares baixarem a versão nova.

---

## 9. Estrutura

```
index.html            casca do app (login, menu, topo, barra inferior no celular)
verificar.html        verificação pública de certificados
manifest.webmanifest  PWA (ícone da LACMES)
sw.js                 service worker (offline + push)
css/app.css           visual (Poppins, linhas, animações)
js/config.js          ← configuração do Firebase / Worker
js/data.js            camada de dados (Firebase ou demonstração)
js/store.js           estado em tempo real
js/dominio.js         eixos, categorias, cargos e permissões
js/editor.js          editor (negrito, itálico, sublinhado, imagens) e @menções
js/cert.js            fluxo e PDF dos certificados
js/notificar.js       caixa de notificações + push
js/pages/*.js         páginas
worker/               Cloudflare Worker
firestore.rules       regras de segurança
tools/                servidor local de teste
```

### Coleções do Firestore

`usuarios` (+ `notificacoes`, `eventos`) · `logins` · `tokens` · `assinaturas` · `projetos` (+ `mensagens`) · `forum` (+ `comentarios`, `votos`) · `oportunidades` · `aulas` · `financeiro` · `atas` · `certificados` · `certificados_pdf` · `verificacoes` · `config`

### Eixos

Clínica Médica · Cardiologia · Pneumologia · Nefrologia · Hematologia · Gastroenterologia · Infectologia · Reumatologia · Endocrinologia · Emergências · Geriatria · Neurologia — definidos em `js/dominio.js` (`EIXOS`), cada um com cor e ícone próprios. Para adicionar um eixo, inclua uma linha nessa lista.
