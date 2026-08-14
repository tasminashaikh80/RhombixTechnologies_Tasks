import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ArtworkCard, MasonryGrid } from "@/components/ArtworkCard";
import { ArtworkImage } from "@/components/ArtworkImage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CATEGORIES,
  fetchArtworks,
  fetchPopularArtists,
  initials,
  likeCount,
  trendScore,
} from "@/lib/gallery";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen — Discover & Showcase Digital Artwork" },
      {
        name: "description",
        content:
          "Browse featured and trending digital artwork, follow artists, and build your own portfolio on Lumen.",
      },
      { property: "og:title", content: "Lumen — Discover & Showcase Digital Artwork" },
      {
        property: "og:description",
        content: "A gallery-grade home for digital painting, illustration, 3D art and photography.",
      },
      { property: "og:url", content: "https://chroma-spark-show.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://chroma-spark-show.lovable.app/" }],
  }),
  component: Home,
});

function Home() {
  const { data: artworks = [] } = useQuery({ queryKey: ["artworks"], queryFn: fetchArtworks });
  const { data: artists = [] } = useQuery({ queryKey: ["artists"], queryFn: fetchPopularArtists });

  const featured = artworks.filter((a) => a.featured).slice(0, 6);
  const hero = featured[0] ?? artworks[0];
  const trending = [...artworks].sort((a, b) => trendScore(b) - trendScore(a)).slice(0, 8);
  const recent = artworks.slice(0, 8);
  const topArtists = [...artists]
    .sort((a, b) => (b.artworks?.[0]?.count ?? 0) - (a.artworks?.[0]?.count ?? 0))
    .slice(0, 4);

  return (
    <AppShell>
      <section className="spotlight relative overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <Badge variant="secondary" className="rounded-full">
              <Sparkles className="mr-1 size-3.5" /> A gallery for digital artists
            </Badge>
            <h1 className="mt-5 text-balance text-5xl font-semibold leading-[1.05] sm:text-6xl">
              Where digital artwork finds its audience.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Showcase your portfolio, discover new work every day, and build a following of people
              who genuinely care about the craft.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/explore" search={{ q: "", category: "All", sort: "newest" }}>
                  Explore artwork <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Join as an artist
                </Link>
              </Button>
            </div>
          </div>

          {hero ? (
            <Link
              to="/artwork/$id"
              params={{ id: hero.id }}
              className="frame group relative block overflow-hidden rounded-3xl border border-border bg-card"
            >
              <ArtworkImage
                path={hero.image_url}
                alt={hero.title}
                priority
                className="aspect-4/5 w-full transition-transform duration-700 group-hover:scale-105 lg:aspect-4/3"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent p-6">
                <p className="display text-2xl font-semibold text-background">{hero.title}</p>
                <p className="text-sm text-background/80">
                  {hero.profiles?.display_name} · {likeCount(hero)} likes
                </p>
              </div>
            </Link>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <Link
              key={category}
              to="/explore"
              search={{ q: "", category, sort: "newest" }}
              className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              {category}
            </Link>
          ))}
        </div>
      </section>

      <Section
        title="Featured artwork"
        subtitle="Hand-picked pieces from the community"
        to="/explore"
      >
        <MasonryGrid artworks={featured} />
      </Section>

      <Section title="Trending now" subtitle="Most loved in the last weeks" to="/explore">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {trending.map((artwork) => (
            <ArtworkCard key={artwork.id} artwork={artwork} />
          ))}
        </div>
      </Section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <h2 className="text-3xl font-semibold">Popular artists</h2>
        <p className="mt-1 text-muted-foreground">People shaping the gallery right now</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {topArtists.map((artist) => (
            <Link
              key={artist.id}
              to="/artist/$username"
              params={{ username: artist.username }}
              className="frame rounded-2xl border border-border bg-card p-5 text-center"
            >
              <Avatar className="mx-auto size-16">
                <AvatarImage src={artist.avatar_url ?? undefined} alt="" />
                <AvatarFallback>{initials(artist.display_name)}</AvatarFallback>
              </Avatar>
              <p className="display mt-3 font-semibold">{artist.display_name}</p>
              <p className="text-xs text-muted-foreground">@{artist.username}</p>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{artist.bio}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                {artist.artworks?.[0]?.count ?? 0} artworks
              </p>
            </Link>
          ))}
        </div>
      </section>

      <Section title="Recently uploaded" subtitle="Fresh from the studio" to="/explore">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {recent.map((artwork) => (
            <ArtworkCard key={artwork.id} artwork={artwork} />
          ))}
        </div>
      </Section>
    </AppShell>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  to: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold">{title}</h2>
          <p className="mt-1 text-muted-foreground">{subtitle}</p>
        </div>
        <Button asChild variant="ghost" className="rounded-full">
          <Link to="/explore" search={{ q: "", category: "All", sort: "newest" }}>
            View all <ArrowRight className="ml-1 size-4" />
          </Link>
        </Button>
      </div>
      {children}
    </section>
  );
}
