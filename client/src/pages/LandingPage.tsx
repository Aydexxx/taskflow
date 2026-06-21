import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { MarketingHeader } from '../components/landing/MarketingHeader';
import { HeroBoard } from '../components/landing/HeroBoard';
import { Reveal } from '../components/landing/Reveal';
import { Button } from '../components/ui';

interface Feature {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Users,
    title: 'Real-time collaboration',
    description: 'See teammates’ presence and edits the instant they happen — every board stays in sync, live.',
  },
  {
    icon: LayoutGrid,
    title: 'Drag-and-drop boards',
    description: 'Fluid Kanban with elevated drag visuals and clear drop targets. Reorder cards and columns effortlessly.',
  },
  {
    icon: ShieldCheck,
    title: 'Roles & permissions',
    description: 'Owner, admin, member, and viewer roles keep the right people in control of the right work.',
  },
  {
    icon: Sparkles,
    title: 'AI assist',
    description: 'Summarize a board or draft card details in a click, so the team spends time doing, not writing.',
  },
  {
    icon: BarChart3,
    title: 'Workspace analytics',
    description: 'Throughput, cycle time, and status breakdowns — the signal you need to plan the next sprint.',
  },
  {
    icon: Bell,
    title: 'Mentions & notifications',
    description: '@mention a teammate and they’re notified instantly, with a click-through straight to the card.',
  },
];

const METRICS: { value: string; label: string }[] = [
  { value: '<50ms', label: 'Realtime update latency' },
  { value: '4', label: 'Granular permission roles' },
  { value: '100%', label: 'Keyboard accessible' },
  { value: '∞', label: 'Boards & cards per workspace' },
];

const LIVE_POINTS = [
  'Live presence avatars on every board',
  'Optimistic drag-and-drop that never blocks',
  'Instant @mentions and notifications',
];

export function LandingPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <MarketingHeader />

      <main>
        {/* ---------- Hero ---------- */}
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[-12rem] h-[32rem] w-[52rem] -translate-x-1/2 rounded-full bg-indigo-500/15 blur-3xl dark:bg-indigo-500/10"
          />

          <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
              <div className="max-w-xl">
                <Reveal>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 shadow-soft backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                    <Zap className="h-3.5 w-3.5 text-indigo-500" />
                    Real-time Kanban for fast teams
                  </span>
                </Reveal>

                <Reveal delay={80}>
                  <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
                    Where your team’s work{' '}
                    <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-300">
                      moves together
                    </span>
                  </h1>
                </Reveal>

                <Reveal delay={140}>
                  <p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                    TaskFlow is a real-time, collaborative task board — drag-and-drop planning, live presence, roles,
                    AI assist, and analytics, in one fast and focused workspace.
                  </p>
                </Reveal>

                <Reveal delay={200}>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Link to="/register">
                      <Button size="md" className="group">
                        Get started free
                        <ArrowRight className="h-4 w-4 transition-transform duration-150 ease-out-soft group-hover:translate-x-0.5" />
                      </Button>
                    </Link>
                    <Link to="/login">
                      <Button variant="secondary" size="md">
                        Sign in
                      </Button>
                    </Link>
                  </div>
                </Reveal>

                <Reveal delay={260}>
                  <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                    {['No credit card', 'Light & dark themes', 'Open source'].map((item) => (
                      <li key={item} className="inline-flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-emerald-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              </div>

              <Reveal delay={220} className="lg:pl-4">
                <div className="motion-safe:animate-float motion-safe:[animation-duration:7s]">
                  <HeroBoard />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section id="features" className="relative mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:px-8 sm:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Everything a team needs to ship
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Thoughtfully built features that stay out of the way — fast, accessible, and consistent in light and dark.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <Reveal key={feature.title} as="article" delay={(index % 3) * 70}>
                <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-soft ring-1 ring-slate-900/[0.02] transition duration-200 ease-out-soft hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:ring-0 dark:hover:border-indigo-500/40">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100 transition-colors group-hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/25">
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {feature.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------- Live collaboration highlight ---------- */}
        <section id="live" className="scroll-mt-20 border-y border-slate-200/70 bg-white/60 dark:border-slate-800/70 dark:bg-slate-900/40">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-2">
            <Reveal>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
                Live
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                Built for the moment your team is all in the board
              </h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
                Presence, edits, and notifications propagate over websockets in real time. No refresh, no stale state —
                just the board, moving with your team.
              </p>
              <ul className="mt-6 space-y-3">
                {LIVE_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={120}>
              <HeroBoard />
            </Reveal>
          </div>
        </section>

        {/* ---------- Metrics strip ---------- */}
        <section id="metrics" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:px-8 sm:py-24">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Fast where it counts
            </h2>
          </Reveal>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {METRICS.map((metric, index) => (
              <Reveal key={metric.label} delay={(index % 4) * 60}>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-soft ring-1 ring-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-900 dark:ring-0">
                  <p className="font-display text-4xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{metric.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-600 to-violet-600 px-8 py-14 text-center shadow-overlay dark:border-indigo-500/30">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 60%, white 0, transparent 35%)',
                }}
              />
              <div className="relative">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Start moving work together</h2>
                <p className="mx-auto mt-3 max-w-xl text-base text-indigo-100">
                  Create a workspace in seconds and invite your team. It’s free to get started.
                </p>
                <div className="mt-8 flex justify-center">
                  <Link to="/register">
                    <Button
                      size="md"
                      className="group bg-white text-indigo-700 shadow-sm hover:bg-indigo-50 active:bg-indigo-100 dark:bg-white dark:text-indigo-700 dark:hover:bg-indigo-50"
                    >
                      Get started free
                      <ArrowRight className="h-4 w-4 transition-transform duration-150 ease-out-soft group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

function LandingFooter(): JSX.Element {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 bg-white/60 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold tracking-tight text-white shadow-sm ring-1 ring-inset ring-white/15">
            TF
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">TaskFlow</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Real-time team task management.</p>
          </div>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <a href="#features" className="text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            Features
          </a>
          <a href="#live" className="text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            Live collaboration
          </a>
          <Link to="/login" className="text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            Sign in
          </Link>
          <Link to="/register" className="font-medium text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400">
            Get started
          </Link>
        </nav>
      </div>
      <div className="border-t border-slate-200/70 dark:border-slate-800/70">
        <p className="mx-auto max-w-6xl px-5 py-5 text-center text-xs text-slate-400 sm:px-8 dark:text-slate-500">
          © {year} TaskFlow. Built with React, TypeScript &amp; Tailwind.
        </p>
      </div>
    </footer>
  );
}
