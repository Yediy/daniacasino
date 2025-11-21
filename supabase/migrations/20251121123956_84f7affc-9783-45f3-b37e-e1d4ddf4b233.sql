-- Create storage buckets for the application
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('barcodes', 'barcodes', false, 5242880, ARRAY['image/png', 'image/jpeg', 'application/pdf']),
  ('seat-maps', 'seat-maps', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/svg+xml']),
  ('event-images', 'event-images', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Barcodes bucket policies (private - users can view their own)
CREATE POLICY "Users can view own barcodes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'barcodes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Staff can view all barcodes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'barcodes'
  AND (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role))
);

CREATE POLICY "Service can upload barcodes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'barcodes');

-- Seat maps bucket policies (private - staff only)
CREATE POLICY "Staff can manage seat maps"
ON storage.objects FOR ALL
USING (
  bucket_id = 'seat-maps'
  AND (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role))
)
WITH CHECK (
  bucket_id = 'seat-maps'
  AND (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role))
);

-- Event images bucket policies (public read, staff write)
CREATE POLICY "Anyone can view event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

CREATE POLICY "Staff can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-images'
  AND (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role))
);

CREATE POLICY "Staff can update event images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'event-images'
  AND (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role))
);

CREATE POLICY "Staff can delete event images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-images'
  AND (has_role(auth.uid(), 'Staff'::app_role) OR has_role(auth.uid(), 'Admin'::app_role))
);