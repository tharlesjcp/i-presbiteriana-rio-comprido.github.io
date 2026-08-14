export const normalizeHymnNumber = (value) => {
  const match = String(value).trim().match(/^0*(\d+)\s*[- ]?\s*([A-Za-z])?$/);
  return match ? `${Number(match[1])}${match[2] ? `-${match[2].toUpperCase()}` : ''}` : null;
};

export const parseHymnTxt = (text) => {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const heading = (lines.shift() || '').trim();
  const match = heading.match(/^\s*(\d+)\s*([A-Za-z])?\s*-\s*(.+)$/);
  if (!match) return { error: 'cabeçalho TXT inválido' };
  const blocks = lines.join('\n').trim().split(/\n\s*\n/).filter(Boolean);
  const looksChord = (line) => /^[\s|()[\]A-G#b0-9+°ºdimajnsus\/.-]+$/.test(line) && /[A-G]/.test(line);
  const structured = blocks.map((block) => block.split('\n').map((line) => ({ text: line, type: looksChord(line) ? 'chords' : 'lyrics' })));
  const firstLine = structured.flat().find((line) => line.type === 'lyrics' && line.text.trim())?.text.trim() || null;
  return { number: normalizeHymnNumber(`${match[1]}${match[2] || ''}`), title: match[3].trim(), firstLine, blocks: structured };
};

export const parseHymnAbc = (text) => {
  const headers = {};
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z]):\s*(.*)$/);
    if (match && !headers[match[1]]) headers[match[1]] = match[2].trim();
  }
  if (!headers.X || !headers.T || !headers.K) return { error: 'ABC sem X, T ou K obrigatórios' };
  return { number: normalizeHymnNumber(headers.X), title: headers.T, key: headers.K, meter: headers.M || null, tempo: headers.Q || null, abc: text };
};
