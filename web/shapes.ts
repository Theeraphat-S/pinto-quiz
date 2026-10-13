// Answer shapes replace the A–D letters everywhere, so a player can match their button to the big screen
// by shape as well as colour (colour-blind players, glare on a projector).
const PATHS = [
  '<path d="M12 3.5 21.5 20h-19Z"/>',
  '<path d="M12 2.5 21.5 12 12 21.5 2.5 12Z"/>',
  '<circle cx="12" cy="12" r="9.5"/>',
  '<rect x="3" y="3" width="18" height="18" rx="2"/>',
];
export const SHAPE_NAMES = ['สามเหลี่ยม', 'ข้าวหลามตัด', 'วงกลม', 'สี่เหลี่ยม'];
export const shape = (i: number) => `<svg class="shape" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="${SHAPE_NAMES[i]}" focusable="false">${PATHS[i]}</svg>`;
