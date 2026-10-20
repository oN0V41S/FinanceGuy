import {
  Utensils,
  Car,
  Home,
  HeartPulse,
  GraduationCap,
  Gamepad2,
  Wallet,
  TrendingUp,
  Tag,
  ShoppingCart,
  Plane,
  Gift,
  Briefcase,
  Smartphone,
  Dumbbell,
  PawPrint,
  type LucideIcon,
} from 'lucide-react';
import type { CategoryIcon as CategoryIconKey } from '../defaults';

const ICONS: Record<CategoryIconKey, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  home: Home,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  'gamepad-2': Gamepad2,
  wallet: Wallet,
  'trending-up': TrendingUp,
  tag: Tag,
  'shopping-cart': ShoppingCart,
  plane: Plane,
  gift: Gift,
  briefcase: Briefcase,
  smartphone: Smartphone,
  dumbbell: Dumbbell,
  'paw-print': PawPrint,
};

interface CategoryIconProps {
  icon: string | null;
  className?: string;
}

/** Resolve a chave (allowlist) para o ícone lucide; chave desconhecida cai em "tag". */
export function CategoryIcon({ icon, className }: CategoryIconProps) {
  const Icon = (icon && ICONS[icon as CategoryIconKey]) || Tag;
  return <Icon className={className} aria-hidden="true" />;
}
