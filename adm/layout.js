document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;
  const basePath = path.includes("/adm/") ? "includes/header.html" : "adm/includes/header.html";

  fetch(basePath)
    .then(response => response.text())
    .then(data => {
      document.body.insertAdjacentHTML("afterbegin", data);
    })
    .catch(error => console.error("Erro ao carregar header:", error));
});
