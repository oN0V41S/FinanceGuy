import { LoginForm } from "@/features/auth/components/LoginForm";
import Link from "next/link";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-semibold text-brand-secondary">Bem-vindo de volta</CardTitle>
        <CardDescription className="text-on-surface-variant">Entre na sua conta para continuar</CardDescription>
      </CardHeader>
      <LoginForm />
      <div className="text-on-surface-variant mt-4 text-center text-sm">
        Não tem uma conta?{" "}
        <Link href="/register" className="text-primary hover:underline font-medium">
          Criar conta
        </Link>
      </div>
    </>
  );
}
