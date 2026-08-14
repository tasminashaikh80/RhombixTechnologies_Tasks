import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bookmark, Flag, Heart, Share2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ArtworkCard } from "@/components/ArtworkCard";
import { ArtworkImage } from "@/components/ArtworkImage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchArtwork, fetchArtworks, initials, notify } from "@/lib/gallery";

export const Route = createFileRoute("/artwork/$id")({
  head: () => ({
    meta: [
      { title: "Artwork — Lumen" },
      {
        name: "description",
        content: "View this piece in full, read the story behind it, and join the conversation.",
      },
      { property: "og:title", content: "Artwork — Lumen" },
      { property: "og:description", content: "A digital artwork published on Lumen." },
    ],
  }),
  component: ArtworkDetail,
});

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  parent_id: string | null;
  user_id: string;
  profiles: { username: string; display_name: string; avatar_url: string | null } | null;
};

function ArtworkDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);

  const { data: artwork, isLoading } = useQuery({
    queryKey: ["artwork", id],
    queryFn: () => fetchArtwork(id),
  });
  const { data: allArtworks = [] } = useQuery({ queryKey: ["artworks"], queryFn: fetchArtworks });

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, profiles!comments_user_id_fkey1(username,display_name,avatar_url)")
        .eq("artwork_id", id)
        .order("created_at", { ascending: true });
      if (error) {
        const fallback = await supabase
          .from("comments")
          .select("*")
          .eq("artwork_id", id)
          .order("created_at", { ascending: true });
        return (fallback.data ?? []) as unknown as CommentRow[];
      }
      return (data ?? []) as unknown as CommentRow[];
    },
  });

  const { data: liked } = useQuery({
    queryKey: ["liked", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("likes")
        .select("artwork_id")
        .eq("artwork_id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const { data: saved } = useQuery({
    queryKey: ["saved", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("artwork_id")
        .eq("artwork_id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  // record the view for the enthusiast dashboard
  useEffect(() => {
    if (!user || !artwork) return;
    void supabase
      .from("artwork_views")
      .upsert({ user_id: user.id, artwork_id: artwork.id, viewed_at: new Date().toISOString() });
  }, [user, artwork]);

  const requireAuth = () => {
    if (user) return true;
    toast.error("Sign in to interact with artwork.");
    navigate({ to: "/auth", search: { mode: "login" } });
    return false;
  };

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user || !artwork) return;
      if (liked) {
        await supabase.from("likes").delete().eq("artwork_id", id).eq("user_id", user.id);
      } else {
        await supabase.from("likes").insert({ artwork_id: id, user_id: user.id });
        await notify({
          userId: artwork.artist_id,
          actorId: user.id,
          type: "like",
          message: `liked "${artwork.title}"`,
          artworkId: artwork.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liked", id] });
      queryClient.invalidateQueries({ queryKey: ["artwork", id] });
      queryClient.invalidateQueries({ queryKey: ["artworks"] });
    },
  });

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (saved) {
        await supabase.from("favorites").delete().eq("artwork_id", id).eq("user_id", user.id);
      } else {
        await supabase.from("favorites").insert({ artwork_id: id, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved", id] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(saved ? "Removed from favourites" : "Saved to favourites");
    },
  });

  const postComment = useMutation({
    mutationFn: async () => {
      if (!user || !artwork || !comment.trim()) return;
      await supabase.from("comments").insert({
        artwork_id: id,
        user_id: user.id,
        body: comment.trim(),
        parent_id: replyTo?.id ?? null,
      });
      await notify({
        userId: replyTo ? replyTo.user_id : artwork.artist_id,
        actorId: user.id,
        type: replyTo ? "reply" : "comment",
        message: replyTo ? `replied to your comment` : `commented on "${artwork.title}"`,
        artworkId: artwork.id,
      });
    },
    onSuccess: () => {
      setComment("");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
      queryClient.invalidateQueries({ queryKey: ["artworks"] });
    },
  });

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: artwork?.title ?? "Artwork on Lumen", url });
        return;
      } catch {
        /* user dismissed */
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  }

  async function report() {
    if (!requireAuth() || !artwork) return;
    await supabase.from("reports").insert({
      artwork_id: artwork.id,
      reporter_id: user!.id,
      reason: "Reported from artwork page",
    });
    toast.success("Thanks — our moderators will review this.");
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl px-4 py-20 text-muted-foreground">Loading artwork…</div>
      </AppShell>
    );
  }

  if (!artwork) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h1 className="text-3xl font-semibold">Artwork not found</h1>
        </div>
      </AppShell>
    );
  }

  const related = allArtworks
    .filter(
      (item) =>
        item.id !== artwork.id &&
        (item.category === artwork.category || item.artist_id === artwork.artist_id),
    )
    .slice(0, 4);

  const roots = comments.filter((item) => !item.parent_id);
  const repliesOf = (parentId: string) => comments.filter((item) => item.parent_id === parentId);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <ArtworkImage path={artwork.image_url} alt={artwork.title} priority className="w-full" />
          </div>

          <div>
            <h1 className="text-3xl font-semibold">{artwork.title}</h1>
            {artwork.profiles ? (
              <Link
                to="/artist/$username"
                params={{ username: artwork.profiles.username }}
                className="mt-4 flex items-center gap-3"
              >
                <Avatar className="size-11">
                  <AvatarImage src={artwork.profiles.avatar_url ?? undefined} alt="" />
                  <AvatarFallback>{initials(artwork.profiles.display_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{artwork.profiles.display_name}</p>
                  <p className="text-sm text-muted-foreground">@{artwork.profiles.username}</p>
                </div>
              </Link>
            ) : null}

            <p className="mt-6 text-muted-foreground">{artwork.description}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Badge className="rounded-full">{artwork.category}</Badge>
              {artwork.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="rounded-full">
                  #{tag}
                </Badge>
              ))}
            </div>

            {artwork.creation_date ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Created {new Date(artwork.creation_date).toLocaleDateString()}
              </p>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-2">
              <Button
                className="rounded-full"
                variant={liked ? "default" : "outline"}
                onClick={() => requireAuth() && toggleLike.mutate()}
              >
                <Heart className={liked ? "size-4 fill-current" : "size-4"} />
                {artwork.likes?.[0]?.count ?? 0}
              </Button>
              <Button
                className="rounded-full"
                variant={saved ? "secondary" : "outline"}
                onClick={() => requireAuth() && toggleSave.mutate()}
              >
                <Bookmark className={saved ? "size-4 fill-current" : "size-4"} />
                {saved ? "Saved" : "Save"}
              </Button>
              <Button className="rounded-full" variant="outline" onClick={() => void share()}>
                <Share2 className="size-4" /> Share
              </Button>
              <Button
                className="rounded-full"
                variant="ghost"
                onClick={() => void report()}
                aria-label="Report artwork"
              >
                <Flag className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <section className="mt-16">
          <h2 className="text-2xl font-semibold">Comments ({comments.length})</h2>

          <div className="mt-6 space-y-6">
            {roots.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-card p-5">
                <CommentBody item={item} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 rounded-full"
                  onClick={() => requireAuth() && setReplyTo(item)}
                >
                  Reply
                </Button>
                <div className="mt-3 space-y-3 border-l border-border pl-5">
                  {repliesOf(item.id).map((reply) => (
                    <CommentBody key={reply.id} item={reply} />
                  ))}
                </div>
              </div>
            ))}
            {roots.length === 0 ? (
              <p className="text-muted-foreground">No comments yet — be the first.</p>
            ) : null}
          </div>

          <div className="mt-8">
            {replyTo ? (
              <p className="mb-2 text-sm text-muted-foreground">
                Replying to {replyTo.profiles?.display_name ?? "a comment"} ·{" "}
                <button className="underline" onClick={() => setReplyTo(null)}>
                  cancel
                </button>
              </p>
            ) : null}
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={user ? "Share your thoughts…" : "Sign in to join the conversation"}
              rows={3}
              className="rounded-2xl"
            />
            <Button
              className="mt-3 rounded-full"
              disabled={!comment.trim()}
              onClick={() => requireAuth() && postComment.mutate()}
            >
              Post comment
            </Button>
          </div>
        </section>

        {related.length ? (
          <section className="mt-16">
            <h2 className="text-2xl font-semibold">Related artwork</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <ArtworkCard key={item.id} artwork={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function CommentBody({ item }: { item: CommentRow }) {
  return (
    <div className="flex gap-3">
      <Avatar className="size-9">
        <AvatarImage src={item.profiles?.avatar_url ?? undefined} alt="" />
        <AvatarFallback className="text-xs">
          {initials(item.profiles?.display_name ?? "Member")}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="text-sm font-medium">{item.profiles?.display_name ?? "Member"}</p>
        <p className="text-sm text-muted-foreground">{item.body}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {new Date(item.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
