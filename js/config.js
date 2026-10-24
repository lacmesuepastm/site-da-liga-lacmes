// ============================================================================
// CONFIGURAÇÃO DO PORTAL LACMES
// ----------------------------------------------------------------------------
// Estes valores são PÚBLICOS (vão para o navegador de todo mundo) — é seguro
// commitá-los no GitHub. NUNCA coloque aqui a chave da conta de serviço
// (o arquivo *-firebase-adminsdk-*.json). Ela só vai para o Cloudflare Worker,
// como "secret" (veja README.md).
//
// Onde encontrar: Console do Firebase → ⚙ Configurações do projeto → Geral →
// "Seus apps" → app da Web → "Configuração do SDK" (opção "Config").
// ============================================================================

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBj_W2m0yGT04FRXvrjmYTz_VjgYTyqV68",
  authDomain: "site-da-liga.firebaseapp.com",
  projectId: "site-da-liga",
  storageBucket: "site-da-liga.firebasestorage.app",
  messagingSenderId: "688200256618",
  appId: "1:688200256618:web:2951179bc44aadf1fd4e13"
};

// Cloud Messaging → "Certificados push da Web" → gerar par de chaves → copiar a chave pública.
export const VAPID_KEY = "BFIcF85OaVS4_PHhM0fzyieona62WVyxLCcfmPzeMipP64LNdfVLNA2l0SZcerHGbPD_ArTqjS49OU5aJqO2s3w";

// URL do Cloudflare Worker (pasta /worker). Ex.: "https://api.lacmes.com.br"
// Sem ele o portal funciona, mas: (1) não há notificações push com o app fechado,
// (2) imagens são comprimidas e guardadas direto no Firestore, (3) PDFs de
// certificados ficam no Firestore (limite ~1 MB por arquivo).
export const WORKER_URL = "";

// Endereço público do site (usado no código de verificação impresso nos certificados).
export const SITE_URL = "https://lacmesuepastm.github.io/site-da-liga-lacmes";

// Se a configuração do Firebase estiver vazia, o portal abre em MODO DEMONSTRAÇÃO:
// tudo fica salvo só neste navegador (localStorage), com usuários de exemplo.
export const DEMO_MODE = !FIREBASE_CONFIG.apiKey || new URLSearchParams(location.search).has("demo");
