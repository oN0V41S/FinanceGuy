"use client";

import { X } from "lucide-react";

export interface FormErrorProps {
  message?: string;
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return (
    <p className="text-sm text-finance-expense mt-2 flex items-center gap-1.5">
      <X className="w-4 h-4" />
      {message}
    </p>
  );
}
