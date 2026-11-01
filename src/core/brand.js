// Shared geometry for the package SVG and the small in-app brand mark.
export const QIAODOC_MARK_SHAPES = [
  ['rect', { width: 48, height: 48, rx: 12, fill: '#075341' }],
  ['path', { d: 'M13 10h14l7 7v22H13Z', fill: '#effcf4' }],
  ['path', { d: 'M27 10v8h7Z', fill: '#bcebd2' }],
  ['path', { d: 'M18 23h10M18 28h7', fill: 'none', stroke: '#36836a', strokeWidth: 2, strokeLinecap: 'round' }],
  ['path', { d: 'M33 33c-1-6 2-10 9-11 0 7-3 11-9 11Z', fill: '#bef264' }],
  ['path', { d: 'M32 37c-7 0-10-4-10-9 7-1 11 3 10 9Z', fill: '#6ee7b7' }],
  ['path', { d: 'M35 39c0-5 3-8 8-8-1 6-4 9-8 8Z', fill: '#facc15' }],
];

export const QIAODOC_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="QiaoDoc · 乔豆文解">
${QIAODOC_MARK_SHAPES.map(([tag, attrs]) => `  <${tag} ${Object.entries(attrs).map(([key, value]) => `${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}="${value}"`).join(' ')}/>`).join('\n')}
</svg>
`;
