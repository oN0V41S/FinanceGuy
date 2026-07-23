"use client";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type FieldStatus = "valid" | "invalid" | null;

export function FieldStatusIcon({ state = null, className }: { state?: FieldStatus; className?: string }) {
  if (!state) return null;
  const Icon = state === "valid" ? Check : X;
  return (
    <Icon
      data-testid={state === "valid" ? "field-status-valid" : "field-status-invalid"}
      className={cn(
        "h-5 w-5 animate-in fade-in pointer-events-none",
        state === "valid" ? "text-finance-income" : "text-finance-expense",
        className
      )}
      aria-hidden="true"
    />
  );
}
