
const firebaseConfig = {
  // SUA CONFIG FIREBASE AQUI
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
