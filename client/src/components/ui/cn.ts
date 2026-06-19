/** Join class names, dropping falsy values. Keeps component class lists readable. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
