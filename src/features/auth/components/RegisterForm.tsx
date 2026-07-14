"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterSchema, RegisterInput } from "@/features/auth/schemas/auth.schema";
import { registerAction } from "@/features/auth/actions/registerAction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert, FormError, ValidatedInput, PasswordStrengthMeter } from "./ui";
import type { FieldStatus } from "./ui/FieldStatusIcon";
import { PasswordRequirements, validatePasswordRequirements } from "./PasswordRequirements";
import { Loader2 } from "lucide-react";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    mode: "onChange",
  });

  const watchPassword = watch("password") || "";
  const watchEmail = watch("email") || "";
  const watchConfirm = watch("confirmPassword") || "";
  const isPasswordValid = validatePasswordRequirements(watchPassword);

  const emailStatus: FieldStatus = errors.email
    ? "invalid"
    : watchEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(watchEmail)
      ? "valid"
      : null;
  const passwordStatus: FieldStatus = errors.password
    ? "invalid"
    : watchPassword && isPasswordValid
      ? "valid"
      : null;
  const confirmStatus: FieldStatus = errors.confirmPassword
    ? "invalid"
    : watchConfirm && watchConfirm === watchPassword && watchPassword.length > 0
      ? "valid"
      : null;

  const onSubmit = async (data: RegisterInput) => {
    // confirmPassword is validated client + server side via RegisterSchema.
    // registerAction re-parses the full payload with RegisterSchema (which now
    // requires confirmPassword), so the field must be included here. The
    // AuthService/repository layer ignores it when persisting the user.
    const result = await registerAction(data);
    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(result.success);
      setTimeout(() => router.push("/login"), 2000);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" data-testid="label-name" className="text-brand-secondary font-medium">
              Nome completo
            </Label>
            <Input
              data-testid="name"
              id="name"
              type="text"
              placeholder="João Silva"
              className="h-12 px-4 rounded-xl border border-outline bg-background placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <FormError message={errors.name.message} />
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="nickname" data-testid="label-nickname" className="text-brand-secondary font-medium">
              Apelido
            </Label>
            <Input
              data-testid="nickname"
              id="nickname"
              type="text"
              placeholder="Como você quer ser chamado"
              className="h-12 px-4 rounded-xl border border-outline bg-background placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200"
              aria-invalid={!!errors.nickname}
              {...register("nickname")}
            />
            {errors.nickname && (
              <FormError message={errors.nickname.message} />
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email" data-testid="label-email" className="text-brand-secondary font-medium">
            Endereço de e-mail
          </Label>
          <ValidatedInput
            data-testid="email"
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
          <Label htmlFor="password" data-testid="label-password" className="text-brand-secondary font-medium">
            Senha
          </Label>
          <ValidatedInput
            data-testid="password"
            id="password"
            type="password"
            placeholder="••••••••"
            status={passwordStatus}
            showToggle
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <PasswordRequirements passwordValue={watchPassword} />
          <PasswordStrengthMeter password={watchPassword} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" data-testid="label-confirmPassword" className="text-brand-secondary font-medium">
            Confirmar senha
          </Label>
          <ValidatedInput
            data-testid="confirmPassword"
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            status={confirmStatus}
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <FormError message={errors.confirmPassword.message} />
          )}
        </div>
      </div>
      
      <FormAlert type="error" message={error || ""} />
      <FormAlert type="success" message={success || ""} />
      
      <Button
        type="submit"
        disabled={isSubmitting || !isPasswordValid}
        className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Criando conta...
          </>
        ) : (
          "Criar conta"
        )}
      </Button>
    </form>
  );
}
