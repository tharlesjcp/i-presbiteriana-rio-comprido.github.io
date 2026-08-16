async function carregarFragmento(url, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Falha ao carregar ${url}`);
    container.innerHTML = await response.text();
  } catch (error) {
    console.error(error);
    container.innerHTML = '<p class="aviso-layout" role="status">Parte da navegação não pôde ser carregada.</p>';
  }
}

function inicializarHeader() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.menu-principal');
  if (!toggle || !nav) return;

  const fecharMenu = () => {
    nav.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.querySelector('.sr-only').textContent = 'Abrir menu principal';
  };

  toggle.addEventListener('click', () => {
    const aberto = toggle.getAttribute('aria-expanded') === 'true';
    nav.classList.toggle('active', !aberto);
    toggle.setAttribute('aria-expanded', String(!aberto));
    toggle.querySelector('.sr-only').textContent = aberto ? 'Abrir menu principal' : 'Fechar menu principal';
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      fecharMenu();
      toggle.focus();
    }
  });

  const pagina = location.pathname.split('/').pop() || 'index.html';
  nav.querySelectorAll('a').forEach(link => {
    if (link.getAttribute('href') === pagina) link.setAttribute('aria-current', 'page');
  });
}

async function inicializarLayout() {
  await carregarFragmento('includes/header.html', 'header-container');
  inicializarHeader();
  await carregarFragmento('includes/footer.html', 'footer-container');
  const ano = document.getElementById('ano-atual');
  if (ano) ano.textContent = new Date().getFullYear();
}

inicializarLayout();
