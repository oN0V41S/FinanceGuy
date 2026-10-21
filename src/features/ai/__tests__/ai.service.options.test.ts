import { AiService } from '../ai.service';

describe('AiService.ask — opções', () => {
  it('envia histórico antes e perfil junto da pergunta atual', async () => {
    const complete = jest.fn().mockResolvedValue({ text: 'r', stopReason: 'end_turn' });
    const service = new AiService({
      transactions: { getAllTransactions: jest.fn().mockResolvedValue({ data: [{ id: 't', title: 'x', amount: 1, type: 'expense', category: 'other', date: new Date(), paid: true }] }) },
      goals: { getAllGoals: jest.fn().mockResolvedValue([]) },
      investments: { getAllInvestments: jest.fn().mockResolvedValue([]) },
      categories: { findAll: jest.fn().mockResolvedValue([]) },
      llm: { complete },
      now: () => new Date('2026-10-14T12:00:00Z'),
    } as never);

    await service.ask('u1', 'Quanto gastei?', {
      profile: 'Sou freelancer',
      history: [{ role: 'user', content: 'antes' }, { role: 'assistant', content: 'resposta' }],
    });

    const { messages } = complete.mock.calls[0][0];
    expect(messages).toHaveLength(3);
    expect(messages[0]).toEqual({ role: 'user', content: 'antes' });
    expect(messages[2].content).toContain('Sou freelancer');
    expect(messages[2].content).toContain('Quanto gastei?');
  });
});
