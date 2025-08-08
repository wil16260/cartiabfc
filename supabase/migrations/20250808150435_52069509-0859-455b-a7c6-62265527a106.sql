-- Create documents table for RAG system
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  prompt TEXT, -- User-provided prompt/context for the document
  metadata JSONB DEFAULT '{}', -- Store additional metadata like tags, categories
  embedding_processed BOOLEAN DEFAULT false, -- Track if document has been processed for RAG
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policies for documents
CREATE POLICY "Admins can manage all documents" 
ON public.documents 
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false);

-- Create storage policies for documents
CREATE POLICY "Admins can view all documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents' AND is_admin());

CREATE POLICY "Admins can upload documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND is_admin());

CREATE POLICY "Admins can update documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'documents' AND is_admin());

CREATE POLICY "Admins can delete documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'documents' AND is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();