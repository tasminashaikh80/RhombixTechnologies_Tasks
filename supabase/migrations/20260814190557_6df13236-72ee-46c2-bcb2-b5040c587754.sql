
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TYPE public.account_type AS ENUM ('artist','enthusiast');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  bio text DEFAULT '',
  avatar_url text,
  cover_url text,
  account_type public.account_type NOT NULL DEFAULT 'enthusiast',
  skills text[] NOT NULL DEFAULT '{}',
  website text,
  twitter text,
  instagram text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles are public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.artworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  image_url text NOT NULL,
  category text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  creation_date date,
  featured boolean NOT NULL DEFAULT false,
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX artworks_artist_idx ON public.artworks(artist_id);
GRANT SELECT ON public.artworks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artworks TO authenticated;
GRANT ALL ON public.artworks TO service_role;
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "artworks are public" ON public.artworks FOR SELECT USING (true);
CREATE POLICY "artists insert own artwork" ON public.artworks FOR INSERT TO authenticated WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "artists update own artwork" ON public.artworks FOR UPDATE TO authenticated USING (auth.uid() = artist_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = artist_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "artists delete own artwork" ON public.artworks FOR DELETE TO authenticated USING (auth.uid() = artist_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.likes (
  user_id uuid NOT NULL,
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, artwork_id)
);
GRANT SELECT ON public.likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.likes TO authenticated;
GRANT ALL ON public.likes TO service_role;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes are public" ON public.likes FOR SELECT USING (true);
CREATE POLICY "insert own like" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own like" ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.favorites (
  user_id uuid NOT NULL,
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, artwork_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own favorite" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own favorite" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.follows (
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);
GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows are public" ON public.follows FOR SELECT USING (true);
CREATE POLICY "insert own follow" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id AND follower_id <> following_id);
CREATE POLICY "delete own follow" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_artwork_idx ON public.comments(artwork_id);
GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments are public" ON public.comments FOR SELECT USING (true);
CREATE POLICY "insert own comment" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own comment" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own comment" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  artwork_id uuid REFERENCES public.artworks(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id AND auth.uid() <> user_id);
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.artwork_views (
  user_id uuid NOT NULL,
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, artwork_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artwork_views TO authenticated;
GRANT ALL ON public.artwork_views TO service_role;
ALTER TABLE public.artwork_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own views" ON public.artwork_views FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report own or admin read" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "insert own report" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "admin update report" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "artwork images read" ON storage.objects FOR SELECT USING (bucket_id = 'artworks');
CREATE POLICY "artwork images upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'artworks' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "artwork images update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'artworks' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "artwork images delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'artworks' AND auth.uid()::text = (storage.foldername(name))[1]);

INSERT INTO public.profiles (id, username, display_name, bio, account_type, skills, website, twitter, instagram) VALUES
 ('a0000000-0000-4000-8000-000000000001','nova_ink','Nova Ink','Neon dreamscapes and cyber portraits. Painting light since 2014.','artist','{"Digital Painting","Character Art","Concept Art"}','https://novaink.art','novaink','novaink'),
 ('a0000000-0000-4000-8000-000000000002','mira_sol','Mira Solace','Soft illustration and storybook worlds.','artist','{"Illustration","Anime/Fantasy"}','https://mirasolace.com','mirasol','mira.solace'),
 ('a0000000-0000-4000-8000-000000000003','kaiju_ren','Ren Kaida','3D artist crafting impossible architecture.','artist','{"3D Art","Concept Art"}',NULL,'renkaida','ren.kaida'),
 ('a0000000-0000-4000-8000-000000000004','ada_frames','Ada Frames','Photographer chasing fog, glass and quiet light.','artist','{"Photography","Abstract Art"}',NULL,NULL,'adaframes');

INSERT INTO public.artworks (id, artist_id, title, description, image_url, category, tags, featured, views, creation_date, created_at) VALUES
 ('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','Neon Reverie','A rain-slick skyline dreaming in magenta and cyan.','/images/art-1.jpg','Digital Painting','{"neon","cyberpunk","city"}',true,1420,'2026-05-02', now() - interval '3 days'),
 ('b0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','Ghost Signal','Portrait study of a wanderer tuned to another frequency.','/images/art-2.jpg','Character Art','{"portrait","scifi"}',false,860,'2026-04-11', now() - interval '9 days'),
 ('b0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000002','Paper Lantern Grove','Illustration of a festival glowing between the trees.','/images/art-3.jpg','Illustration','{"warm","festival","folk"}',true,2110,'2026-03-21', now() - interval '15 days'),
 ('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000002','Sky Whale Migration','Fantasy scene from a world where oceans float.','/images/art-4.jpg','Anime/Fantasy','{"fantasy","whale","sky"}',false,1740,'2026-02-08', now() - interval '22 days'),
 ('b0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000003','Brutalist Bloom','3D render of concrete geometry breaking into flowers.','/images/art-5.jpg','3D Art','{"render","architecture"}',true,990,'2026-05-19', now() - interval '2 days'),
 ('b0000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000003','Orbital Depot','Concept art for a freight station above a gas giant.','/images/art-6.jpg','Concept Art','{"space","industrial"}',false,640,'2026-01-30', now() - interval '31 days'),
 ('b0000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000004','Glass Morning','Photograph of condensation and low winter sun.','/images/art-7.jpg','Photography','{"minimal","light"}',false,530,'2026-04-27', now() - interval '6 days'),
 ('b0000000-0000-4000-8000-000000000008','a0000000-0000-4000-8000-000000000004','Field of Static','Abstract composition in ink, dust and pigment.','/images/art-8.jpg','Abstract Art','{"abstract","texture"}',true,780,'2026-05-12', now() - interval '1 day');

INSERT INTO public.comments (artwork_id, user_id, body, created_at) VALUES
 ('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002','The colour temperature shift here is gorgeous.', now() - interval '2 days'),
 ('b0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000004','Those lanterns feel warm enough to hold.', now() - interval '10 days'),
 ('b0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000001','Concrete has never looked this soft.', now() - interval '1 day');

INSERT INTO public.likes (user_id, artwork_id) VALUES
 ('a0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001'),
 ('a0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000001'),
 ('a0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000001'),
 ('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000003'),
 ('a0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000003'),
 ('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000005'),
 ('a0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000008'),
 ('a0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000004');

INSERT INTO public.follows (follower_id, following_id) VALUES
 ('a0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001'),
 ('a0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000001'),
 ('a0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000002'),
 ('a0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003');
