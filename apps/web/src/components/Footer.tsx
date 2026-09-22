export default function Footer() {
  return (
    <footer className="mt-28 border-t border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">
              digital<span className="text-white/40">·</span>heroes
            </p>
            <p className="mt-1 text-sm text-mist">
              Play with purpose. Every round funds a cause you choose.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-7 gap-y-2 text-sm text-mist">
            <a href="/how-it-works" className="transition-colors hover:text-white">How it works</a>
            <a href="/charities" className="transition-colors hover:text-white">Charities</a>
            <a href="/pricing" className="transition-colors hover:text-white">Pricing</a>
            <a href="/draws" className="transition-colors hover:text-white">Results</a>
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/35 md:flex-row md:items-center md:justify-between">
          <p>Copyright © 2026 Digital Heroes. All rights reserved.</p>
          <p>Golf performance · Monthly draws · Charitable giving</p>
        </div>
      </div>
    </footer>
  );
}
