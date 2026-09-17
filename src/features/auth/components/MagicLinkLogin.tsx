"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ValidatedInput, FormAlert } from "./ui";
import { Loader2 } from "lucide-react";

const MagicLinkSchema = z.object({
  email: z.string().email("Email inválido"),
});
type MagicLinkInput = z.infer<typeof MagicLinkSchema>;

interface MagicLinkLoginProps {
  onToggle?: (visible: boolean) => void;
}

export function MagicLinkLogin({ onToggle }: MagicLinkLoginProps = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const toggleForm = (visible: boolean) => {
    setShowForm(visible);
    onToggle?.(visible);
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<MagicLinkInput>({
    resolver: zodResolver(MagicLinkSchema),
    mode: "onChange",
  });

  const email = useWatch({ control, name: "email" }) ?? "";
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isMagicLinkValid = isValidEmail;

  const onSubmit = async (data: MagicLinkInput) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await signIn("resend", { email: data.email, redirect: false });
      setSent(true);
    } catch {
      setError("Não foi possível enviar o link. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = (errs: Record<string, unknown>) => {
    const firstKey = Object.keys(errs)[0];
    if (firstKey) {
      (document.getElementById(firstKey) as HTMLInputElement | null)?.reportValidity();
    }
  };

  if (sent) {
    return (
      <FormAlert type="success" message="Verifique seu e-mail para continuar" />
    );
  }

  if (!showForm) {
    return (
      <Button
        type="button"
        onClick={() => toggleForm(true)}
        variant="outline"
        className="w-full h-12 rounded-xl font-medium transition-colors disabled:cursor-not-allowed"
      >
        Fazer Login por E-mail
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="magic-email" className="text-brand-secondary font-medium">
          Endereço de e-mail
        </Label>
        <ValidatedInput
          id="magic-email"
          type="email"
          placeholder="seu@email.com"
          status={errors.email ? "invalid" : email && isValidEmail ? "valid" : null}
          required
          aria-invalid={!!errors.email}
          invalidMessage={errors.email?.message}
          {...register("email")}
        />
      </div>

      <FormAlert type="error" message={error || ""} />

      <Button
        type="submit"
        disabled={isSubmitting || !isMagicLinkValid}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Enviando...
          </>
        ) : (
          "Enviar link de acesso"
        )}
      </Button>

      <Button
        type="button"
        onClick={() => toggleForm(false)}
        variant="link"
        className="w-full text-on-surface-variant font-normal"
      >
        Voltar para login com senha
      </Button>
    </form>
  );
}
