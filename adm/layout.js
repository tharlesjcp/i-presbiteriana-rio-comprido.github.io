// adm/includes/layout.js

// Carrega o menu lateral
fetch("includes/header.html")
  .then(response => response.text())
  .then(data => {
    const headerContainer = document.getElementById("header-container");
    if (headerContainer) {
      headerContainer.innerHTML = data;

      // Ativa o botão de recolher o menu
      const toggleButton = document.getElementById("menu-toggle");
      const sidebar = document.querySelector(".sidebar");
      if (toggleButton && sidebar) {
        toggleButton.addEventListener("click", () => {
          sidebar.classList.toggle("active");
        });
      }
    }
  });
