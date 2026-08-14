const normalize = (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/(\d)([a-z])/g, '$1 $2').replace(/[^a-z0-9]+/g, ' ').trim();
const input = document.querySelector('[data-hymnal-search]');
const items = [...document.querySelectorAll('[data-search]')];
const statusElement = document.querySelector('[data-search-status]');
const empty = document.querySelector('[data-empty]');
const filter = () => {
  const query = normalize(input?.value || '');
  let visible = 0;
  items.forEach((item) => {
    const show = !query || normalize(item.dataset.search).includes(query);
    item.hidden = !show;
    if (show) visible++;
  });
  if (statusElement) statusElement.textContent = `${visible} ${visible === 1 ? 'hino encontrado' : 'hinos encontrados'}`;
  if (empty) empty.hidden = visible !== 0;
};
input?.addEventListener('input', filter);
// A camada de partitura usará abcjs quando os direitos permitirem publicar o ABC.
