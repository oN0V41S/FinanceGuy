import "@testing-library/jest-dom";

// Mock do Next.js Request/Response para testes de API
// Isso permite que os testes de API funcionem no ambiente jsdom/node

// Mock para NextRequest
class MockNextRequest {
  constructor(
    public url: string,
    public init: RequestInit = {}
  ) {}
  
  get headers() {
    return new Headers(this.init.headers as Record<string, string>);
  }
  
  get method() {
    return this.init.method || "GET";
  }
  
  get bodyUsed() {
    return false;
  }
  
  async json() {
    return JSON.parse(this.init.body as string);
  }
  
  async text() {
    return this.init.body as string;
  }
  
  get nextUrl() {
    return new URL(this.url);
  }
}

// Mock para Headers
global.Headers = class Headers {
  private headers: Map<string, string>;
  
  constructor(init?: Record<string, string>) {
    this.headers = new Map(init || []);
  }
  
  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }
  
  set(name: string, value: string) {
    this.headers.set(name.toLowerCase(), value);
  }
  
  has(name: string): boolean {
    return this.headers.has(name.toLowerCase());
  }
  
  delete(name: string) {
    this.headers.delete(name.toLowerCase());
  }
  
  forEach(callback: (value: string, key: string) => void) {
    this.headers.forEach((value, key) => callback(value, key));
  }
} as any;

// Mock para NextResponse
const MockNextResponse = {
  json: function(data: any, init?: ResponseInit) {
    return {
      status: init?.status || 200,
      headers: new Headers(init?.headers as Record<string, string>),
      body: data,
      ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
      statusText: init?.status === 201 ? "Created" : "OK",
      json: async () => data,
      text: async () => JSON.stringify(data),
      cookies: {
        get: (name: string) => {
          const cookieHeader = init?.headers?.['Set-Cookie'];
          if (cookieHeader && cookieHeader.includes(`${name}=`)) {
            const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
            return match ? { name, value: match[1] } : undefined;
          }
          return undefined;
        },
      },
    };
  },
};

// Configurar globals
(global as any).NextRequest = MockNextRequest;
(global as any).NextResponse = MockNextResponse;

// Mock do Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock do Next.js headers
jest.mock("next/headers", () => ({
  cookies: () => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  }),
  headers: () => ({}),
}));

// Mock do Next.js redirect
jest.mock("next/navigation", () => ({
  ...jest.requireActual("next/navigation"),
  redirect: jest.fn(() => Promise.resolve()),
}));

// Mock do server action de nickname para evitar cascata de import ESM (next-auth)
jest.mock("@/features/auth/actions/updateNicknameAction", () => ({
  updateNicknameAction: jest.fn(),
}));