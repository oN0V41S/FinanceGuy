"use client";

import { useState } from "react";
import { LoginForm } from "./LoginForm";
import { MagicLinkLogin } from "./MagicLinkLogin";
import { EMAIL_AUTH_ENABLED } from "@/features/auth/config";

export function LoginMethods() {
  const [magicLinkOpen, setMagicLinkOpen] = useState(false);

  if (!EMAIL_AUTH_ENABLED) {
    return <LoginForm />;
  }

  return (
    <div className="space-y-4">
      {!magicLinkOpen && <LoginForm />}
      <MagicLinkLogin onToggle={setMagicLinkOpen} />
    </div>
  );
}
