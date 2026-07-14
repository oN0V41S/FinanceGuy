"use client";

import { Check, X } from "lucide-react";

interface PasswordRequirementsProps {
  passwordValue: string;
}

const requirements = [
  { key: "length", label: "Mínimo 8 caracteres", test: (pwd: string) => pwd.length >= 8 },
  { key: "uppercase", label: "Uma letra maiúscula", test: (pwd: string) => /[A-Z]/.test(pwd) },
  { key: "lowercase", label: "Uma letra minúscula", test: (pwd: string) => /[a-z]/.test(pwd) },
  { key: "number", label: "Um número", test: (pwd: string) => /\d/.test(pwd) },
  { key: "symbol", label: "Um símbolo (@$!%*?&)", test: (pwd: string) => /[@$!%*?&]/.test(pwd) },
];

export const validatePasswordRequirements = (password: string): boolean => {
  return requirements.every((req) => req.test(password));
};

export function PasswordRequirements({ passwordValue = "" }: PasswordRequirementsProps) {
  const isEmpty = !passwordValue || passwordValue.length === 0;

  return (
    <div className="space-y-2 mt-3">
      <p className="text-xs text-on-surface-variant font-medium mb-2">Requisitos da senha:</p>
      <div className="grid grid-cols-1 gap-1.5">
        {requirements.map((req) => {
          const isValid = req.test(passwordValue);
          return (
            <div
              key={req.key}
              className="flex items-center gap-1.5 text-sm transition-colors duration-200"
              data-testid={`password-requirement-${req.key}`}
            >
              {!isEmpty && (
                <span
                  className={isValid
                    ? "bg-finance-income text-white w-4 h-4 rounded-full flex items-center justify-center"
                    : "bg-finance-expense/20 text-finance-expense w-4 h-4 rounded-full flex items-center justify-center"
                  }
                  aria-hidden="true"
                >
                  {isValid ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </span>
              )}
              <span
                className={isValid ? "text-finance-income line-through" : "text-finance-expense"}
                aria-label={`${req.label}, ${isValid ? "satisfeito" : "não satisfeito"}`}
              >
                {req.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
