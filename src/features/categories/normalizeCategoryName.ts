/**
 * Normaliza o nome de uma categoria para comparação de unicidade:
 * trim, colapsa espaços, remove acentos (NFD) e converte para minúsculas.
 */
export function normalizeCategoryName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
