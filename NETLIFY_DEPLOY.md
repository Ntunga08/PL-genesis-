# 🚀 Netlify Deployment Instructions

## Current Deployment

**Live URL:** https://fastidious-rolypoly-4b0715.netlify.app/

**Status:** ✅ Active

## How to Update the Deployment

### Method 1: Drag & Drop (Easiest)

1. **Build the frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Go to Netlify:**
   - Visit: https://app.netlify.com/
   - Log in to your account
   - Find your site: `fastidious-rolypoly-4b0715`

3. **Deploy:**
   - Click "Deploys" tab
   - Drag the `frontend/dist` folder onto the deploy zone
   - Wait for deployment to complete (~30 seconds)

4. **Verify:**
   - Visit: https://fastidious-rolypoly-4b0715.netlify.app/
   - Test the app with MetaMask

### Method 2: Netlify CLI

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login:**
   ```bash
   netlify login
   ```

3. **Build and deploy:**
   ```bash
   cd frontend
   npm run build
   netlify deploy --prod --dir=dist
   ```

### Method 3: GitHub Integration (Recommended for Production)

1. **Connect GitHub repo to Netlify:**
   - Go to Netlify dashboard
   - Click "Add new site" → "Import an existing project"
   - Choose GitHub and select your repo
   - Configure build settings:
     - Base directory: `frontend`
     - Build command: `npm run build`
     - Publish directory: `frontend/dist`

2. **Auto-deploy on push:**
   - Every push to main branch will trigger automatic deployment
   - Pull requests get preview deployments

## Build Configuration

The app is configured in `frontend/vite.config.js`:

```javascript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/', // Important: Use '/' for Netlify, not '/repo-name/'
})
```

## Environment Variables

If you need to add environment variables on Netlify:

1. Go to Site settings → Environment variables
2. Add variables:
   - `VITE_PINATA_JWT` - Your Pinata JWT token
   - Any other `VITE_*` variables

**Note:** Current setup uses hardcoded Pinata JWT in frontend/.env (not recommended for production)

## Troubleshooting Deployment

### Black Screen / 404 Errors

**Problem:** App shows black screen or assets not loading

**Solution:**
1. Check `vite.config.js` has `base: '/'`
2. Rebuild: `npm run build`
3. Redeploy the `dist` folder

### Build Fails

**Problem:** Build command fails on Netlify

**Solution:**
1. Check Node.js version (should be 18+)
2. In Netlify: Site settings → Build & deploy → Environment
3. Add environment variable: `NODE_VERSION` = `18`

### MetaMask Not Connecting

**Problem:** MetaMask doesn't connect on deployed site

**Solution:**
1. Check browser console for errors
2. Ensure HTTPS is enabled (Netlify does this automatically)
3. Clear browser cache
4. Try incognito mode

### RPC Errors

**Problem:** Transactions fail with RPC errors

**Solution:**
1. Update `frontend/src/constants.js` with better RPC URLs
2. Rebuild and redeploy
3. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for RPC alternatives

## Custom Domain (Optional)

To use a custom domain:

1. Go to Site settings → Domain management
2. Click "Add custom domain"
3. Follow DNS configuration instructions
4. Netlify provides free SSL certificate

## Performance Optimization

Current build size: ~548 KB (gzipped: ~181 KB)

To optimize:
1. Enable code splitting (dynamic imports)
2. Lazy load components
3. Optimize images
4. Use CDN for large assets

## Monitoring

- **Netlify Analytics:** Site settings → Analytics
- **Deploy logs:** Deploys tab → Click on deployment
- **Function logs:** Functions tab (if using serverless functions)

## Rollback

If deployment breaks:

1. Go to Deploys tab
2. Find previous working deployment
3. Click "Publish deploy"
4. Previous version goes live immediately

## Security

- ✅ HTTPS enabled by default
- ✅ Environment variables encrypted
- ✅ No sensitive data in frontend code
- ⚠️ Move Pinata JWT to backend for production

## Next Steps

For production deployment:
1. Use custom domain
2. Move sensitive keys to backend
3. Set up CI/CD with GitHub Actions
4. Enable Netlify Analytics
5. Configure caching headers
6. Add monitoring (Sentry, LogRocket)

## Support

- **Netlify Docs:** https://docs.netlify.com/
- **Netlify Support:** https://www.netlify.com/support/
- **Community:** https://answers.netlify.com/
