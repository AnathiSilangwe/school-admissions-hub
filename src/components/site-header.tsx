import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 glass-card border-b border-border/50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Thabazi Secondary School" width={40} height={40} className="h-10 w-10" />
          <div className="leading-tight">
            <div className="font-display text-base font-bold text-foreground">Thabazi Secondary</div>
            <div className="text-xs text-muted-foreground">Excellence in Education</div>
          </div>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4 text-sm">
          <Link to="/" className="rounded-md px-3 py-1.5 text-foreground/80 hover:text-foreground hover:bg-accent transition-colors" activeOptions={{ exact: true }} activeProps={{ className: "text-brand font-semibold" }}>Home</Link>
          <Link to="/apply" className="rounded-full bg-brand px-4 py-2 font-semibold text-brand-foreground shadow-glass transition-transform hover:scale-[1.03] active:scale-100">
            Apply Now
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/50 bg-surface-muted/50">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>© {new Date().getFullYear()} Thabazi Secondary School</div>
        <div>Admissions Office · 09:00 – 16:00 weekdays</div>
      </div>
    </footer>
  );
}