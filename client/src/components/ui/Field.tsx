import { forwardRef } from 'react';
import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

/** Shared control styling for inputs, selects, and textareas (light + dark). */
export const CONTROL_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500';

export function FieldLabel({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>): JSX.Element {
  return <label {...rest} className={cn('block text-sm font-medium text-slate-700 dark:text-slate-300', className)} />;
}

/** Forwards its ref (e.g. so a caller can read/set selection range for a mention autocomplete). */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} {...rest} className={cn(CONTROL_CLASS, className)} />;
});

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>): JSX.Element {
  return <textarea {...rest} className={cn(CONTROL_CLASS, className)} />;
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>): JSX.Element {
  return <select {...rest} className={cn(CONTROL_CLASS, className)} />;
}
