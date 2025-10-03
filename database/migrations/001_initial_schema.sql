-- Document Template Generator Database Schema
-- Run this migration in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  document_type VARCHAR(100), -- e.g., "SWMS", "OEMP", "JSA"
  industry VARCHAR(100), -- e.g., "Marine Industrial", "Construction"
  
  -- Core template data
  schema_json JSONB NOT NULL,
  content_json JSONB NOT NULL,
  structure_json JSONB NOT NULL,
  
  -- Template file storage
  template_docx_url TEXT,
  
  -- Metadata
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, archived
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Analysis metadata
  source_files_count INTEGER DEFAULT 3,
  analysis_confidence_score DECIMAL(3,2) -- 0.00-1.00
);

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_document_type ON templates(document_type);
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);

-- Generated documents table
CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  
  -- Document data
  name VARCHAR(255) NOT NULL,
  user_data_json JSONB NOT NULL,
  output_docx_url TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_docs_user_id ON generated_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_template_id ON generated_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_created_at ON generated_documents(created_at DESC);

-- Upload sessions (for tracking 3-doc analysis process)
CREATE TABLE IF NOT EXISTS upload_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Upload tracking
  file_urls TEXT[], -- Array of 3 Supabase Storage URLs
  status VARCHAR(50) DEFAULT 'uploading', -- uploading, analyzing, review, completed, failed
  
  -- Analysis results (temporary storage before template creation)
  schema_json JSONB,
  content_json JSONB,
  structure_json JSONB,
  analysis_log TEXT,
  confidence_score DECIMAL(3,2),
  document_type VARCHAR(100),
  industry VARCHAR(100),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_user_id ON upload_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON upload_sessions(status);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_expires_at ON upload_sessions(expires_at);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;

-- Templates policies
CREATE POLICY "Users can view their own templates"
  ON templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
  ON templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON templates FOR DELETE
  USING (auth.uid() = user_id);

-- Generated documents policies
CREATE POLICY "Users can view their own documents"
  ON generated_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
  ON generated_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON generated_documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON generated_documents FOR DELETE
  USING (auth.uid() = user_id);

-- Upload sessions policies
CREATE POLICY "Users can view their own upload sessions"
  ON upload_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own upload sessions"
  ON upload_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own upload sessions"
  ON upload_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own upload sessions"
  ON upload_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_documents_updated_at
  BEFORE UPDATE ON generated_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_upload_sessions_updated_at
  BEFORE UPDATE ON upload_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired upload sessions (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM upload_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE templates IS 'Stores document templates created from analyzed documents';
COMMENT ON TABLE generated_documents IS 'Stores generated documents created from templates';
COMMENT ON TABLE upload_sessions IS 'Temporary storage for document upload and analysis sessions';
COMMENT ON COLUMN templates.schema_json IS 'Form field definitions for data collection';
COMMENT ON COLUMN templates.content_json IS 'Boilerplate content and conditional sections';
COMMENT ON COLUMN templates.structure_json IS 'Document structure and layout definition';

