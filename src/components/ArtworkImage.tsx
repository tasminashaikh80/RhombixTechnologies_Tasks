import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Artwork images are either seeded static files ("/images/...") or objects in
 * the private storage bucket, which need a short-lived signed URL.
 */
export function useArtworkImageUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["image-url", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      if (!path) return "";
      if (path.startsWith("/") || path.startsWith("http") || path.startsWith("data:")) return path;
      const { data } = await supabase.storage.from("artworks").createSignedUrl(path, 60 * 60);
      return data?.signedUrl ?? "";
    },
  });
}

export function ArtworkImage({
  path,
  alt,
  className,
  priority,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const { data: src } = useArtworkImageUrl(path);

  if (!src) {
    return <div className={cn("animate-pulse bg-muted", className)} aria-hidden />;
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      className={cn("block w-full object-cover", className)}
    />
  );
}
