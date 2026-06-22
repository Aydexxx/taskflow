/**
 * Ambient page backdrop shared across the authenticated app, bringing the
 * landing page's visual language inside: a faint, radially-masked grid plus a
 * soft accent gradient bloom so pages read as composed depth rather than an
 * empty void. Purely decorative, low-contrast, and pinned behind content.
 *
 * Render as the first child of a `relative` page root; content above it should
 * sit in normal flow (it is `z-0`, the sticky AppHeader is `z-30`).
 */
export function AppBackground(): JSX.Element {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute left-1/2 top-[-14rem] h-[32rem] w-[56rem] -translate-x-1/2 rounded-full bg-indigo-500/15 blur-3xl dark:bg-indigo-500/10" />
      <div className="absolute right-[-12rem] top-[18rem] h-[26rem] w-[34rem] rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/[0.07]" />
    </div>
  );
}
