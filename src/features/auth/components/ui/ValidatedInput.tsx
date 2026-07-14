"use client";
import {
  forwardRef,
  useState,
  useEffect,
  useRef,
  type InputHTMLAttributes,
  type MutableRefObject,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { FieldStatusIcon, type FieldStatus } from "./FieldStatusIcon";

interface ValidatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  status?: FieldStatus;
  showToggle?: boolean;
  invalidMessage?: string;
}

const BASE_INPUT_CLASS =
  "h-12 px-4 rounded-xl border border-outline bg-background placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200";

export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  (
    { status = null, showToggle = false, className, type, invalidMessage, onBlur, ...restProps },
    ref
  ) => {
    const [show, setShow] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    // `ref` is the RHF ref (routed to the forwardRef 2nd argument by
    // <ValidatedInput {...register(...)} />). Merge it with our internal ref so
    // setCustomValidity / reportValidity can reach the underlying input.
    const externalRef = ref;
    const isPassword = type === "password";
    const visibleType = isPassword && show ? "text" : type;
    const hasStatus = status !== null;
    const hasToggle = showToggle && isPassword;
    const paddingRight = hasToggle && hasStatus ? "pr-16" : hasToggle || hasStatus ? "pr-10" : "";

    useEffect(() => {
      inputRef.current?.setCustomValidity(invalidMessage ?? "");
    }, [invalidMessage]);

    return (
      <div className="relative">
        <Input
          ref={(node: HTMLInputElement | null) => {
            inputRef.current = node;
            const r = externalRef;
            if (typeof r === "function") r(node);
            else if (r) (r as MutableRefObject<HTMLInputElement | null>).current = node;
          }}
          type={visibleType}
          className={cn(BASE_INPUT_CLASS, paddingRight, className)}
          onBlur={(e) => {
            e.currentTarget.reportValidity();
            onBlur?.(e);
          }}
          {...restProps}
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
