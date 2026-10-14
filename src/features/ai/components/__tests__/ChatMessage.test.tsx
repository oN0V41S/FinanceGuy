import { render, screen } from '@testing-library/react';
import { ChatMessage } from '../ChatMessage';

describe('ChatMessage', () => {
  it('pergunta do usuário é texto puro alinhado à direita', () => {
    const { container } = render(
      <ChatMessage message={{ id: '1', role: 'user', content: '<b>oi</b> **x**' }} />,
    );
    expect(screen.getByTestId('chat-message-user')).toHaveTextContent('<b>oi</b> **x**');
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('strong')).toBeNull();
  });

  it('resposta do assistente é renderizada como markdown', () => {
    const { container } = render(
      <ChatMessage message={{ id: '2', role: 'assistant', content: 'Total **R$ 5,00**', truncated: false }} />,
    );
    expect(screen.getByTestId('chat-message-assistant')).toBeInTheDocument();
    expect(container.querySelector('strong')).toHaveTextContent('R$ 5,00');
    expect(screen.queryByText(/foi encurtada/i)).not.toBeInTheDocument();
  });

  it('mostra aviso quando a resposta foi truncada', () => {
    render(<ChatMessage message={{ id: '3', role: 'assistant', content: 'ok', truncated: true }} />);
    expect(screen.getByText(/A resposta foi encurtada/)).toBeInTheDocument();
  });
});
