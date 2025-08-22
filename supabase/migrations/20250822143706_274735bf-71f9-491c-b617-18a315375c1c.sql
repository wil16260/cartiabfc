-- Create shared_maps table for permanent map sharing
CREATE TABLE public.shared_maps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  map_data JSONB NOT NULL,
  layers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_public BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64url')
);

-- Enable RLS
ALTER TABLE public.shared_maps ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view public shared maps" 
ON public.shared_maps 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Users can view their own shared maps" 
ON public.shared_maps 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can create shared maps" 
ON public.shared_maps 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own shared maps" 
ON public.shared_maps 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own shared maps" 
ON public.shared_maps 
FOR DELETE 
USING (auth.uid() = created_by);

-- Admins can see all shared maps
CREATE POLICY "Admins can view all shared maps" 
ON public.shared_maps 
FOR ALL 
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_shared_maps_updated_at
BEFORE UPDATE ON public.shared_maps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_shared_maps_share_token ON public.shared_maps(share_token);
CREATE INDEX idx_shared_maps_created_by ON public.shared_maps(created_by);
CREATE INDEX idx_shared_maps_is_public ON public.shared_maps(is_public);