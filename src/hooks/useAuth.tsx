import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/gallery";

type AuthValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  session: null,
  profile: null,
  isAdmin: false,
  loading: true,
});

async function ensureProfile(user: User): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) return data as Profile;

  const meta = user.user_metadata ?? {};
  const base =
    (meta["username"] as string | undefined) ??
    (user.email ? user.email.split("@")[0] : "member");
  const username = `${base.replace(/[^a-z0-9_]/gi, "").toLowerCase() || "member"}_${user.id.slice(0, 4)}`;
  const { data: created } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      username,
      display_name: (meta["display_name"] as string | undefined) ?? base,
      account_type: (meta["account_type"] as "artist" | "enthusiast" | undefined) ?? "enthusiast",
      avatar_url: (meta["avatar_url"] as string | undefined) ?? null,
    })
    .select("*")
    .maybeSingle();
  return (created ?? null) as Profile | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const user = session?.user ?? null;

  const { data: profile } = useQuery({
    queryKey: ["me", "profile", user?.id],
    enabled: !!user,
    queryFn: () => ensureProfile(user!),
  });

  const { data: isAdmin } = useQuery({
    queryKey: ["me", "admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });

  const value = useMemo<AuthValue>(
    () => ({
      user,
      session,
      profile: profile ?? null,
      isAdmin: !!isAdmin,
      loading,
    }),
    [user, session, profile, isAdmin, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
