// js/layout.js

// Carrega o header
fetch("includes/header.html")
  .then(response => response.text())
  .then(data => {
    const headerContainer = document.getElementById("header-container");
    if (headerContainer) {
      headerContainer.innerHTML = data;
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
