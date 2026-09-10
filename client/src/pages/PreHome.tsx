import React from 'react';
import { ArrowRight, Bot, Code2, GitBranch, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'wouter';

const capabilities = [
  {
    icon: Bot,
    title: 'Autonomous agents',
    description: 'Describe the outcome. ForgeAI plans the work, coordinates the build, and keeps the process visible.',
  },
  {
    icon: Code2,
    title: 'Production workspace',
    description: 'Move from an idea to files, previews, terminal output, and an organized coding workspace.',
  },
  {
    icon: GitBranch,
    title: 'Built for iteration',
    description: 'Keep projects, conversations, source control, and deployment context together as your product grows.',
  },
];

export default function PreHome() {
  return (
    <main className="min-h-screen bg-[#0c0d0e] text-zinc-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
          <span className="h-2 w-2 rounded-full bg-zinc-300" />
          Forgeflow
        </Link>
        <nav className="flex items-center gap-5 text-xs text-zinc-500">
          <a href="#how-it-works" className="hidden transition-colors hover:text-zinc-200 sm:block">How it works</a>
          <Link href="/workspace" className="transition-colors hover:text-white">Open workspace <ArrowRight className="ml-1 inline h-3 w-3" /></Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-14 px-6 pb-24 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10 lg:pb-32 lg:pt-24">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#292a32] bg-[#111216] px-3 py-1.5 text-[11px] text-zinc-400">
            <Sparkles className="h-3.5 w-3.5 text-zinc-300" />
            Autonomous app building, without the noise
          </div>
          <h1 className="max-w-3xl text-5xl font-medium leading-[1.04] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
            Build the thing you have been imagining.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
            ForgeAI turns a plain-language idea into an organized software workspace. Plan with agents, write code, inspect a live preview, and keep moving from one calm interface.
          </p>
          <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-md bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-white">
              Create account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="px-2 py-2.5 text-sm text-zinc-500 transition-colors hover:text-zinc-200">Already have an account?</Link>
          </div>
          <div className="mt-10 flex items-center gap-2 text-xs text-zinc-600">
            <ShieldCheck className="h-3.5 w-3.5" />
            Your workspace stays private to your account
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 bg-[radial-gradient(circle_at_center,rgba(113,113,122,0.12),transparent_62%)]" />
          <div className="relative overflow-hidden rounded-xl border border-[#292a32] bg-[#111216] shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between border-b border-[#23242a] px-4 py-3 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-600">
              <span>ForgeAI workspace</span>
              <span className="flex items-center gap-1.5 normal-case tracking-normal text-zinc-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" /> ready</span>
            </div>
            <div className="p-5 sm:p-7">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-600">New build request</div>
              <div className="mt-4 text-xl leading-8 text-zinc-200">Build a focused workspace for my next idea.</div>
              <div className="mt-7 space-y-4 border-l border-[#30313a] pl-4">
                <div><div className="text-xs text-zinc-300">Planner Agent</div><div className="mt-1 text-xs leading-5 text-zinc-600">Structuring the product architecture and first implementation pass.</div></div>
                <div><div className="text-xs text-zinc-300">Code Writer Agent</div><div className="mt-1 text-xs leading-5 text-zinc-600">Preparing the workspace, routes, and reusable components.</div></div>
                <div><div className="text-xs text-zinc-300">Preview Agent</div><div className="mt-1 text-xs leading-5 text-zinc-600">Ready to inspect the result and continue iterating.</div></div>
              </div>
              <div className="mt-8 flex items-center justify-between rounded-md border border-[#292a32] bg-[#0c0d0e] px-3 py-2.5 text-xs text-zinc-600"><span>Describe what you want to build…</span><ArrowRight className="h-3.5 w-3.5 text-zinc-500" /></div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-[#1d1e24]">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-20">
          <div className="max-w-xl"><div className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-600">A quieter way to build</div><h2 className="mt-3 text-2xl font-medium tracking-tight text-white sm:text-3xl">From first thought to working product.</h2><p className="mt-3 text-sm leading-6 text-zinc-500">ForgeAI keeps the interface focused on the next useful action while making the underlying agent work understandable.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, description }) => <div key={title} className="rounded-lg border border-[#23242a] bg-[#111216] p-5"><Icon className="h-4 w-4 text-zinc-400" /><h3 className="mt-5 text-sm font-medium text-zinc-200">{title}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{description}</p></div>)}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#1d1e24] px-6 py-6 lg:px-10"><div className="mx-auto flex max-w-6xl items-center justify-between text-xs text-zinc-600"><span>Forgeflow</span><Link href="/workspace" className="hover:text-zinc-300">Open workspace <ArrowRight className="ml-1 inline h-3 w-3" /></Link></div></footer>
    </main>
  );
}
