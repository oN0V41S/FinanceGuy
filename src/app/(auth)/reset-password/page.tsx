"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams } from "next/navigation";
import { resetPasswordAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ValidatedInput } from "@/features/auth/components/ui/ValidatedInput";
import { FormAlert } from "@/features/auth/components/ui/FormAlert";
import { PasswordRequirements, validatePasswordRequirements } from "@/features/auth/components/PasswordRequirements";
import { passwordSchema } from "@/features/auth/schemas/auth.schema";
import { Loader2 } from "lucide-react";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const ResetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Confirme sua senha"),
});
type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [serverMessage, setServerMessage] = useState<{ type: "error"; text: string } | { type: "success"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
    mode: "onChange",
  });

  const password = useWatch({ control, name: "password" }) ?? "";
  const confirmPassword = useWatch({ control, name: "confirmPassword" }) ?? "";
  const isPasswordValid = validatePasswordRequirements(password);
  const passwordsMatch = password.length > 0 && confirmPassword === password;

  const onSubmit = async (data: ResetPasswordInput) => {
    setIsSubmitting(true);
    setServerMessage(null);
    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("password", data.password);
      formData.append("confirmPassword", data.confirmPassword);
      const result = await resetPasswordAction(formData);
      if (result?.success) {
        setServerMessage({ type: "success", text: "Senha redefinida com sucesso!" });
      } else {
        setServerMessage({ type: "error", text: result?.error || "Algo deu errado." });
      }
    } catch {
      setServerMessage({ type: "error", text: "Algo deu errado." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-semibold text-brand-secondary">Redefinir senha</CardTitle>
        <CardDescription className="text-on-surface-variant">
          Digite sua nova senha
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="reset-password" className="text-brand-secondary font-medium">
            Nova senha
          </Label>
          <ValidatedInput
            id="reset-password"
            type="password"
            placeholder="••••••••"
            status={errors.password ? "invalid" : password && isPasswordValid ? "valid" : null}
            required
            minLength={8}
            aria-invalid={!!errors.password}
            invalidMessage={errors.password?.message}
            {...register("password")}
          />
          <PasswordRequirements passwordValue={password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-confirmPassword" className="text-brand-secondary font-medium">
            Confirmar senha
          </Label>
          <ValidatedInput
            id="reset-confirmPassword"
            type="password"
            placeholder="••••••••"
            status={errors.confirmPassword ? "invalid" : passwordsMatch ? "valid" : null}
            required
            aria-invalid={!!errors.confirmPassword}
            invalidMessage={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
        </div>

        <FormAlert type="error" message={serverMessage?.type === "error" ? serverMessage.text : ""} />
        <FormAlert type="success" message={serverMessage?.type === "success" ? serverMessage.text : ""} />

        <Button
          type="submit"
          disabled={isSubmitting || !isPasswordValid || !passwordsMatch}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Redefinindo...
            </>
          ) : (
            "Redefinir senha"
          )}
        </Button>
      </form>
    </>
  );
}
