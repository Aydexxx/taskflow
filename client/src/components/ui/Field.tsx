import { forwardRef } from 'react';
import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

/** Shared control styling for inputs, selects, and textareas (light + dark). */
export const CONTROL_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-soft ' +
  'placeholder:text-slate-400 transition duration-150 ease-out-soft ' +
  'hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 ' +
  'dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500 ' +
  'dark:shadow-none dark:hover:border-slate-600 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/25';

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
