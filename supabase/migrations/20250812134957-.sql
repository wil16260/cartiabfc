-- Create EPCI table for managing EPCI (Établissement Public de Coopération Intercommunale) data
CREATE TABLE public.epci (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  geojson_data JSONB,
  geojson_url TEXT,
  population INTEGER,
  area_km2 DECIMAL,
  created_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT validate_geojson_source CHECK (
    (geojson_data IS NOT NULL AND geojson_url IS NULL) OR 
    (geojson_data IS NULL AND geojson_url IS NOT NULL)
  )
);

-- Enable Row Level Security
ALTER TABLE public.epci ENABLE ROW LEVEL SECURITY;

-- Create policies for EPCI access
CREATE POLICY "Admins can manage all EPCI data" 
ON public.epci 
FOR ALL 
USING (is_admin());

CREATE POLICY "Everyone can view active EPCI data" 
ON public.epci 
FOR SELECT 
USING (is_active = true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_epci_updated_at
BEFORE UPDATE ON public.epci
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_epci_code ON public.epci(code);
CREATE INDEX idx_epci_active ON public.epci(is_active);
CREATE INDEX idx_epci_name ON public.epci(name);