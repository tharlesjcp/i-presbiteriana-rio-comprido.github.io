const dialog = document.querySelector('[data-reference-dialog]');
if (dialog) {
  const title = dialog.querySelector('[data-reference-title]');
  const text = dialog.querySelector('[data-reference-text]');
  const error = dialog.querySelector('[data-reference-error]');
  const chapterLink = dialog.querySelector('[data-reference-chapter]');
  const openLink = dialog.querySelector('[data-reference-open]');
  let trigger = null;
  const close = () => { dialog.close(); trigger?.focus(); };
  dialog.querySelector('[data-reference-close]')?.addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  document.querySelectorAll('[data-bible-reference]').forEach(button => button.addEventListener('click', async () => {
    trigger = button;
    const { book, code, chapter, start, end, label } = button.dataset;
    title.textContent = label;
    text.textContent = 'Carregando…';
    error.hidden = true;
    const target = `/biblia/${book}/${chapter}#v${start}`;
    chapterLink.href = target;
    openLink.href = target;
    dialog.showModal();
    try {
      const response = await fetch(`/bible-data/blivre/${code}/${chapter}.json`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      const selected = data.verses.filter(verse => verse.number >= Number(start) && verse.number <= Number(end || start));
      if (!selected.length) throw new Error();
      text.replaceChildren(...selected.map(verse => {
        const paragraph = document.createElement('p');
        const number = document.createElement('strong');
        number.textContent = `${verse.number} `;
        paragraph.append(number, document.createTextNode(verse.text));
        return paragraph;
      }));
    } catch {
      text.textContent = '';
      error.hidden = false;
    }
  }));
}
