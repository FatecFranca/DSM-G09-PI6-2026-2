// Identidade compartilhada com web/src/estilos/tokens.css (Sprint 3).
export const colors = { bg: '#f3ebdd', paper: '#faf6ef', ink: '#5c3828', muted: '#7a5c47', primary: '#5c3828', accent: '#967052', light: '#e9dfcf', border: '#e2d6c3', danger: '#9b3b2e' };
export const fonts = { heading: 'Fraunces', italic: 'FrauncesItalic', body: 'Inter', medium: 'InterMedium', strong: 'InterSemiBold' };
export const coverColors = ['#5C3828', '#7A5038', '#4A2C1F'];
export const coverColor = (id: number) => coverColors[Math.abs(id) % coverColors.length];
