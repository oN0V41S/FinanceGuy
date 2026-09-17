"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { forgotPasswordAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ValidatedInput } from "@/features/auth/components/ui/ValidatedInput";
import { FormAlert } from "@/features/auth/components/ui/FormAlert";
import { Loader2 } from "lucide-react";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});
type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [serverMessage, setServerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
    mode: "onChange",
  });

  const email = useWatch({ control, name: "email" }) ?? "";
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsSubmitting(true);
    setServerMessage(null);
    try {
      const formData = new FormData();
      formData.append("email", data.email);
      const result = await forgotPasswordAction(formData);
      if (result?.success) {
        setServerMessage({ type: "success", text: "Enviado! Verifique seu e-mail para redefinir a senha." });
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
          Digite seu e-mail para receber o link de redefinição
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="forgot-email" className="text-brand-secondary font-medium">
            Endereço de e-mail
          </Label>
          <ValidatedInput
            id="forgot-email"
            type="email"
            placeholder="seu@email.com"
            status={errors.email ? "invalid" : email && isValidEmail ? "valid" : null}
            required
            aria-invalid={!!errors.email}
            invalidMessage={errors.email?.message}
            {...register("email")}
          />
        </div>

        <FormAlert type="error" message={serverMessage?.type === "error" ? serverMessage.text : ""} />
        <FormAlert type="success" message={serverMessage?.type === "success" ? serverMessage.text : ""} />

        <Button
          type="submit"
          disabled={isSubmitting || !isValidEmail}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar link de redefinição"
          )}
        </Button>
      </form>
    </>
  );
}
