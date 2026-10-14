// A config de segmento precisa ser literal neste arquivo (o Next não reconhece re-export).
export const runtime = 'nodejs';

export { GET, POST } from '@/features/ai/api/session.route';
