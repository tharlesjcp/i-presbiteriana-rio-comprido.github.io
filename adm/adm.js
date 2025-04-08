import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Inicializa o Firebase (caso não tenha sido inicializado)
let app;
try {
  app = getApp();
} catch (e) {
  app = initializeApp({
    apiKey: "AIzaSyDBGSkPI0ewwsTTyEjjPyhpC_G_F3bHQME",
    authDomain: "iprc-site.firebaseapp.com",
    projectId: "iprc-site",
    storageBucket: "iprc-site.appspot.com",
    messagingSenderId: "361636783794",
    appId: "1:361636783794:web:5cd92ca9ef04449fdd4bab"
  });
}

const auth = getAuth(app);

// Protege páginas do painel (exceto login)
if (!window.location.pathname.includes("login.html")) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html";
    }
  });
}

// Login
window.login = async function () {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    window.location.href = "dashboard.html";
  } catch (error) {
    const erro = document.getElementById("erro");
    if (erro) erro.textContent = "❌ " + (error.message || "Erro ao fazer login.");
    else alert("Erro: " + error.message);
  }
};

// Logout
window.logout = async function () {
  await signOut(auth);
  window.location.href = "login.html";
};
