-- Supabase Storage Bucket Configuration

-- 1. Create the 'attachments' bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public access to read files
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'attachments');

-- 3. Allow authenticated users to upload files
CREATE POLICY "Authenticated Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- 4. Allow users to update/delete their own uploads (optional but recommended)
CREATE POLICY "Owner Update/Delete Access"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'attachments' AND auth.uid() = owner);
