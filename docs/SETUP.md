# Setup Guide

This guide will walk you through setting up the Document Template Generator from scratch.

## Step 1: Prerequisites

Before you begin, make sure you have:

1. **Node.js 18+** installed
   ```bash
   node --version  # Should be 18.0.0 or higher
   ```

2. **A Supabase account**
   - Sign up at https://supabase.com
   - Create a new project
   - Note your project URL and API keys

3. **An Anthropic API key**
   - Sign up at https://console.anthropic.com
   - Generate an API key
   - Ensure you have credits available

## Step 2: Supabase Configuration

### Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `database/migrations/001_initial_schema.sql`
4. Paste and run the SQL script
5. Verify that tables were created:
   - `templates`
   - `generated_documents`
   - `upload_sessions`

### Storage Setup

1. Navigate to Storage in Supabase dashboard
2. Create a new bucket named `user-documents`
3. Configure bucket policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-documents');

-- Allow users to read their own files
CREATE POLICY "Allow users to read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Authentication Setup

1. Navigate to Authentication > Settings
2. Enable Email authentication
3. Configure email templates (optional)
4. Set site URL to `http://localhost:5173` for development

## Step 3: Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Fill in environment variables:
```env
NODE_ENV=development
PORT=5000

# From Supabase Dashboard > Settings > API
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...

SUPABASE_STORAGE_BUCKET=user-documents

# From Anthropic Console
ANTHROPIC_API_KEY=sk-ant-...
```

5. Start the backend:
```bash
npm run dev
```

6. Verify it's running:
```bash
curl http://localhost:5000/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "environment": "development"
}
```

## Step 4: Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Fill in environment variables:
```env
# Same as backend Supabase settings
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

VITE_API_URL=http://localhost:5000
```

5. Start the frontend:
```bash
npm run dev
```

6. Open browser to `http://localhost:5173`

## Step 5: Testing the Application

### Create a Test Account

1. Go to `http://localhost:5173/login`
2. Click "Sign Up"
3. Enter email and password
4. Check your email for confirmation link (if email is configured)
5. Or check Supabase Dashboard > Authentication > Users to manually confirm

### Test Template Creation

1. Log in to the application
2. Click "Create New Template"
3. Upload 3 test Word documents
   - Use similar documents (e.g., 3 different invoices)
   - Documents must be .docx format
4. Wait for analysis to complete
5. Review results and save template

### Test Document Generation

1. From dashboard, click "Use Template" on a saved template
2. Fill out the form
3. Click "Generate Document"
4. Document should download automatically

## Troubleshooting

### Backend won't start

**Error: Missing environment variables**
- Check that all variables in `.env` are filled in
- Verify Supabase URL and keys are correct

**Error: Port already in use**
- Change PORT in `.env` to a different number
- Or kill the process using port 5000

### Frontend won't connect to backend

**Error: Network request failed**
- Check that backend is running on correct port
- Verify VITE_API_URL matches backend port
- Check CORS settings in backend

### File upload fails

**Error: Storage bucket not found**
- Verify bucket name matches `SUPABASE_STORAGE_BUCKET`
- Check bucket exists in Supabase dashboard
- Verify storage policies are configured

### Analysis takes too long

**Analysis timeout**
- Large documents may take longer
- Check Anthropic API key has credits
- Check backend logs for errors
- Increase timeout in polling logic if needed

### Document generation fails

**Error: Invalid template**
- Check that template has all required JSONs
- Verify schema structure is valid
- Check backend logs for detailed error

## Production Deployment

### Backend (Render.com)

1. Create account at render.com
2. Create new Web Service
3. Connect GitHub repository
4. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Add environment variables from `.env`
5. Deploy

### Frontend (Render.com or Vercel)

1. Create new Static Site
2. Connect GitHub repository
3. Configure:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
   - Add environment variables
4. Deploy

### Post-Deployment

1. Update Supabase Site URL to production URL
2. Update CORS settings in backend
3. Test all functionality in production
4. Monitor logs for errors

## Next Steps

- Read the [API Documentation](./API.md)
- Review [Security Best Practices](./SECURITY.md)
- Check out [Example Templates](./EXAMPLES.md)

