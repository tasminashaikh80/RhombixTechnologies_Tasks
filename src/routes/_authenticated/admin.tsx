import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchArtworks, type Artwork } from "@/lib/gallery";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Moderation — Lumen" },
      { name: "description", content: "Review reported artwork and feature standout pieces." },
      { property: "og:title", content: "Moderation — Lumen" },
      { property: "og:description", content: "Admin moderation tools for the Lumen gallery." },
    ],
  }),
  component: AdminPage,
});

type ReportRow = {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  artwork_id: string;
};

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();

  const { data: reports = [] } = useQuery({
    queryKey: ["reports"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as ReportRow[];
    },
  });

  const { data: artworks = [] } = useQuery({
    queryKey: ["artworks"],
    enabled: isAdmin,
    queryFn: fetchArtworks,
  });

  async function toggleFeatured(artwork: Artwork) {
    const { error } = await supabase
      .from("artworks")
      .update({ featured: !artwork.featured })
      .eq("id", artwork.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["artworks"] });
  }

  async function resolveReport(report: ReportRow, status: "resolved" | "dismissed") {
    await supabase.from("reports").update({ status }).eq("id", report.id);
    queryClient.invalidateQueries({ queryKey: ["reports"] });
  }

  async function removeArtwork(artworkId: string) {
    const { error } = await supabase.from("artworks").delete().eq("id", artworkId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Artwork removed.");
    queryClient.invalidateQueries({ queryKey: ["artworks"] });
    queryClient.invalidateQueries({ queryKey: ["reports"] });
  }

  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-4 py-20 text-muted-foreground">Checking access…</div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-4 py-20">
          <h1 className="text-3xl font-semibold">Admins only</h1>
          <p className="mt-2 text-muted-foreground">
            This area is limited to moderators of the Lumen gallery.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold">Moderation</h1>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Reports</h2>
          <div className="mt-4 space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <Badge variant="secondary" className="rounded-full">
                  {report.status}
                </Badge>
                <p className="flex-1 text-sm">{report.reason}</p>
                <Button asChild size="sm" variant="ghost" className="rounded-full">
                  <Link to="/artwork/$id" params={{ id: report.artwork_id }}>
                    View
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => void resolveReport(report, "dismissed")}
                >
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="rounded-full"
                  onClick={() => void removeArtwork(report.artwork_id)}
                >
                  Remove artwork
                </Button>
              </div>
            ))}
            {reports.length === 0 ? (
              <p className="text-muted-foreground">No reports right now.</p>
            ) : null}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">Featured artwork</h2>
          <div className="mt-4 space-y-2">
            {artworks.map((artwork) => (
              <div
                key={artwork.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <p className="flex-1 text-sm font-medium">{artwork.title}</p>
                <p className="text-sm text-muted-foreground">
                  {artwork.profiles?.display_name ?? "Unknown"}
                </p>
                <Button
                  size="sm"
                  variant={artwork.featured ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => void toggleFeatured(artwork)}
                >
                  {artwork.featured ? "Featured" : "Feature"}
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
