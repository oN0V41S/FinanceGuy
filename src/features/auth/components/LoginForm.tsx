"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, LoginInput } from "@/features/auth/schemas/auth.schema";
import { loginAction } from "@/features/auth/actions/loginAction";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormAlert, FormError, ValidatedInput } from "./ui";
import type { FieldStatus } from "./ui/FieldStatusIcon";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    mode: "onChange",
  });

  const watchEmail = watch("email") || "";
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(watchEmail);
  const emailStatus: FieldStatus = errors.email
    ? "invalid"
    : watchEmail && isEmailValid
      ? "valid"
      : null;

  const onSubmit = async (data: LoginInput) => {
    const result = await loginAction(data);
    if (result?.error) {
      setError(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-brand-secondary font-medium">
            Endereço de e-mail
          </Label>
          <ValidatedInput
            id="email"
            type="email"
            placeholder="seu@email.com"
            status={emailStatus}
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <FormError message={errors.email.message} />
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password" className="text-brand-secondary font-medium">
            Senha
          </Label>
          <ValidatedInput
            id="password"
            type="password"
            placeholder="••••••••"
            showToggle
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password && (
            <FormError message={errors.password.message} />
          )}
        </div>
      </div>
      
      <FormAlert type="error" message={error || ""}/>
      
      <Button
        type="submit"
        variant={"default"}
        disabled={isSubmitting}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium transition-colors"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Entrando...
          </>
        ) : (
          "Entrar na conta"
        )}
      </Button>
    </form>
  );
}
