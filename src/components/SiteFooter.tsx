import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-canvas">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="display text-base text-foreground">Lumen — a gallery for digital artists</p>
        <nav className="flex flex-wrap gap-5">
          <Link to="/explore" className="hover:text-foreground">
            Explore
          </Link>
          <Link to="/artists" className="hover:text-foreground">
            Artists
          </Link>
          <Link to="/auth" search={{ mode: "signup" }} className="hover:text-foreground">
            Join as an artist
          </Link>
        </nav>
      </div>
    </footer>
  );
}
