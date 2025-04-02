// js/layout.js

// Carrega o header
fetch("includes/header.html")
  .then(response => response.text())
  .then(data => {
    const headerContainer = document.getElementById("header-container");
    if (headerContainer) {
      headerContainer.innerHTML = data;

      // Ativa o menu hamburguer após carregar o header
      const menuToggle = document.querySelector(".menu-toggle");
      const nav = document.querySelector(".menu-superior nav");

      if (menuToggle && nav) {
        menuToggle.addEventListener("click", () => {
          nav.classList.toggle("active");
        });
      }
    }
  });

// Carrega o footer
fetch("includes/footer.html")
  .then(response => response.text())
  .then(data => {
    const footerContainer = document.getElementById("footer-container");
    if (footerContainer) {
      footerContainer.innerHTML = data;
    }
  });
