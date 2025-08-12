-- Add user-level RLS policies for documents table
-- Users should be able to manage their own documents

-- Policy for users to view their own documents
CREATE POLICY "Users can view their own documents" 
ON public.documents 
FOR SELECT 
USING (auth.uid() = created_by);

-- Policy for users to create documents (must set created_by to their own ID)
CREATE POLICY "Users can create their own documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Policy for users to update their own documents
CREATE POLICY "Users can update their own documents" 
ON public.documents 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Policy for users to delete their own documents
CREATE POLICY "Users can delete their own documents" 
ON public.documents 
FOR DELETE 
USING (auth.uid() = created_by);