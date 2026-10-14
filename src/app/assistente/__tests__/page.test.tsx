import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AssistentePage from '../page';

jest.mock('next/navigation', () => ({
  usePathname: () => '/assistente',
}));

jest.mock('@/features/dashboard/components/HeaderLayout', () => ({
  HeaderLayout: () => <header data-testid="header">Header</header>,
}));

jest.mock('@/features/dashboard/components/MobileNavBar', () => ({
  MobileNavBar: () => <nav data-testid="mobile-navbar">MobileNavBar</nav>,
}));

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}

function submit(question: string) {
  fireEvent.change(screen.getByLabelText('Sua pergunta'), { target: { value: question } });
  fireEvent.click(screen.getByRole('button', { name: /perguntar/i }));
}

describe('AssistentePage', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    if (typeof global.fetch !== 'function') {
      global.fetch = jest.fn() as unknown as typeof fetch;
    }
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => fetchSpy.mockRestore());

  it('renderiza shell, estado vazio e avisos de privacidade', () => {
    render(<AssistentePage />);
    expect(screen.getByRole('heading', { name: 'Assistente' })).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-navbar')).toBeInTheDocument();
    expect(screen.getByText(/Faça uma pergunta para receber/)).toBeInTheDocument();
    expect(screen.getByText(/enviados ao\s+Google/)).toBeInTheDocument();
    expect(screen.getByText(/não oferece aconselhamento profissional/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /perguntar/i })).toBeDisabled();
  });

  it('mostra Skeleton durante o loading e depois a resposta', async () => {
    let resolve!: (r: Response) => void;
    fetchSpy.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    render(<AssistentePage />);
    submit('Quanto gastei?');

    expect(await screen.findByTestId('answer-skeleton')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();

    resolve(jsonResponse({ answer: 'Você gastou R$ 10,00', truncated: false }));
    expect(await screen.findByText('Você gastou R$ 10,00')).toBeInTheDocument();
    expect(screen.queryByTestId('answer-skeleton')).not.toBeInTheDocument();
    expect(screen.queryByText(/Faça uma pergunta para receber/)).not.toBeInTheDocument();
  });

  it('mostra aviso quando a resposta vem truncada', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ answer: 'Parcial', truncated: true }));
    render(<AssistentePage />);
    submit('oi');
    expect(await screen.findByText(/A resposta foi encurtada/)).toBeInTheDocument();
  });

  it('mostra erro do servidor em role=alert com estilo de despesa', async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({ error: 'Você atingiu o limite diário de perguntas do assistente. Volte amanhã.' }, 429),
    );
    render(<AssistentePage />);
    submit('oi');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('limite diário');
    expect(alert).toHaveClass('bg-finance-expense/10', 'text-finance-expense');
  });

  it('mostra mensagem amigável em falha de rede', async () => {
    fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<AssistentePage />);
    submit('oi');
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Não foi possível obter a resposta. Tente novamente.',
      ),
    );
  });

  it('nunca injeta HTML da resposta', async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({ answer: '<script>alert(1)</script><b>negrito</b>', truncated: false }),
    );
    const { container } = render(<AssistentePage />);
    submit('oi');
    await screen.findByTestId('chat-message-assistant');
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });

  afterEach(() => fetchSpy.mockRestore());

  it('mostra pergunta e resposta como mensagens e limpa o campo', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ answer: 'Você gastou **R$ 10,00**', truncated: false }));
    const { container } = render(<AssistentePage />);
    submit('Quanto gastei?');
    expect(await screen.findByTestId('chat-message-assistant')).toBeInTheDocument();
    expect(screen.getByTestId('chat-message-user')).toHaveTextContent('Quanto gastei?');
    expect(container.querySelector('strong')).toHaveTextContent('R$ 10,00');
    expect(screen.getByLabelText('Sua pergunta')).toHaveValue('');
  });

  it('mantém o histórico ao fazer uma nova pergunta', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ answer: 'Resposta 1', truncated: false }))
      .mockResolvedValueOnce(jsonResponse({ answer: 'Resposta 2', truncated: false }));
    render(<AssistentePage />);
    submit('Pergunta 1');
    await screen.findByText('Resposta 1');
    submit('Pergunta 2');
    await screen.findByText('Resposta 2');
    expect(screen.getByText('Pergunta 1')).toBeInTheDocument();
    expect(screen.getByText('Resposta 1')).toBeInTheDocument();
    expect(screen.getAllByTestId('chat-message-user')).toHaveLength(2);
  });

  it('Enter envia e Shift+Enter não envia', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ answer: 'ok', truncated: false }));
    render(<AssistentePage />);
    const input = screen.getByLabelText('Sua pergunta');
    fireEvent.change(input, { target: { value: 'oi' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(fetchSpy).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
  });
});
