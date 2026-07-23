"use client";

import { cn } from "@/lib/utils";
import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react";

export type AlertType = "error" | "success" | "warning" | "info";

export interface FormAlertProps {
  type?: AlertType;
  message: string;
  className?: string;
}

const alertStyles: Record<AlertType, string> = {
  error: "bg-error-container text-error-on-container border-error",
  success: "bg-tertiary-container text-tertiary-on-container border-tertiary",
  warning: "bg-surface-container-high text-finance-recurring border-finance-recurring",
  info: "bg-primary/10 text-primary border-primary/20",
};

const alertIcons: Record<AlertType, React.ReactNode> = {
  error: <X className="h-5 w-5" />,
  success: <CheckCircle2 className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
};

export function FormAlert({ type = "error", message, className }: FormAlertProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 p-4 rounded-lg border text-sm font-medium animate-in fade-in slide-in-from-top-",
        alertStyles[type],
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {alertIcons[type]}
      <span>{message}</span>
    </div>
  );
}
