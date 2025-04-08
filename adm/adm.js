const firebaseConfig = {
  apiKey: "AIzaSyDBGSkPI0ewwsTTyEjjPyhpC_G_F3bHQME",
  authDomain: "iprc-site.firebaseapp.com",
  projectId: "iprc-site",
  storageBucket: "iprc-site.appspot.com",
  messagingSenderId: "361636783794",
  appId: "1:361636783794:web:5cd92ca9ef04449fdd4bab"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);

// Protege todas as páginas do painel (exceto login)
firebase.auth().onAuthStateChanged((user) => {
  const isLoginPage = window.location.pathname.includes("login.html");

  if (!user && !isLoginPage) {
    window.location.href = "login.html";
  }
  if (user && isLoginPage) {
    window.location.href = "dashboard.html";
  }
});

// Login (usado em login.html)
function login() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("password").value;

  firebase.auth().signInWithEmailAndPassword(email, senha)
    .then(() => {
      window.location.href = "dashboard.html";
    })
    .catch(error => {
      alert("Erro ao fazer login: " + error.message);
    });
}

// Logout (usado no header.html)
function logout() {
  firebase.auth().signOut().then(() => {
    window.location.href = "login.html";
  });
}
