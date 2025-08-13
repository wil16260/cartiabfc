-- Add validation and geodata import fields to ai_generation_logs table
ALTER TABLE public.ai_generation_logs 
ADD COLUMN validated BOOLEAN DEFAULT NULL,
ADD COLUMN validation_notes TEXT,
ADD COLUMN corrected_geodata_url TEXT,
ADD COLUMN corrected_geodata JSONB,
ADD COLUMN validated_by uuid,
ADD COLUMN validated_at TIMESTAMP WITH TIME ZONE;

-- Add check constraint for geodata URL validation using existing function
ALTER TABLE public.ai_generation_logs 
ADD CONSTRAINT check_geodata_url 
CHECK (corrected_geodata_url IS NULL OR validate_geojson_url(corrected_geodata_url));