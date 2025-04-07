
const firebaseConfig = {
  apiKey: "AIzaSyDBGSkPI0ewwsTTyEjjPyhpC_G_F3bHQME",
  authDomain: "iprc-site.firebaseapp.com",
  projectId: "iprc-site",
  storageBucket: "iprc-site.appspot.com",
  messagingSenderId: "361636783794",
  appId: "1:361636783794:web:5cd92ca9ef04449fdd4bab"
};


firebase.initializeApp(firebaseConfig);

// Protege as páginas do painel
firebase.auth().onAuthStateChanged((user) => {
  if (!user && !window.location.pathname.includes("login.html")) {
    window.location.href = "login.html";
  }
});

function login() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("password").value;
  firebase.auth().signInWithEmailAndPassword(email, senha)
    .then(() => window.location.href = "dashboard.html")
    .catch(error => alert("Erro: " + error.message));
}

function logout() {
  firebase.auth().signOut().then(() => {
    window.location.href = "login.html";
  });
}
