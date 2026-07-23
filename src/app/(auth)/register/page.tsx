import { RegisterForm } from "@/features/auth/components/RegisterForm";
import Link from "next/link";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-semibold text-brand-secondary">Criar nova conta</CardTitle>
        <CardDescription className="text-on-surface-variant">Preencha seus dados para começar</CardDescription>
      </CardHeader>
      <RegisterForm />
      <div className="text-on-surface-variant mt-4 text-center text-sm">
        Já tem uma conta?{" "}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Entrar
        </Link>
      </div>
    </>
  );
}
