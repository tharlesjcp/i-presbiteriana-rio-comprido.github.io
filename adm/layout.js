// adm/layout.js

// Carregar o Header
fetch("includes/header.html")
  .then(res => res.text())
  .then(data => {
    const headerContainer = document.getElementById("header-container");
    if (headerContainer) {
      headerContainer.innerHTML = data;

      // Função de Toggle para o menu
      window.toggleSidebar = function() {
        const menu = document.querySelector(".menu");
        menu.classList.toggle("active");
      };

      // Função de Logout (pode ser ajustada conforme seu auth)
      window.logout = function() {
        if (confirm("Deseja realmente sair?")) {
          // Aqui você pode limpar tokens ou redirect
          window.location.href = "login.html";
        }
      };
    }
  });
