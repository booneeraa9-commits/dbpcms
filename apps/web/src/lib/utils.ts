import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines Tailwind class names cleanly, resolving conflicts (the shadcn/ui
 * convention). Used by all UI components.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
