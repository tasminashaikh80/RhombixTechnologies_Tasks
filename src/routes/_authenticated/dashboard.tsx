import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Eye, Heart, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { MasonryGrid } from "@/components/ArtworkCard";
import { ArtworkImage } from "@/components/ArtworkImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  commentCount,
  fetchArtistArtworks,
  likeCount,
  type Artwork,
  type Profile,
} from "@/lib/gallery";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — Lumen" },
      {
        name: "description",
        content:
          "Manage your Lumen profile, portfolio, saved artwork and see how your pieces are performing.",
      },
      { property: "og:title", content: "Your dashboard — Lumen" },
      { property: "og:description", content: "Your Lumen portfolio and activity in one place." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: myArtworks = [] } = useQuery({
    queryKey: ["artist-artworks", user?.id],
    enabled: !!user,
    queryFn: () => fetchArtistArtworks(user!.id),
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select(
          "artwork_id, artworks(*, profiles!artworks_artist_id_fkey(id,username,display_name,avatar_url), likes(count), comments(count))",
        )
        .eq("user_id", user!.id);
      return ((data ?? [])
        .map((row) => (row as unknown as { artworks: Artwork | null }).artworks)
        .filter(Boolean) as Artwork[]);
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("artwork_views")
        .select(
          "viewed_at, artworks(*, profiles!artworks_artist_id_fkey(id,username,display_name,avatar_url), likes(count), comments(count))",
        )
        .eq("user_id", user!.id)
        .order("viewed_at", { ascending: false })
        .limit(12);
      return ((data ?? [])
        .map((row) => (row as unknown as { artworks: Artwork | null }).artworks)
        .filter(Boolean) as Artwork[]);
    },
  });

  const totalLikes = myArtworks.reduce((sum, item) => sum + likeCount(item), 0);
  const totalComments = myArtworks.reduce((sum, item) => sum + commentCount(item), 0);
  const totalViews = myArtworks.reduce((sum, item) => sum + item.views, 0);

  async function deleteArtwork(artwork: Artwork) {
    const { error } = await supabase.from("artworks").delete().eq("id", artwork.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Artwork removed.");
    queryClient.invalidateQueries({ queryKey: ["artist-artworks"] });
    queryClient.invalidateQueries({ queryKey: ["artworks"] });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">
              Hello, {profile?.display_name ?? "there"}
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage your portfolio, profile and saved pieces.
            </p>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/upload">Upload artwork</Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat icon={<Heart className="size-4" />} label="Likes" value={totalLikes} />
          <Stat icon={<MessageCircle className="size-4" />} label="Comments" value={totalComments} />
          <Stat icon={<Eye className="size-4" />} label="Views" value={totalViews} />
        </div>

        <Tabs defaultValue="portfolio" className="mt-10">
          <TabsList className="rounded-full">
            <TabsTrigger value="portfolio" className="rounded-full">
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="favorites" className="rounded-full">
              Favourites
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-full">
              History
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-full">
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="mt-8">
            {myArtworks.length === 0 ? (
              <p className="text-muted-foreground">
                No artwork yet.{" "}
                <Link to="/upload" className="underline">
                  Upload your first piece
                </Link>
                .
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myArtworks.map((artwork) => (
                  <div
                    key={artwork.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card"
                  >
                    <Link to="/artwork/$id" params={{ id: artwork.id }}>
                      <ArtworkImage path={artwork.image_url} alt={artwork.title} />
                    </Link>
                    <div className="flex items-center justify-between gap-2 p-4">
                      <div>
                        <p className="font-medium">{artwork.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {likeCount(artwork)} likes · {artwork.views} views
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete artwork"
                        onClick={() => void deleteArtwork(artwork)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="mt-8">
            {favorites.length ? (
              <MasonryGrid artworks={favorites} />
            ) : (
              <p className="text-muted-foreground">You haven't saved any artwork yet.</p>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-8">
            {history.length ? (
              <MasonryGrid artworks={history} />
            ) : (
              <p className="text-muted-foreground">Artwork you view will appear here.</p>
            )}
          </TabsContent>

          <TabsContent value="profile" className="mt-8">
            <ProfileForm
              profile={profile}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ["me", "profile"] })}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon} {label}
      </p>
      <p className="mt-2 text-3xl font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function ProfileForm({
  profile,
  onSaved,
}: {
  profile: Profile | null;
  onSaved: () => void | Promise<void>;
}) {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [instagram, setInstagram] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
    setSkills((profile.skills ?? []).join(", "));
    setWebsite(profile.website ?? "");
    setTwitter(profile.twitter ?? "");
    setInstagram(profile.instagram ?? "");
  }, [profile]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        bio,
        skills: skills
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        website: website || null,
        twitter: twitter || null,
        instagram: instagram || null,
      })
      .eq("id", profile.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await onSaved();
    toast.success("Profile updated.");
  }

  return (
    <form onSubmit={save} className="max-w-xl space-y-5">
      <div className="space-y-2">
        <Label htmlFor="display-name">Display name</Label>
        <Input
          id="display-name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" rows={4} value={bio} onChange={(event) => setBio(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="skills">Skills / specialties</Label>
        <Input
          id="skills"
          value={skills}
          onChange={(event) => setSkills(event.target.value)}
          placeholder="Concept art, 3D, Photobashing"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="twitter">Twitter</Label>
          <Input
            id="twitter"
            value={twitter}
            onChange={(event) => setTwitter(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="instagram">Instagram</Label>
          <Input
            id="instagram"
            value={instagram}
            onChange={(event) => setInstagram(event.target.value)}
          />
        </div>
      </div>
      <Button type="submit" className="rounded-full" disabled={busy}>
        Save profile
      </Button>
    </form>
  );
}
