export const MEMBER_COLORS = [
  '#FF3B30', // Rouge
  '#FF9500', // Orange
  '#FFCC00', // Jaune
  '#34C759', // Vert
  '#00C7BE', // Turquoise
  '#007AFF', // Bleu
  '#5856D6', // Violet
  '#AF52DE', // Mauve
  '#FF2D55', // Rose
  '#A2845E', // Marron
];

export function getRandomColor(): string {
  const index = Math.floor(Math.random() * MEMBER_COLORS.length);
  return MEMBER_COLORS[index];
}
