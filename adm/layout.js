document.addEventListener("DOMContentLoaded", () => {
  fetch("includes/header.html")
    .then(response => response.text())
    .then(data => {
      const container = document.createElement("div");
      container.innerHTML = data;
      document.body.insertBefore(container, document.body.firstChild);
    });
});
