/**
 * @jest-environment node
 *
 * TDD — proxy (middleware): redirecionamentos de páginas
 *
 * Contrato:
 * 1. Logado em "/" (home/landing) → redireciona para /dashboard.
 * 2. Logado em /login e /register → /dashboard (comportamento existente).
 * 3. Não logado em "/" → landing continua pública.
 * 4. Não logado em rota privada → /login.
 */
jest.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: URL) => ({ status: 307, headers: new Headers({ location: url.toString() }) }),
    next: () => ({ status: 200, headers: new Headers() }),
    json: (_body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, headers: new Headers() }),
  },
}));

jest.mock('@/auth', () => ({
  auth: (handler: unknown) => handler,
}));

import proxy from '../proxy';

type ProxyReq = Parameters<typeof proxy>[0];

function run(pathname: string, loggedIn: boolean) {
  const url = new URL(`http://localhost:3000${pathname}`);
  const req = {
    nextUrl: url,
    auth: loggedIn ? { user: { id: 'user-1' } } : null,
  } as unknown as ProxyReq;
  return (proxy as unknown as (r: ProxyReq) => Response)(req);
}

describe('proxy — redirecionamento de páginas', () => {
  it('logado em "/" redireciona para /dashboard', () => {
    const res = run('/', true);
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location') as string).pathname).toBe('/dashboard');
  });

  it.each(['/login', '/register'])('logado em %s redireciona para /dashboard', (path) => {
    const res = run(path, true);
    expect(new URL(res.headers.get('location') as string).pathname).toBe('/dashboard');
  });

  it('não logado em "/" continua vendo a landing (sem redirect)', () => {
    const res = run('/', false);
    expect(res.headers.get('location')).toBeNull();
  });

  it('não logado em rota privada vai para /login', () => {
    const res = run('/transactions', false);
    expect(new URL(res.headers.get('location') as string).pathname).toBe('/login');
  });

  it('logado em rota privada segue normalmente', () => {
    const res = run('/transactions', true);
    expect(res.headers.get('location')).toBeNull();
  });
});
