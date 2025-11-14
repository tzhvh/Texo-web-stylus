# Deployment Guide

## Overview

Texo-web-stylus is a privacy-first client-side application that can be deployed to any static hosting service. This guide covers deployment strategies, configuration, and operational considerations for production environments.

## Deployment Architecture

### Client-Side Only Application
- **No Backend Required**: All processing happens in the browser
- **Static Assets**: HTML, CSS, JavaScript, and model files
- **Model Distribution**: FormulaNet model served via CDN
- **Data Storage**: IndexedDB in user's browser
- **Privacy**: No data transmitted to external servers

### Deployment Targets
- **Static Hosting**: Netlify, Vercel, GitHub Pages, CloudFront
- **CDN Distribution**: For model files and static assets
- **PWA Support**: Future enhancement for offline installation
- **Enterprise**: Internal hosting with air-gapped support

## Build Configuration

### Production Build Process
```bash
# Install dependencies
pnpm install

# Create optimized production build
pnpm run build

# Output structure
dist/
├── index.html              # Main HTML file
├── assets/                # Optimized static assets
│   ├── index-abc123.js   # Application bundle
│   ├── index-def456.css  # Stylesheets
│   └── vendor-ghi789.js  # Vendor libraries
└── favicon.ico            # Site icon
```

### Build Optimization Features
- **Code Splitting**: Automatic chunk splitting for optimal loading
- **Tree Shaking**: Dead code elimination
- **Minification**: JavaScript and CSS compression
- **Asset Optimization**: Image compression and format optimization
- **Source Maps**: Generated for debugging (production-safe)

### Vite Configuration
```javascript
// vite.config.js
export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',  // ES modules for workers
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],  // Exclude large ML library
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'ml-lib': ['@huggingface/transformers'],
          'math-lib': ['katex', 'algebrite'],
          'editor-lib': ['prosemirror-*']
        }
      }
    }
  }
})
```

## Static Hosting Deployment

### 1. Netlify Deployment

#### Automated Deployment
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to Netlify
pnpm run build
netlify deploy --prod --dir=dist
```

#### Configuration File
```toml
# netlify.toml
[build]
  publish = "dist"
  command = "pnpm run build"

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

#### Environment Variables
```bash
# Set via Netlify dashboard or CLI
netlify env:set VITE_MODEL_URL=https://models.example.com
netlify env:set VITE_DEBUG_MODE=false
```

### 2. Vercel Deployment

#### Automated Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
pnpm run build
vercel --prod
```

#### Configuration File
```json
// vercel.json
{
  "buildCommand": "pnpm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "functions": {},
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

### 3. GitHub Pages Deployment

#### GitHub Actions Configuration
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'pnpm'
    
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
    
    - name: Build
      run: pnpm run build
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

#### Base Path Configuration
```javascript
// vite.config.js for GitHub Pages
export default defineConfig({
  base: "/texo-web-stylus/",  // Repository name
  // ... other config
})
```

## CDN Configuration

### Model File Distribution

#### CloudFront + S3 Setup
```bash
# 1. Upload model files to S3
aws s3 sync ./models/ s3://your-bucket/models/

# 2. Create CloudFront distribution
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json

# 3. Configure CORS
aws s3api put-bucket-cors --bucket your-bucket --cors-configuration file://cors.json
```

#### CORS Configuration
```json
// cors.json for S3
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

#### Model URL Configuration
```javascript
// public/config.js (generated at build time)
window.APP_CONFIG = {
  MODEL_URL: 'https://cdn.example.com/models/',
  MODEL_NAME: 'alephpi/FormulaNet',
  ENVIRONMENT: 'production'
}
```

### Asset Optimization

#### CDN Caching Strategy
```javascript
// Cache headers for different asset types
const cacheConfig = {
  // HTML files - short cache
  'text/html': 'public, max-age=0, must-revalidate',
  
  // JavaScript/CSS - long cache with hash
  'application/javascript': 'public, max-age=31536000, immutable',
  'text/css': 'public, max-age=31536000, immutable',
  
  // Model files - very long cache
  'application/octet-stream': 'public, max-age=31536000, immutable',
  
  // Images - long cache
  'image/*': 'public, max-age=31536000, immutable'
}
```

## Environment Configuration

### Production Environment Variables
```bash
# Build-time environment variables
VITE_MODEL_URL=https://cdn.example.com/models/
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=error
VITE_SENTRY_DSN=https://your-sentry-dsn
VITE_ANALYTICS_ID=GA-XXXXXXXXX
```

### Runtime Configuration
```javascript
// src/config.js
export const config = {
  modelUrl: import.meta.env.VITE_MODEL_URL || 'https://huggingface.co/alephpi/FormulaNet/resolve/main/',
  debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
  logLevel: import.meta.env.VITE_LOG_LEVEL || 'info',
  environment: import.meta.env.MODE,
  version: import.meta.env.VITE_APP_VERSION
}
```

## Security Configuration

### Content Security Policy
```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://huggingface.co;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self' https://huggingface.co;
  worker-src 'self' blob:;
  child-src 'none';
  object-src 'none';
  base-uri 'self';
">
```

### Security Headers
```javascript
// Service worker or server configuration
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}
```

### HTTPS Enforcement
```javascript
// Force HTTPS in production
if (location.protocol !== 'https:' && import.meta.env.PROD) {
  location.replace(`https:${location.href.substring(location.protocol.length)}`)
}
```

## Performance Optimization

### Bundle Analysis
```bash
# Analyze bundle size
pnpm run build
pnpm run build:analyze

# Or use vite-bundle-analyzer
npx vite-bundle-analyzer dist
```

### Critical Resource Optimization
```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate ML libraries for lazy loading
          'ml-core': ['@huggingface/transformers'],
          
          // Separate math libraries
          'math-core': ['katex', 'algebrite'],
          
          // Separate editor libraries
          'editor-core': ['prosemirror-*', '@benrbray/prosemirror-math']
        }
      }
    }
  }
})
```

### Preloading Strategy
```html
<!-- index.html -->
<link rel="preload" href="/assets/ml-core.js" as="script" crossorigin>
<link rel="preload" href="/assets/math-core.js" as="script" crossorigin>
<link rel="prefetch" href="/models/model.safetensors" as="fetch" crossorigin>
```

## Monitoring and Analytics

### Error Tracking (Sentry)
```javascript
// sentry.js (optional)
import * as Sentry from '@sentry/react'

if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION
  })
}
```

### Performance Monitoring
```javascript
// performance-monitor.js
class PerformanceMonitor {
  constructor() {
    this.observeWebVitals()
    this.trackResourceTiming()
  }
  
  observeWebVitals() {
    // Core Web Vitals monitoring
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.sendMetric(entry.name, entry.value)
      }
    }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })
  }
  
  trackResourceTiming() {
    // Resource loading performance
    window.addEventListener('load', () => {
      const resources = performance.getEntriesByType('resource')
      resources.forEach(resource => {
        if (resource.duration > 1000) { // Slow resources
          this.sendMetric('slow-resource', {
            name: resource.name,
            duration: resource.duration,
            size: resource.transferSize
          })
        }
      })
    })
  }
}
```

### Analytics Integration
```javascript
// analytics.js (privacy-compliant)
class PrivacyAnalytics {
  constructor() {
    this.consent = this.getConsent()
  }
  
  track(event, data) {
    if (!this.consent) return
    
    // Only collect non-identifying metrics
    const sanitizedData = {
      event,
      timestamp: Date.now(),
      version: import.meta.env.VITE_APP_VERSION,
      // No IP address, no user agents, no personal data
    }
    
    this.sendToAnalytics(sanitizedData)
  }
}
```

## Deployment Checklist

### Pre-Deployment Checklist
- [ ] All tests passing (`pnpm test`)
- [ ] Production build successful (`pnpm run build`)
- [ ] Bundle size analyzed and optimized
- [ ] Environment variables configured
- [ ] Security headers implemented
- [ ] CSP policy configured
- [ ] Error monitoring set up
- [ ] Performance monitoring configured
- [ ] Accessibility audit passed
- [ ] Cross-browser testing completed

### Post-Deployment Verification
- [ ] Application loads correctly
- [ ] Model downloads successfully
- [ ] OCR functionality works
- [ ] Math rendering displays correctly
- [ ] IndexedDB operations work
- [ ] Error boundaries function
- [ ] Performance metrics within targets
- [ ] Security headers present
- [ ] Mobile responsiveness verified

## Troubleshooting

### Common Deployment Issues

#### Model Loading Failures
```javascript
// Check model URL configuration
console.log('Model URL:', config.modelUrl)

// Verify CORS headers
fetch(config.modelUrl + 'config.json')
  .then(response => console.log('CORS headers:', response.headers))

// Check browser console for network errors
```

#### IndexedDB Quota Issues
```javascript
// Check storage quota
navigator.storage.estimate().then(estimate => {
  console.log('Available storage:', estimate.quota)
  console.log('Used storage:', estimate.usage)
  
  if (estimate.usage / estimate.quota > 0.9) {
    console.warn('Storage quota nearly full')
  }
})
```

#### Performance Issues
```javascript
// Monitor bundle loading performance
window.addEventListener('load', () => {
  const navigation = performance.getEntriesByType('navigation')[0]
  console.log('Page load time:', navigation.loadEventEnd - navigation.fetchStart)
  
  // Check for large bundles
  const resources = performance.getEntriesByType('resource')
  resources.filter(r => r.name.includes('.js')).forEach(resource => {
    if (resource.transferSize > 1024 * 1024) { // > 1MB
      console.warn('Large bundle detected:', resource.name, resource.transferSize)
    }
  })
})
```

### Debug Mode in Production
```javascript
// Enable debug mode temporarily
localStorage.setItem('texo-debug-mode', 'true')
location.reload()

// Disable after debugging
localStorage.removeItem('texo-debug-mode')
location.reload()
```

## Scaling Considerations

### CDN Scaling
- **Geographic Distribution**: Multiple edge locations
- **Cache Hit Ratio**: Monitor and optimize
- **Bandwidth Usage**: Track model download patterns
- **Failover**: Backup model sources

### Performance Scaling
- **Bundle Splitting**: Optimize for different routes
- **Lazy Loading**: Load ML libraries on demand
- **Service Worker**: Cache static assets aggressively
- **Compression**: Brotli compression for text assets

### Monitoring Scaling
- **Error Rates**: Track application errors
- **Performance Metrics**: Monitor Core Web Vitals
- **Usage Analytics**: Track feature usage patterns
- **Resource Utilization**: Monitor client-side performance

This deployment guide provides comprehensive coverage for deploying Texo-web-stylus to production environments while maintaining privacy-first architecture and optimal performance.