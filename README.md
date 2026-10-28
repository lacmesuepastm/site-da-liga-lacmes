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

## 7. Certificados (lotes, CPF, assinaturas à sua escolha)

**Quem cria:** a Presidência. Os diretores só *solicitam* certificados (botão "Certificar" em aulas, projetos e estágios); os pedidos caem em **Certificados → Solicitações**.

**Novo lote** (Certificados → Novo lote):
1. **Atividade**: escolha o tipo (aula, evento/reunião, ação/extensão/pesquisa, projeto, estágio, atividade livre ou atuação como membro/diretoria) e, se quiser, selecione um item já cadastrado: título, data, local e carga horária são preenchidos, e *sugerir pela atividade* traz os participantes (e o docente como palestrante).
2. **Quem recebe**: membros da liga (CPF vem do cadastro da pessoa, em Meu perfil), a **orientadora como palestrante** (escolha o papel *Palestrante*), pessoas de fora da liga (uma a uma ou colando uma lista, "nome; CPF") e papel e carga horária de cada um.
3. **Quem assina**: você decide os nomes e títulos (até 4), que saem embaixo da linha de assinatura. Há atalhos com presidência, orientadora e diretores.
4. Escolha como entregar:
   - **Emitir digitalmente agora**: gera um PDF por pessoa (com sua assinatura cadastrada, se você for signatário), guarda e avisa os membros. Sem passar pela orientadora.
   - **Gerar PDF para assinar**: baixa um PDF único com todos os certificados. Imprima, assine, digitalize e, na página do lote, envie o PDF único assinado (separado automaticamente por página, na ordem da lista) ou o PDF assinado de cada pessoa.

**Modelo do certificado:** Times New Roman, azul, branco e amarelo, brasão da Liga, CPF, carga horária, ícones de data, local e horas, código de verificação e página pública `verificar.html` (mostra o CPF só parcialmente).

**CPF:** cada pessoa informa em *Meu perfil*; só ela e a Presidência veem (coleção `dadosPessoais`).
## 7b. Planejamento (rascunho da diretoria)

Menu **Planejamento**: a Presidência vê tudo; cada diretor vê só as categorias do seu cargo (Aula/Hands-on → Ensino · Pesquisa e Escrita → Pesquisa · Extensão → Extensão · Estágio → Estágios · Reunião → Vice/Secretaria · Evento → Comunicação e Ensino · Outro → qualquer diretor).
Cada item guarda título, categoria, eixos, docente, data/horário, local, se emite certificado, carga horária, vagas, descrição e **notas internas** (nunca publicadas). **Nada chega aos membros** até clicar em **Confirmado**: aí vira Aula, Oportunidade (pesquisa, extensão, artigo/resumo, estágio) ou compromisso na Agenda (todos ou só participantes escolhidos), e os membros são notificados.
Lembre de publicar de novo o `firestore.rules` (coleções `planejamento` e `eventosLiga`).
## 7c. Alterar/cancelar eventos, arquivos e documentos

- **Alterar ou cancelar** aula, estágio/oportunidade ou evento/reunião já confirmado: botões *Alterar* e *Cancelar* (na lista de Aulas, no Painel, no Planejamento e no detalhe da Agenda). Quem acompanha (aula: quem clicou em Acompanhar; oportunidade: inscritos e confirmados; evento: participantes ou todos) recebe notificação com o que mudou e o motivo. Cancelados saem da agenda e podem ser *Reativados* (também com aviso). **Itens ainda em Planejamento nunca geram notificação.**
- **Presidência** edita e-mail, usuário, senha e eixos de cada pessoa em *Usuários → editar*. Trocar **e-mail ou senha** de outra pessoa exige o Cloudflare Worker publicado (rota `/admin/usuario`, que usa a conta de serviço); usuário e eixos funcionam sem ele. Redeploy do Worker: `cd worker && npx wrangler deploy`.
- **Foto de perfil**: *Meu perfil → Adicionar/Trocar foto*.
- **Arquivos** (PDF, Word, Excel, PowerPoint, imagem, ZIP) em projetos/artigos (aba Arquivos), tarefas e atualizações de oportunidades; dá para citar arquivo ou pessoa com `@` no chat e marcar pessoas ao anexar. Sem Worker: até 650 KB por arquivo (guardado no Firestore); com Worker: até 15 MB (Cloudflare R2). Para arquivos grandes, use link do Google Drive.
- **Arquivos da liga**: Fórum → aba *Arquivos da liga* (editais de seleção, regimento…). Todos veem; a diretoria publica.
- **Documentos** (só Presidência e Vice/Secretaria): *Documentos-Modelos* (podem ser enviados ao chat/arquivos de um projeto ou aos arquivos da liga) e *Documentos da Liga* (arquivo ou link do Drive/Docs/Slides).
- Publique de novo o `firestore.rules` (novas coleções `anexos`, `arquivosLiga`, `documentos`).
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
js/cert.js            lotes, CPF e PDF dos certificados
js/notificar.js       caixa de notificações + push
js/pages/*.js         páginas
worker/               Cloudflare Worker
firestore.rules       regras de segurança
tools/                servidor local de teste
```

### Coleções do Firestore

`usuarios` (+ `notificacoes`, `eventos`) · `logins` · `tokens` · `assinaturas` · `projetos` (+ `mensagens`) · `forum` (+ `comentarios`, `votos`) · `oportunidades` · `aulas` · `financeiro` · `atas` · `certificados` · `lotesCert` · `dadosPessoais` · `verificacoes` · `config`

### Eixos

Clínica Médica · Cardiologia · Pneumologia · Nefrologia · Hematologia · Gastroenterologia · Infectologia · Reumatologia · Endocrinologia · Emergências · Geriatria · Neurologia — definidos em `js/dominio.js` (`EIXOS`), cada um com cor e ícone próprios. Para adicionar um eixo, inclua uma linha nessa lista.
