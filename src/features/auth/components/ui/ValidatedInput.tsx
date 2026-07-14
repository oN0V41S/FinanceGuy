"use client";
import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { FieldStatusIcon, type FieldStatus } from "./FieldStatusIcon";

interface ValidatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  status?: FieldStatus;
  showToggle?: boolean;
}

const BASE_INPUT_CLASS =
  "h-12 px-4 rounded-xl border border-outline bg-background placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200";

export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ status = null, showToggle = false, className, type, ...props }, ref) => {
    const [show, setShow] = useState(false);
    const isPassword = type === "password";
    const visibleType = isPassword && show ? "text" : type;
    const hasStatus = status !== null;
    const hasToggle = showToggle && isPassword;
    const paddingRight = hasToggle && hasStatus ? "pr-16" : hasToggle || hasStatus ? "pr-10" : "";

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visibleType}
          className={cn(BASE_INPUT_CLASS, paddingRight, className)}
          {...props}
        />
        {hasStatus && (
          <span
            className={cn(
              "absolute top-1/2 -translate-y-1/2",
              hasToggle ? "right-10" : "right-3"
            )}
          >
            <FieldStatusIcon state={status} />
          </span>
        )}
        {hasToggle && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
          >
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>
    );
  }
);
ValidatedInput.displayName = "ValidatedInput";
