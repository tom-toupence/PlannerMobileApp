-- Profils utilisateurs
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  default_group_id UUID REFERENCES groups(id) ON DELETE SET NULL
);

-- Groupes d'amis
CREATE TABLE groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membres des groupes
CREATE TABLE group_members (
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  color TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- Événements du calendrier partagé
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages dans les groupes
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos partagées dans les groupes
CREATE TABLE group_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Créer automatiquement un profil quand un user s'inscrit
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row Level Security (RLS) - Sécurité
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_photos ENABLE ROW LEVEL SECURITY;

-- Policies : qui peut voir/modifier quoi

-- Profils : tout le monde peut voir, seul le propriétaire peut modifier
CREATE POLICY "Profiles visibles par tous" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users peuvent modifier leur profil" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Groupes : visibles par les membres
CREATE POLICY "Groupes visibles par membres" ON groups FOR SELECT
  USING (id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));
CREATE POLICY "Membres peuvent créer des groupes" ON groups FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Membres peuvent modifier le groupe" ON groups FOR UPDATE
  USING (id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));

-- Membres : visibles par les autres membres du groupe
CREATE POLICY "Membres visibles par le groupe" ON group_members FOR SELECT
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));
CREATE POLICY "Admins peuvent gérer les membres" ON group_members FOR ALL
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users peuvent rejoindre" ON group_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Events : visibles et modifiables par les membres du groupe
CREATE POLICY "Events visibles par membres" ON events FOR SELECT
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));
CREATE POLICY "Membres peuvent créer des events" ON events FOR INSERT
  WITH CHECK (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));
CREATE POLICY "Créateur peut modifier son event" ON events FOR UPDATE
  USING (created_by = auth.uid());
CREATE POLICY "Créateur peut supprimer son event" ON events FOR DELETE
  USING (created_by = auth.uid());

-- Messages : visibles et créables par les membres du groupe
CREATE POLICY "Messages visibles par membres" ON messages FOR SELECT
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));
CREATE POLICY "Membres peuvent envoyer des messages" ON messages FOR INSERT
  WITH CHECK (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));
