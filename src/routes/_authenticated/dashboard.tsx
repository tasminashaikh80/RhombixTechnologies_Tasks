import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Eye, Heart, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ArtworkCard, MasonryGrid } from "@/components/ArtworkCard";
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
  component: Dashboard;
});

function Dashboard() {
  return null;
}
