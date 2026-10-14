/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

const mockConsume = jest.fn();
const mockAsk = jest.fn();
const mockSession = {
  getProfile: jest.fn(),
  getOrCreateActive: jest.fn(),
  getLlmHistory: jest.fn(),
  ensureTitle: jest.fn(),
};
const mockAgent = { propose: jest.fn(), recordTurn: jest.fn() };

jest.mock('@/core/container', () => ({
  aiRateLimiter: { consume: (...a: unknown[]) => mockConsume(...a) },
  aiService: { ask: (...a: unknown[]) => mockAsk(...a) },
  get aiSessionService() {
    return mockSession;
  },
  get aiAgent() {
    return mockAgent;
  },
}));

import { POST } from '../route';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/ai/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-user-id': 'user-1' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/ai/ask — perfil, histórico e título', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsume.mockResolvedValue({ allowed: true });
    mockAsk.mockResolvedValue({ answer: 'ok', truncated: false });
    mockAgent.propose.mockResolvedValue(null);
    mockAgent.recordTurn.mockResolvedValue('s1');
    mockSession.getProfile.mockResolvedValue('Quero poupar');
    mockSession.getOrCreateActive.mockResolvedValue({ sessionId: 's1' });
    mockSession.getLlmHistory.mockResolvedValue([{ role: 'user', content: 'antes' }]);
    mockSession.ensureTitle.mockResolvedValue(undefined);
  });

  it('envia perfil e histórico ao serviço e gera título após o turno', async () => {
    const res = await POST(makeRequest({ question: 'Quanto gastei?' }));
    expect(res.status).toBe(200);
    expect(mockAsk).toHaveBeenCalledWith('user-1', 'Quanto gastei?', {
      profile: 'Quero poupar',
      history: [{ role: 'user', content: 'antes' }],
    });
    expect(mockSession.ensureTitle).toHaveBeenCalledWith('user-1', 's1');
    expect((await res.json()).sessionId).toBe('s1');
  });

  it('usa o sessionId pedido ao carregar o histórico', async () => {
    await POST(makeRequest({ question: 'oi', sessionId: 'abc' }));
    expect(mockSession.getOrCreateActive).not.toHaveBeenCalled();
    expect(mockSession.getLlmHistory).toHaveBeenCalledWith('user-1', 'abc');
  });

  it('falha em perfil/histórico não derruba a resposta', async () => {
    mockSession.getProfile.mockRejectedValue(new Error('db'));
    mockSession.getLlmHistory.mockRejectedValue(new Error('db'));
    const res = await POST(makeRequest({ question: 'oi' }));
    expect(res.status).toBe(200);
    expect(mockAsk).toHaveBeenCalledWith('user-1', 'oi', { profile: '', history: [] });
  });

  it('gera título também quando o agente propõe ações', async () => {
    mockAgent.propose.mockResolvedValue({ kind: 'actions', answer: 'x', sessionId: 's9', actions: [] });
    await POST(makeRequest({ question: 'crie uma despesa' }));
    expect(mockSession.ensureTitle).toHaveBeenCalledWith('user-1', 's9');
    expect(mockAsk).not.toHaveBeenCalled();
  });
});
