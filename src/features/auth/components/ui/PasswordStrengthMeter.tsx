"use client";
import { cn } from "@/lib/utils";

export function getPasswordStrengthLevel(pwd: string): 0 | 1 | 2 | 3 | 4 {
  if (!pwd) return 0;
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNum = /\d/.test(pwd);
  const hasSym = /[@$!%*?&]/.test(pwd);
  const len = pwd.length;
  const variety = (hasLower ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNum ? 1 : 0) + (hasSym ? 1 : 0);
  if (len >= 10 && hasLower && hasUpper && hasNum && hasSym) return 4;
  if (len >= 8 && hasLower && hasUpper && hasNum) return 3;
  if (len >= 8 && variety >= 2) return 2;
  return 1;
}

const LEVELS = [
  { label: "", bar: "", text: "" },
  { label: "Fraca", bar: "bg-finance-expense", text: "text-finance-expense" },
  { label: "Média", bar: "bg-finance-recurring", text: "text-finance-recurring" },
  { label: "Forte", bar: "bg-brand-primary", text: "text-primary" },
  { label: "Muito Forte", bar: "bg-finance-income", text: "text-finance-income" },
] as const;

export function PasswordStrengthMeter({ password }: { password: string }) {
  const level = getPasswordStrengthLevel(password);
  if (level === 0) return null;
  const { label, bar, text } = LEVELS[level];
  return (
    <div className="mt-2 space-y-1" data-testid="password-strength-meter">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            data-testid={`strength-segment-${i}`}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              i <= level ? bar : "bg-outline"
            )}
          />
        ))}
      </div>
      <p className={cn("text-xs font-medium", text)}>{label}</p>
    </div>
  );
}
