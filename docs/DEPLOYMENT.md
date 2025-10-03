# Deployment Guide

This guide covers deploying the Document Template Generator to production on Render.com.

## Prerequisites

- GitHub account with repository
- Render.com account
- Supabase project (already set up)
- Anthropic API key

## Step 1: Prepare for Deployment

### Update Configuration

1. **Backend**: Ensure `backend/package.json` has start script:
```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js"
  }
}
```

2. **Frontend**: Ensure build script is configured:
```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### Push to GitHub

1. Create a new repository on GitHub
2. Push your code:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/document-template-generator.git
git push -u origin main
```

## Step 2: Deploy Backend to Render

### Create Web Service

1. Log in to render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:

**Basic Settings:**
- Name: `document-template-generator-api`
- Region: Choose closest to your users
- Branch: `main`
- Root Directory: `backend`
- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`

**Environment:**
- Instance Type: `Starter` ($7/month) or higher

**Environment Variables:**
Add all variables from your `.env`:
```
NODE_ENV=production
PORT=5000
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_STORAGE_BUCKET=user-documents
ANTHROPIC_API_KEY=your-key
```

5. Click "Create Web Service"
6. Wait for deployment to complete
7. Note your backend URL (e.g., `https://your-app.onrender.com`)

### Verify Backend

Test the health endpoint:
```bash
curl https://your-app.onrender.com/health
```

## Step 3: Deploy Frontend to Render

### Create Static Site

1. In Render dashboard, click "New +" → "Static Site"
2. Connect the same GitHub repository
3. Configure:

**Basic Settings:**
- Name: `document-template-generator-web`
- Branch: `main`
- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`

**Environment Variables:**
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-backend-url.onrender.com
```

4. Click "Create Static Site"
5. Wait for deployment
6. Note your frontend URL

### Enable CORS

Update backend to allow your frontend URL:

In `backend/src/server.js`:
```javascript
app.use(
  cors({
    origin: [
      'https://your-frontend.onrender.com',
      'http://localhost:5173' // Keep for local dev
    ],
    credentials: true,
  })
);
```

Commit and push changes to trigger redeployment.

## Step 4: Configure Supabase for Production

### Update Site URL

1. Go to Supabase Dashboard
2. Navigate to Authentication → Settings
3. Update Site URL to your frontend URL:
   ```
   https://your-frontend.onrender.com
   ```

4. Add Redirect URLs:
   ```
   https://your-frontend.onrender.com/**
   ```

### Update Storage Policies

Ensure storage policies reference production URLs if needed.

## Step 5: Test Production Deployment

### Smoke Test

1. Visit your frontend URL
2. Create an account
3. Log in
4. Create a template (upload 3 documents)
5. Generate a document
6. Download and verify document

### Monitor Logs

**Backend Logs:**
- Go to Render dashboard → Your backend service → Logs
- Watch for errors during testing

**Frontend:**
- Check browser console for errors
- Use Network tab to debug API calls

## Step 6: Set Up Custom Domain (Optional)

### Frontend Domain

1. In Render, go to your Static Site
2. Click "Settings" → "Custom Domain"
3. Add your domain (e.g., `app.yourdomain.com`)
4. Follow DNS configuration instructions
5. Wait for SSL certificate provisioning

### Backend Domain

1. In Render, go to your Web Service
2. Add custom domain (e.g., `api.yourdomain.com`)
3. Update frontend `VITE_API_URL` to use new domain
4. Update CORS settings in backend

## Monitoring & Maintenance

### Set Up Monitoring

**Render Alerts:**
- Enable email notifications for deployment failures
- Set up Slack webhooks for critical alerts

**Supabase Monitoring:**
- Check database usage regularly
- Monitor storage usage
- Review auth logs for suspicious activity

**Anthropic API:**
- Monitor API usage and costs
- Set up billing alerts
- Track token usage patterns

### Database Backups

Supabase automatically backs up your database. To manually backup:

1. Go to Supabase Dashboard
2. Database → Backups
3. Download backup if needed

### Scaling Considerations

**When to Scale:**
- Backend response times > 2 seconds
- Render instance CPU > 80%
- High error rates

**Scaling Options:**
1. Upgrade Render instance type
2. Enable auto-scaling (Professional plan)
3. Optimize LLM API calls (caching)
4. Implement CDN for frontend

## Troubleshooting Production Issues

### Backend Won't Start

**Check Logs:**
```bash
# In Render dashboard, check deployment logs
```

**Common Issues:**
- Missing environment variables
- Wrong Node version (specify in package.json)
- Dependencies not installed

### Frontend Build Fails

**Common Issues:**
- Environment variables not prefixed with `VITE_`
- Build command incorrect
- Missing dependencies in package.json

### High API Costs

**Optimize:**
- Cache LLM analysis results
- Implement rate limiting per user
- Use Haiku instead of Sonnet where possible
- Add request batching

### Database Connection Issues

**Check:**
- Supabase service status
- Connection string validity
- RLS policies configured correctly
- Database not at connection limit

## Security Checklist

- [ ] All environment variables set correctly
- [ ] CORS restricted to production domains
- [ ] HTTPS enabled (automatic on Render)
- [ ] RLS policies enabled on all tables
- [ ] Rate limiting configured
- [ ] File upload size limits set
- [ ] Secrets not committed to GitHub
- [ ] API keys rotated if exposed
- [ ] Supabase project has strong password
- [ ] Auth email confirmation enabled

## Cost Optimization

### Estimated Monthly Costs

**Render:**
- Backend: $7-$25/month
- Frontend: Free (static site)

**Supabase:**
- Free tier: $0 (up to 500MB database, 1GB storage)
- Pro: $25/month (8GB database, 100GB storage)

**Anthropic API:**
- Based on usage
- ~$1.30 per template created
- ~$0.05 per document with AI assist

### Cost Reduction Tips

1. **LLM Usage:**
   - Cache analysis results for identical documents
   - Use smaller context windows
   - Batch similar requests

2. **Storage:**
   - Clean up old upload sessions regularly
   - Compress documents before storage
   - Delete old generated documents

3. **Compute:**
   - Use appropriate Render instance size
   - Enable auto-scaling only if needed
   - Optimize slow database queries

## Maintenance Tasks

### Daily
- Check error logs
- Monitor API costs

### Weekly
- Review user feedback
- Check system performance
- Update dependencies (security patches)

### Monthly
- Database cleanup (expired sessions)
- Review and optimize costs
- Update documentation
- Backup critical data

## Rollback Procedure

If deployment causes issues:

1. **Render:**
   - Go to deployment history
   - Click "Rollback" on last working deployment

2. **Database:**
   - Restore from Supabase backup if needed

3. **Code:**
   ```bash
   git revert HEAD
   git push
   ```

## Support Resources

- Render Docs: https://render.com/docs
- Supabase Docs: https://supabase.com/docs
- Anthropic Docs: https://docs.anthropic.com
- Project Issues: GitHub Issues page

