import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Bell } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Your notifications — Lumen" },
      {
        name: "description",
        content: "Likes, comments, replies and new followers on your Lumen artwork.",
      },
      { property: "og:title", content: "Your notifications — Lumen" },
      { property: "og:description", content: "Activity on your Lumen account." },
    ],
  }),
  component: NotificationsPage,
});

type NotificationRow = {
  id: string;
  type: string;
  message: string;
  artwork_id: string | null;
  read: boolean;
  created_at: string;
};

function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as NotificationRow[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  async function markAllRead() {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Notifications</h1>
          <Button variant="outline" className="rounded-full" onClick={() => void markAllRead()}>
            Mark all read
          </Button>
        </div>

        <div className="mt-8 space-y-3">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 rounded-2xl border border-border p-4 ${
                item.read ? "bg-card" : "bg-accent/40"
              }`}
            >
              <Bell className="mt-1 size-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm">{item.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
              {item.artwork_id ? (
                <Button asChild size="sm" variant="ghost" className="rounded-full">
                  <Link to="/artwork/$id" params={{ id: item.artwork_id }}>
                    View
                  </Link>
                </Button>
              ) : null}
            </div>
          ))}
          {notifications.length === 0 ? (
            <p className="text-muted-foreground">Nothing yet — activity will show up here.</p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
