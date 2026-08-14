import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

type AuthSearch = { mode: "login" | "signup" };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    mode: search["mode"] === "signup" ? "signup" : "login",
  }),
  head: () => ({
    meta: [
      { title: "Sign in or Join Lumen" },
      {
        name: "description",
        content:
          "Create a Lumen account as an artist or art enthusiast to upload artwork, follow artists and save favourites.",
      },
      { property: "og:title", content: "Sign in or Join Lumen" },
      { property: "og:description", content: "Join the Lumen digital art community." },
      { property: "og:url", content: "https://chroma-spark-show.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://chroma-spark-show.lovable.app/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accountType, setAccountType] = useState<"artist" | "enthusiast">("enthusiast");
  const [busy, setBusy] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0], account_type: accountType },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSentConfirmation(true);
          toast.success("Check your email to confirm your account.");
        } else {
          toast.success("Welcome to Lumen!");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Try email instead.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  async function handleForgotPassword() {
    if (!email) {
      toast.error("Enter your email first, then tap reset.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent.");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="spotlight hidden flex-col justify-between border-r border-border p-12 lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Palette className="size-5" />
          </span>
          <span className="display text-xl font-semibold">Lumen</span>
        </Link>
        <div>
          <h1 className="max-w-md text-balance text-4xl font-semibold">
            Your portfolio deserves a proper gallery wall.
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Publish artwork, grow a following, and save the pieces that inspire you.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">Digital painting · 3D · Concept · Photography</p>
      </div>

      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <Tabs
            value={mode}
            onValueChange={(value) =>
              navigate({ to: "/auth", search: { mode: value as AuthSearch["mode"] } })
            }
          >
            <TabsList className="grid w-full grid-cols-2 rounded-full">
              <TabsTrigger value="login" className="rounded-full">
                Log in
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full">
                Sign up
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {sentConfirmation ? (
            <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
              <h2 className="text-lg font-semibold">Confirm your email</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a confirmation link to {email}. Click it to activate your account.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {mode === "signup" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Nova Ink"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account type</Label>
                    <RadioGroup
                      value={accountType}
                      onValueChange={(value) =>
                        setAccountType(value as "artist" | "enthusiast")
                      }
                      className="grid grid-cols-2 gap-3"
                    >
                      <Label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3 text-sm has-[:checked]:border-primary">
                        <RadioGroupItem value="artist" /> Artist
                      </Label>
                      <Label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3 text-sm has-[:checked]:border-primary">
                        <RadioGroupItem value="enthusiast" /> Enthusiast
                      </Label>
                    </RadioGroup>
                  </div>
                </>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@studio.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <Button type="submit" className="w-full rounded-full" disabled={busy}>
                {mode === "signup" ? "Create account" : "Log in"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full"
                onClick={() => void handleGoogle()}
              >
                Continue with Google
              </Button>

              {mode === "login" ? (
                <button
                  type="button"
                  onClick={() => void handleForgotPassword()}
                  className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </button>
              ) : null}
            </form>
          )}

          <p className="mt-8 text-center text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Back to the gallery
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
