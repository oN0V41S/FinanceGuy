"use client";

import { useState } from "react";
import { LoginForm } from "./LoginForm";
import { MagicLinkLogin } from "./MagicLinkLogin";

export function LoginMethods() {
  const [magicLinkOpen, setMagicLinkOpen] = useState(false);

  return (
    <div className="space-y-4">
      {!magicLinkOpen && <LoginForm />}
      <MagicLinkLogin onToggle={setMagicLinkOpen} />
    </div>
  );
}
