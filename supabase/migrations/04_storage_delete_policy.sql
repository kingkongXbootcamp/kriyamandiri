-- Kebijakan Storage: Pengguna hanya dapat menghapus foto di dalam foldernya sendiri
CREATE POLICY "Pengguna dapat menghapus foto produk miliknya"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);