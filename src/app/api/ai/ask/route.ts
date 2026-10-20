// A config de segmento precisa ser literal neste arquivo (o Next não reconhece re-export).
export const runtime = 'nodejs';
export const maxDuration = 60;

export { POST } from '@/features/ai/api/route';
