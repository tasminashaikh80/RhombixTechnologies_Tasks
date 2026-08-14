import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/AppShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { fetchPopularArtists, initials } from "@/lib/gallery";

export const Route = createFileRoute("/artists")({
  head: () => ({
    meta: [
      { title: "Artists on Lumen — Digital Art Portfolios" },
      {
        name: "description",
        content:
          "Meet the illustrators, 3D artists, concept artists and photographers publishing their portfolios on Lumen.",
      },
      { property: "og:title", content: "Artists on Lumen — Digital Art Portfolios" },
      {
        property: "og:description",
        content: "Browse artist profiles, specialties and portfolios across the Lumen community.",
      },
      { property: "og:url", content: "https://chroma-spark-show.lovable.app/artists" },
    ],
    links: [{ rel: "canonical", href: "https://chroma-spark-show.lovable.app/artists" }],
  }),
  component: Artists,
});

function Artists() {
  const { data: artists = [] } = useQuery({ queryKey: ["artists"], queryFn: fetchPopularArtists });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-semibold">Artists</h1>
        <p className="mt-2 text-muted-foreground">{artists.length} artists in the community</p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
            <Link
              key={artist.id}
              to="/artist/$username"
              params={{ username: artist.username }}
              className="frame rounded-2xl border border-border bg-card p-6"
            >
              <div className="flex items-center gap-4">
                <Avatar className="size-14">
                  <AvatarImage src={artist.avatar_url ?? undefined} alt="" />
                  <AvatarFallback>{initials(artist.display_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="display truncate text-lg font-semibold">{artist.display_name}</p>
                  <p className="truncate text-sm text-muted-foreground">@{artist.username}</p>
                </div>
              </div>
              <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{artist.bio}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {artist.skills.slice(0, 3).map((skill) => (
                  <Badge key={skill} variant="secondary" className="rounded-full">
                    {skill}
                  </Badge>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {artist.artworks?.[0]?.count ?? 0} artworks
              </p>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
