import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Moon, Palette, Search, Sun, Upload } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { initials } from "@/lib/gallery";

export function SiteHeader() {
  const { user, profile, isAdmin } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");

  const { data: unread } = useQuery({
    queryKey: ["notifications", "unread", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("read", false);
      return count ?? 0;
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Palette className="size-5" />
          </span>
          <span className="display text-xl font-semibold">Lumen</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 text-sm md:flex">
          <Link
            to="/explore"
            search={{ q: "", category: "All", sort: "newest" }}
            className="rounded-full px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "text-foreground bg-secondary" }}
          >
            Explore
          </Link>
          <Link
            to="/artists"
            className="rounded-full px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "text-foreground bg-secondary" }}
          >
            Artists
          </Link>
          {user ? (
            <Link
              to="/dashboard"
              className="rounded-full px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Dashboard
            </Link>
          ) : null}
        </nav>

        <form
          className="relative ml-auto hidden max-w-xs flex-1 items-center sm:flex"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ to: "/explore", search: { q: term, category: "All", sort: "newest" } });
          }}
        >
          <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search artwork, artists, tags"
            className="rounded-full pl-9"
            aria-label="Search artwork"
          />
        </form>

        <div className="ml-auto flex items-center gap-1 sm:ml-2">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle colour theme">
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>

          {user ? (
            <>
              <Button variant="ghost" size="icon" asChild aria-label="Notifications">
                <Link to="/notifications" className="relative">
                  <Bell className="size-5" />
                  {unread ? (
                    <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
                  ) : null}
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild aria-label="Upload artwork">
                <Link to="/upload">
                  <Upload className="size-5" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-1 rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Avatar className="size-9">
                      <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                      <AvatarFallback>{initials(profile?.display_name ?? "You")}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="truncate">
                    {profile?.display_name ?? "Your account"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  {profile ? (
                    <DropdownMenuItem asChild>
                      <Link to="/artist/$username" params={{ username: profile.username }}>
                        My profile
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem asChild>
                    <Link to="/upload">Upload artwork</Link>
                  </DropdownMenuItem>
                  {isAdmin ? (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">Admin panel</Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void signOut()}>Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link to="/auth" search={{ mode: "login" }}>Log in</Link>
              </Button>
              <Button asChild className="rounded-full">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Join
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
