-- Create AI configuration table
CREATE TABLE public.ai_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  model_name TEXT NOT NULL DEFAULT 'mistral-large-latest',
  system_prompt TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_config (public read access for active configs)
CREATE POLICY "Public can view active AI configs" 
ON public.ai_config 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Authenticated users can view all AI configs" 
ON public.ai_config 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage AI configs" 
ON public.ai_config 
FOR ALL 
USING (public.is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_config_updated_at
BEFORE UPDATE ON public.ai_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default active AI configuration for Mistral
INSERT INTO public.ai_config (
  name,
  model_name,
  system_prompt,
  is_active
) VALUES (
  'Mistral Map Generator',
  'mistral-large-latest',
  'Vous êtes un assistant IA géospatial expert qui aide les utilisateurs à créer de belles cartes précises de la région Bourgogne-Franche-Comté en utilisant les données communales disponibles. Vous analysez les demandes des utilisateurs et générez des configurations de cartes thématiques appropriées avec des choix de couleurs harmonieux et des analyses géographiques pertinentes.',
  true
);