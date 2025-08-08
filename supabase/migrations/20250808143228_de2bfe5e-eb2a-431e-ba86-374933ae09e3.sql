-- Create a table to store AI configuration settings
CREATE TABLE public.ai_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_name TEXT NOT NULL,
  api_key_name TEXT NOT NULL, -- Name of the secret in Supabase
  system_prompt TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access only
CREATE POLICY "Only admins can manage AI config" 
ON public.ai_config 
FOR ALL 
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_config_updated_at
BEFORE UPDATE ON public.ai_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default Mistral configuration
INSERT INTO public.ai_config (model_name, api_key_name, system_prompt, is_active)
VALUES (
  'mistral-large-latest',
  'MISTRAL_API_KEY',
  'Vous êtes un assistant IA géospatial expert qui aide les utilisateurs à créer de belles cartes précises de la région Bourgogne-Franche-Comté à partir de descriptions en langage naturel. Concentrez-vous sur l''interprétation des exigences géographiques, l''analyse de données et les préférences de style visuel pour cette région spécifique.',
  true
);