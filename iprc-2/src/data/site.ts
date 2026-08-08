export const LEGACY_BASE = 'https://dynamic-crisp-a60f33.netlify.app';

export const navigation = [
  { label: 'Início', href: '/' },
  { label: 'Quem somos', href: '#quem-somos' },
  { label: 'Agenda', href: '#agenda' },
  { label: 'Estudos', href: '#estudos' },
  { label: 'Boletim', href: '#boletim' },
];

export const studies = [
  { title: 'Uma fé que atravessa a semana', date: '03 ago 2026', summary: 'Como a graça transforma decisões comuns, relações e o serviço ao próximo.', youtubeId: 'mock-study-1' },
  { title: 'Esperança em tempos de mudança', date: '27 jul 2026', summary: 'Um estudo sobre firmeza, oração e confiança nas promessas de Deus.', youtubeId: 'mock-study-2' },
  { title: 'Comunidade que acolhe e serve', date: '20 jul 2026', summary: 'O chamado bíblico para uma igreja presente, generosa e comprometida.', youtubeId: 'mock-study-3' },
];

export const bulletin = {
  date: 'Semana de 03 a 09 de agosto',
  title: 'Boletim semanal da IPRC',
  summary: 'Liturgia, avisos, escalas e programação da nossa comunidade reunidos em um só lugar.',
  href: `${LEGACY_BASE}/boletim.html`,
};
