-- Create table to store generated GeoJSON data
CREATE TABLE IF NOT EXISTS public.generated_geojson (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  geojson_data jsonb NOT NULL,
  ai_prompt text,
  created_by uuid,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_geojson ENABLE ROW LEVEL SECURITY;

-- Policies for generated_geojson
CREATE POLICY "Users can view their own generated geojson"
ON public.generated_geojson
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own generated geojson"
ON public.generated_geojson
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own generated geojson"
ON public.generated_geojson
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own generated geojson"
ON public.generated_geojson
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Everyone can view public generated geojson"
ON public.generated_geojson
FOR SELECT
TO authenticated
USING (is_public = true);

CREATE POLICY "Admins can manage all generated geojson"
ON public.generated_geojson
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_generated_geojson_updated_at
BEFORE UPDATE ON public.generated_geojson
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();