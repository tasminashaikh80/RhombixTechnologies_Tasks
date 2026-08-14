import { supabase } from "@/integrations/supabase/client";

export const CATEGORIES = [
  "Digital Painting",
  "Illustration",
  "Character Art",
  "Concept Art",
  "3D Art",
  "Photography",
  "Abstract Art",
  "Anime/Fantasy",
] as const;

export type ArtistLite = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export type Artwork = {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  image_url: string;
  category: string;
  tags: string[];
  creation_date: string | null;
  featured: boolean;
  views: number;
  created_at: string;
  profiles: ArtistLite | null;
  likes: { count: number }[];
  comments: { count: number }[];
};

const ARTWORK_SELECT =
  "*, profiles!artworks_artist_id_fkey(id,username,display_name,avatar_url), likes(count), comments(count)";

export const likeCount = (a: Artwork) => a.likes?.[0]?.count ?? 0;
export const commentCount = (a: Artwork) => a.comments?.[0]?.count ?? 0;
export const trendScore = (a: Artwork) =>
  likeCount(a) * 12 + commentCount(a) * 8 + a.views / 25;

export async function fetchArtworks(): Promise<Artwork[]> {
  const { data, error } = await supabase
    .from("artworks")
    .select(ARTWORK_SELECT)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as unknown as Artwork[];
}

export async function fetchArtwork(id: string): Promise<Artwork | null> {
  const { data, error } = await supabase
    .from("artworks")
    .select(ARTWORK_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as Artwork | null;
}

export async function fetchArtistArtworks(artistId: string): Promise<Artwork[]> {
  const { data, error } = await supabase
    .from("artworks")
    .select(ARTWORK_SELECT)
    .eq("artist_id", artistId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Artwork[];
}

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  account_type: "artist" | "enthusiast";
  skills: string[];
  website: string | null;
  twitter: string | null;
  instagram: string | null;
  created_at: string;
};

export async function fetchProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Profile | null;
}

export async function fetchPopularArtists() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, artworks!artworks_artist_id_fkey(count)")
    .eq("account_type", "artist")
    .limit(24);
  if (error) throw error;
  return (data ?? []) as unknown as (Profile & { artworks: { count: number }[] })[];
}

export async function fetchFollowerCounts(profileId: string) {
  const [followers, following] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profileId),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profileId),
  ]);
  return { followers: followers.count ?? 0, following: following.count ?? 0 };
}

export async function notify(params: {
  userId: string;
  actorId: string;
  type: string;
  message: string;
  artworkId?: string | null;
}) {
  if (params.userId === params.actorId) return;
  await supabase.from("notifications").insert({
    user_id: params.userId,
    actor_id: params.actorId,
    type: params.type,
    message: params.message,
    artwork_id: params.artworkId ?? null,
  });
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
