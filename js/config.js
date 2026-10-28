export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBj_W2m0yGT04FRXvrjmYTz_VjgYTyqV68",
  authDomain: "site-da-liga.firebaseapp.com",
  projectId: "site-da-liga",
  storageBucket: "site-da-liga.firebasestorage.app",
  messagingSenderId: "688200256618",
  appId: "1:688200256618:web:2951179bc44aadf1fd4e13"
};

export const VAPID_KEY = "BFIcF85OaVS4_PHhM0fzyieona62WVyxLCcfmPzeMipP64LNdfVLNA2l0SZcerHGbPD_ArTqjS49OU5aJqO2s3w";

export const WORKER_URL = "";

export const SITE_URL = "https://lacmesuepastm.github.io/site-da-liga-lacmes";

export const DEMO_MODE = !FIREBASE_CONFIG.apiKey || new URLSearchParams(location.search).has("demo");
