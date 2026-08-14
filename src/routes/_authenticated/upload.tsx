import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES } from "@/lib/gallery";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Upload artwork — Lumen" },
      {
        name: "description",
        content: "Publish a new piece to your Lumen portfolio with title, description and tags.",
      },
      { property: "og:title", content: "Upload artwork — Lumen" },
      { property: "og:description", content: "Add a new piece to your Lumen portfolio." },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Digital Painting");
  const [tags, setTags] = useState("");
  const [creationDate, setCreationDate] = useState("");
  const [busy, setBusy] = useState(false);

  function onFile(selected: File | null) {
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      toast.error("Images must be under 10MB.");
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !file) {
      toast.error("Pick an image to upload.");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("artworks")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("artworks")
        .insert({
          artist_id: user.id,
          title,
          description,
          category,
          image_url: path,
          tags: tags
            .split(",")
            .map((tag) => tag.trim().replace(/^#/, ""))
            .filter(Boolean),
          creation_date: creationDate || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      toast.success("Artwork published.");
      navigate({ to: "/artwork/$id", params: { id: data.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold">Upload artwork</h1>
        <p className="mt-2 text-muted-foreground">
          Add a new piece to your portfolio. JPG, PNG or WebP up to 10MB.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-6">
          <label className="flex aspect-[16/9] cursor-pointer items-center justify-center overflow-hidden rounded-3xl border border-dashed border-border bg-card">
            {preview ? (
              <img src={preview} alt="Preview" className="size-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImagePlus className="size-8" />
                Choose an image
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => onFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Tell the story behind the piece…"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((item) => item !== "All").map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="creation-date">Creation date</Label>
              <Input
                id="creation-date"
                type="date"
                value={creationDate}
                onChange={(event) => setCreationDate(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="neon, cyberpunk, portrait"
            />
          </div>

          <Button type="submit" className="rounded-full" disabled={busy}>
            {busy ? "Publishing…" : "Publish artwork"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
