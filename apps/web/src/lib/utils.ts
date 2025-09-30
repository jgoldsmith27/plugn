import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const categoryColors: Record<string, string> = {
  Source: 'from-emerald-500/90 to-emerald-600/90',
  Transform: 'from-sky-500/90 to-sky-600/90',
  AI: 'from-fuchsia-500/90 to-fuchsia-600/90',
  Store: 'from-amber-500/90 to-amber-600/90',
  Control: 'from-slate-500/90 to-slate-600/90',
  IO: 'from-indigo-500/90 to-indigo-600/90'
};

export function formatDate(date: Date | number | string) {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return d.toLocaleString();
}
