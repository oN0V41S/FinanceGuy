export const getYearOptions = (): number[] => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2];
};

export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    // Adiciona 1 dia para corrigir problemas de fuso horário na exibição
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString('pt-BR');
};

/**
 * Formata uma data ISO (YYYY-MM-DD, ou ISO completo) como DD/MM/AAAA.
 * Não usa `new Date('YYYY-MM-DD')` (interpretado como UTC e recuaria um dia).
 * Se o texto não for uma data reconhecível, devolve o original.
 */
export const formatDateBR = (isoYmd: string): string => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoYmd);
    if (!match) return isoYmd;
    return `${match[3]}/${match[2]}/${match[1]}`;
};

/**
 * Interpreta um texto como valor monetário em reais (ex.: "300", "300,00",
 * "R$ 5.000,00"). Retorna null quando o texto não parece um número.
 */
export const parseBRL = (input: string): number | null => {
    const cleaned = input.replace(/r\$/gi, '').replace(/\s/g, '');
    if (!/^\d[\d.,]*$/.test(cleaned)) return null;
    let normalized = cleaned;
    if (cleaned.includes(',')) {
        normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
        normalized = cleaned.replace(/\./g, '');
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};
