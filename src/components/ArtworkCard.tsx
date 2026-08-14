import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle } from "lucide-react";

import { ArtworkImage } from "@/components/ArtworkImage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { commentCount, initials, likeCount, type Artwork } from "@/lib/gallery";

export function ArtworkCard({ artwork }: { artwork: Artwork }) {
  return (
    <article className="frame mb-5 break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card">
      <Link
        to="/artwork/$id"
        params={{ id: artwork.id }}
        className="group relative block overflow-hidden"
      >
        <ArtworkImage
          path={artwork.image_url}
          alt={artwork.title}
          className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-0 bg-foreground/0 transition-colors duration-500 group-hover:bg-foreground/10" />
        {artwork.featured ? (
          <Badge className="absolute left-3 top-3 rounded-full">Featured</Badge>
        ) : null}
      </Link>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to="/artwork/$id"
              params={{ id: artwork.id }}
              className="display block truncate text-base font-semibold hover:text-primary"
            >
              {artwork.title}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{artwork.category}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3.5" />
              {likeCount(artwork)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="size-3.5" />
              {commentCount(artwork)}
            </span>
          </div>
        </div>
        {artwork.profiles ? (
          <Link
            to="/artist/$username"
            params={{ username: artwork.profiles.username }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Avatar className="size-6">
              <AvatarImage src={artwork.profiles.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="text-[10px]">
                {initials(artwork.profiles.display_name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{artwork.profiles.display_name}</span>
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function MasonryGrid({ artworks }: { artworks: Artwork[] }) {
  if (artworks.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
        No artwork here yet.
      </p>
    );
  }
  return (
    <div className="masonry">
      {artworks.map((artwork) => (
        <ArtworkCard key={artwork.id} artwork={artwork} />
      ))}
    </div>
  );
}
