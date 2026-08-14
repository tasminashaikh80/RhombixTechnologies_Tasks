import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Instagram, Twitter } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { MasonryGrid } from "@/components/ArtworkCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchArtistArtworks,
  fetchFollowerCounts,
  fetchProfileByUsername,
  initials,
  notify,
} from "@/lib/gallery";

export const Route = createFileRoute("/artist/$username")({
  head: () => ({
    meta: [
      { title: "Artist profile — Lumen" },
      {
        name: "description",
        content: "Portfolio, specialties, followers and full gallery for this Lumen artist.",
      },
      { property: "og:title", content: "Artist profile — Lumen" },
      { property: "og:description", content: "Browse this artist's portfolio on Lumen." },
    ],
  }),
  component: ArtistProfile,
});

function ArtistProfile() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => fetchProfileByUsername(username),
  });

  const { data: artworks = [] } = useQuery({
    queryKey: ["artist-artworks", profile?.id],
    enabled: !!profile,
    queryFn: () => fetchArtistArtworks(profile!.id),
  });

  const { data: counts } = useQuery({
    queryKey: ["follow-counts", profile?.id],
    enabled: !!profile,
    queryFn: () => fetchFollowerCounts(profile!.id),
  });

  const { data: isFollowing } = useQuery({
    queryKey: ["following", profile?.id, user?.id],
    enabled: !!profile && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user!.id)
        .eq("following_id", profile!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!user || !profile) return;
      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profile.id);
      } else {
        await supabase.from("follows").insert({ follower_id: user.id, following_id: profile.id });
        await notify({
          userId: profile.id,
          actorId: user.id,
          type: "follow",
          message: "started following you",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["following", profile?.id] });
      queryClient.invalidateQueries({ queryKey: ["follow-counts", profile?.id] });
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl px-4 py-20 text-muted-foreground">Loading profile…</div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h1 className="text-3xl font-semibold">Artist not found</h1>
        </div>
      </AppShell>
    );
  }

  const isMe = user?.id === profile.id;

  return (
    <AppShell>
      <div className="spotlight border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-end">
          <Avatar className="size-28 border-4 border-background">
            <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="text-2xl">{initials(profile.display_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-4xl font-semibold">{profile.display_name}</h1>
            <p className="text-muted-foreground">
              @{profile.username} · {profile.account_type === "artist" ? "Artist" : "Enthusiast"}
            </p>
            <p className="mt-3 max-w-xl text-muted-foreground">{profile.bio}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="rounded-full">
                  {skill}
                </Badge>
              ))}
            </div>
            <div className="mt-5 flex gap-6 text-sm">
              <span>
                <strong>{artworks.length}</strong>{" "}
                <span className="text-muted-foreground">artworks</span>
              </span>
              <span>
                <strong>{counts?.followers ?? 0}</strong>{" "}
                <span className="text-muted-foreground">followers</span>
              </span>
              <span>
                <strong>{counts?.following ?? 0}</strong>{" "}
                <span className="text-muted-foreground">following</span>
              </span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3">
            {isMe ? (
              <Button asChild className="rounded-full">
                <Link to="/dashboard">Edit profile</Link>
              </Button>
            ) : (
              <Button
                className="rounded-full"
                variant={isFollowing ? "outline" : "default"}
                onClick={() => {
                  if (!user) {
                    toast.error("Sign in to follow artists.");
                    navigate({ to: "/auth", search: { mode: "login" } });
                    return;
                  }
                  toggleFollow.mutate();
                }}
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
            )}
            <div className="flex gap-2 text-muted-foreground">
              {profile.website ? (
                <a href={profile.website} target="_blank" rel="noreferrer" aria-label="Website">
                  <Globe className="size-5 hover:text-foreground" />
                </a>
              ) : null}
              {profile.twitter ? (
                <a
                  href={`https://twitter.com/${profile.twitter}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Twitter"
                >
                  <Twitter className="size-5 hover:text-foreground" />
                </a>
              ) : null}
              {profile.instagram ? (
                <a
                  href={`https://instagram.com/${profile.instagram}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                >
                  <Instagram className="size-5 hover:text-foreground" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="mb-6 text-2xl font-semibold">Portfolio</h2>
        <MasonryGrid artworks={artworks} />
      </div>
    </AppShell>
  );
}
