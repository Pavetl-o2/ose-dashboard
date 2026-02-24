-- ============================================================
-- OSE Dashboard - Supabase Setup Guide
-- St. Regis Costa Mujeres - Inventory Management System
-- ============================================================
--
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en https://supabase.com/dashboard
-- 2. Navega a "SQL Editor" en el menu lateral izquierdo
-- 3. Copia y pega TODO este script
-- 4. Haz clic en "Run" para ejecutarlo
-- ============================================================

-- ============================================================
-- PASO 1: Crear tabla de entradas de inventario
-- ============================================================
-- Cada registro representa una llegada/recepcion de articulos
CREATE TABLE inventory_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_code TEXT NOT NULL,            -- codigo del articulo (campo 'ic' del dashboard)
  centro_consumo TEXT NOT NULL,       -- centro de consumo (campo 'cc')
  quantity_received INTEGER NOT NULL, -- cantidad recibida en esta entrada
  received_date DATE DEFAULT CURRENT_DATE, -- fecha de recepcion
  notes TEXT,                         -- notas adicionales
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PASO 2: Crear tabla de fotos de evidencia
-- ============================================================
-- Cada entrada puede tener multiples fotos como evidencia
CREATE TABLE entry_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID REFERENCES inventory_entries(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,            -- URL de la foto en Supabase Storage
  file_name TEXT,                     -- nombre original del archivo
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PASO 3: Habilitar Row Level Security (RLS)
-- ============================================================
ALTER TABLE inventory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_photos ENABLE ROW LEVEL SECURITY;

-- Politicas de acceso publico (para uso sin autenticacion)
-- NOTA: Para produccion, considera agregar autenticacion
CREATE POLICY "Permitir lectura publica de entradas"
  ON inventory_entries FOR SELECT USING (true);

CREATE POLICY "Permitir insercion publica de entradas"
  ON inventory_entries FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualizacion publica de entradas"
  ON inventory_entries FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Permitir eliminacion publica de entradas"
  ON inventory_entries FOR DELETE USING (true);

CREATE POLICY "Permitir lectura publica de fotos"
  ON entry_photos FOR SELECT USING (true);

CREATE POLICY "Permitir insercion publica de fotos"
  ON entry_photos FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir eliminacion publica de fotos"
  ON entry_photos FOR DELETE USING (true);

-- ============================================================
-- PASO 4: Crear bucket de Storage para fotos
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('entry-photos', 'entry-photos', true);

-- Politicas de acceso al bucket
CREATE POLICY "Permitir subida publica de fotos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'entry-photos');

CREATE POLICY "Permitir lectura publica de fotos storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'entry-photos');

CREATE POLICY "Permitir eliminacion publica de fotos storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'entry-photos');

-- ============================================================
-- PASO 5: Crear indices para mejor rendimiento
-- ============================================================
CREATE INDEX idx_entries_item_code ON inventory_entries(item_code);
CREATE INDEX idx_entries_centro ON inventory_entries(centro_consumo);
CREATE INDEX idx_entries_date ON inventory_entries(received_date);
CREATE INDEX idx_photos_entry ON entry_photos(entry_id);

-- ============================================================
-- VERIFICACION: Ejecuta esto para confirmar que todo se creo
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('inventory_entries', 'entry_photos');
