-- Create table for AI generation logs
CREATE TABLE public.ai_generation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_prompt TEXT NOT NULL,
  ai_response JSONB,
  raw_ai_response TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  model_name TEXT,
  system_prompt TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for AI generation logs
CREATE POLICY "Admins can view all generation logs" 
ON public.ai_generation_logs 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can manage all generation logs" 
ON public.ai_generation_logs 
FOR ALL 
USING (is_admin());

-- Create index for better performance
CREATE INDEX idx_ai_generation_logs_created_at ON public.ai_generation_logs(created_at DESC);
CREATE INDEX idx_ai_generation_logs_success ON public.ai_generation_logs(success);