import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = ["/", "/login", "/register"];
// Rotas que devem redirecionar usuários autenticados para o dashboard
const AUTH_PAGES = ["/login", "/register"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;

  // Verifica se a rota atual é uma API route
  const isApiRoute = pathname.startsWith("/api/");

  // Para API routes: injeta x-user-id e permite acesso
  if (isApiRoute) {
    // Rotas de autenticação do NextAuth precisam ser acessíveis sem token
    if (pathname.startsWith("/api/auth/")) {
      return NextResponse.next();
    }

    // Se não está logado, retorna 401
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Injeta o userId no header x-user-id para as API routes
    const userId = req.auth?.user?.id;
    if (userId) {
      const response = NextResponse.next();
      response.headers.set("x-user-id", userId);
      return response;
    }

    return NextResponse.json({ error: "Usuário não identificado" }, { status: 401 });
  }

  // Para rotas de páginas: lógica de redirecionamento existente
  
  // Verifica se a rota atual é uma rota pública (exata)
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  
  // Verifica se a rota atual é uma página de autenticação
  const isAuthPage = AUTH_PAGES.includes(pathname);

  // Se o usuário não está logado e tenta acessar uma rota privada, redireciona para login
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Se o usuário já está logado e tenta acessar /login ou /register, redireciona para o dashboard
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

// Configuração de quais rotas o middleware deve atuar
// Inclui API routes para injetar x-user-id
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - server actions (Next.js server actions)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
