// A config de segmento precisa ser literal neste arquivo (o Next não reconhece re-export).
export const runtime = 'nodejs';

export { GET, PUT } from '@/features/ai/api/profile.route';
