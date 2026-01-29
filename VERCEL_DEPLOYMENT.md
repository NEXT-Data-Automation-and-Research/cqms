# Vercel Deployment Guide

This guide explains how to deploy your Express CQMS application to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Your project pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. All environment variables ready

## Quick Start

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. For production deployment:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Vercel will auto-detect the configuration
4. Add environment variables (see below)
5. Click "Deploy"

## Environment Variables

You need to configure the following environment variables in Vercel:

### Required Variables

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for server-side operations)

### Recommended for production (Vercel)

- `PUBLIC_APP_URL` - Your live app URL (e.g. `https://cqms-kohl.vercel.app`). If unset, the serverless app derives it from `VERCEL_URL` for OAuth redirects.
- `APP_URL` - Same as `PUBLIC_APP_URL`; used for impersonation magic-link redirects. Set to your Vercel URL so redirects go to the hosted app, not localhost.

### Optional Variables

- `NODE_ENV` - Set to `production` for production deployments
- `LOG_LEVEL` - Logging level (default: `debug`)
- `APP_NAME` - Application name
- `VAPID_PUBLIC_KEY` - For push notifications (if used)
- `VAPID_PRIVATE_KEY` - For push notifications (if used)
- `GOOGLE_CLIENT_ID` - For Google Calendar integration (if used)
- `GOOGLE_CLIENT_SECRET` - For Google Calendar integration (if used)

### How to Add Environment Variables

1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Add each variable for the appropriate environments (Production, Preview, Development)
4. Redeploy after adding variables

## Build Configuration

The project uses the following build process:

1. **Build Version**: Generates version.json
2. **Build CSS**: Compiles Tailwind CSS
3. **Build TypeScript**: Compiles client-side TypeScript
4. **Build Server**: Compiles server-side TypeScript

Vercel will automatically run `npm run build` during deployment.

## Project Structure

- `api/index.ts` - Vercel serverless function entry point (wraps Express app)
- `vercel.json` - Vercel configuration
- `public/` - Static files served by Express
- `src/` - Source files (TypeScript, HTML, CSS)
- `dist/` - Compiled output (generated during build)

## Important Notes

### Serverless Functions

- Your Express app runs as a serverless function on Vercel
- Each request is handled by a separate function instance
- Cold starts may occur on first request after inactivity
- Function timeout: 10 seconds (Hobby plan) or 60 seconds (Pro plan)

### Static Files

- Files in `public/` are served by Express middleware
- Static assets are cached by Vercel's CDN
- HTML files have no-cache headers for fresh content

### Database Connections

- Ensure your Supabase database allows connections from Vercel's IP ranges
- Consider using connection pooling for better performance
- Supabase connection strings work seamlessly with Vercel

### Rate Limiting

- Express rate limiting middleware is configured
- Vercel also has built-in DDoS protection
- Consider Vercel's rate limiting for additional protection

## Troubleshooting

### Build Failures

1. Check build logs in Vercel dashboard
2. Ensure all dependencies are in `package.json`
3. Verify TypeScript compilation succeeds locally
4. Check that `dist/` folder is generated correctly

### Runtime Errors

1. Check function logs in Vercel dashboard
2. Verify environment variables are set correctly
3. Ensure Supabase credentials are valid
4. Check that all file paths are correct (relative to function)

### Cold Start Issues

- First request after inactivity may be slow
- Consider using Vercel Pro plan for better performance
- Implement health checks to keep functions warm
- Use Vercel's Edge Functions for static content if needed

### Path Issues

- All file paths in `api/index.ts` are relative to the function location
- Use `path.join(__dirname, '..')` to navigate to project root
- Static files should be accessible from the function

### "Works locally but not on Vercel"

- Ensure **Environment Variables** in Vercel match your local `.env` (especially `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and optionally `SUPABASE_SERVICE_ROLE_KEY`).
- Set **`APP_URL`** (and optionally **`PUBLIC_APP_URL`**) to your Vercel URL (e.g. `https://your-app.vercel.app`) so OAuth and impersonation redirects go to the hosted app.
- The Vercel entry is **`api/index.ts`**; it must register the same API routes and `/api/env` behavior as the main server. If a feature works locally but not on Vercel, check that the route or env handling exists in `api/index.ts`.

## Custom Domain

1. Go to project settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificates are automatically provisioned

## Monitoring

- View function logs in Vercel dashboard
- Monitor function execution time and errors
- Set up alerts for function failures
- Use Vercel Analytics for performance insights

## Limitations

- **Function Size**: Maximum 50MB (including dependencies)
- **Function Timeout**: 10s (Hobby) or 60s (Pro)
- **Memory**: 1024MB default
- **Concurrent Executions**: Limited by plan

## Migration from Docker

If you're migrating from Docker:

1. Remove Docker-specific code (port binding, graceful shutdown)
2. Ensure all environment variables are in Vercel
3. Test API endpoints thoroughly
4. Verify static file serving works correctly
5. Check that database connections work from Vercel

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Express on Vercel Guide](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js)
