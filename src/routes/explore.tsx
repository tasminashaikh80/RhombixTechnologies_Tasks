import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { MasonryGrid } from "@/components/ArtworkCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, fetchArtworks, likeCount, trendScore } from "@/lib/gallery";

type ExploreSearch = { q: string; category: string; sort: "newest" | "liked" | "trending" };

export const Route = createFileRoute("/explore")({
  validateSearch: (search: Record<string, unknown>): ExploreSearch => ({
    q: typeof search["q"] === "string" ? search["q"] : "",
    category: typeof search["category"] === "string" ? search["category"] : "All",
    sort:
      search["sort"] === "liked" || search["sort"] === "trending"
        ? search["sort"]
        : ("newest" as const),
  }),
  head: () => ({
    meta: [
      { title: "Explore Digital Artwork — Lumen" },
      {
        name: "description",
        content:
          "Search and filter thousands of digital paintings, illustrations, 3D renders, concept art and photography by category, popularity and recency.",
      },
      { property: "og:title", content: "Explore Digital Artwork — Lumen" },
      {
        property: "og:description",
        content: "Browse the full Lumen gallery by category, keyword, artist or trend.",
      },
    ],
  }),
  component: Explore,
});

function Explore() {
  const { q, category, sort } = Route.useSearch();
  const navigate = useNavigate({ from: "/explore" });
  const { data: artworks = [], isLoading } = useQuery({
    queryKey: ["artworks"],
    queryFn: fetchArtworks,
  });

  const term = q.trim().toLowerCase();
  let results = artworks.filter((artwork) => {
    const matchesCategory = category === "All" || artwork.category === category;
    const haystack = [
      artwork.title,
      artwork.description ?? "",
      artwork.category,
      artwork.tags.join(" "),
      artwork.profiles?.display_name ?? "",
      artwork.profiles?.username ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return matchesCategory && (!term || haystack.includes(term));
  });

  if (sort === "liked") results = [...results].sort((a, b) => likeCount(b) - likeCount(a));
  if (sort === "trending") results = [...results].sort((a, b) => trendScore(b) - trendScore(a));

  const update = (patch: Partial<ExploreSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-semibold">Explore artwork</h1>
        <p className="mt-2 text-muted-foreground">
          {isLoading ? "Loading the gallery…" : `${results.length} pieces on the wall`}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) => update({ q: event.target.value })}
              placeholder="Search by title, artist, tag or keyword"
              className="rounded-full pl-9"
            />
          </div>
          <Select value={category} onValueChange={(value) => update({ category: value })}>
            <SelectTrigger className="w-full rounded-full sm:w-56">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All categories</SelectItem>
              {CATEGORIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sort}
            onValueChange={(value) => update({ sort: value as ExploreSearch["sort"] })}
          >
            <SelectTrigger className="w-full rounded-full sm:w-44">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="liked">Most liked</SelectItem>
              <SelectItem value="trending">Trending</SelectItem>
            </SelectContent>
          </Select>
          {(q || category !== "All" || sort !== "newest") && (
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => update({ q: "", category: "All", sort: "newest" })}
            >
              Reset
            </Button>
          )}
        </div>

        <div className="mt-10">
          <MasonryGrid artworks={results} />
        </div>
      </div>
    </AppShell>
  );
}
