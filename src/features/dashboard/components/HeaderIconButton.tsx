'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface HeaderIconButtonProps extends React.ComponentProps<typeof Button> {
  icon: React.ReactNode;
  label: string;
}

export function HeaderIconButton({
  icon,
  label,
  type = 'button',
  variant = 'ghost',
  size = 'icon-sm',
  ...props
}: HeaderIconButtonProps) {
  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      aria-label={label}
      {...props}
    >
      {icon}
    </Button>
  );
}
