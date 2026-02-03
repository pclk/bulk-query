# bulk-query - NPM Development Guide

## 🚀 Quick Start with NPM

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server (runs on http://localhost:3000)
npm run dev

# Alternative
npm start
```

The development server will:
- ✅ Auto-open your browser
- ✅ Hot reload on file changes
- ✅ Show helpful error messages
- ✅ Run on port 3000

### Build for Production

```bash
# Create optimized production build
npm run build
```

This will:
- Bundle and minify all code
- Optimize assets
- Generate source maps
- Output to `dist/` directory

### Preview Production Build

```bash
# Preview the production build locally
npm run preview

# Alternative
npm run serve
```

## 📁 Project Structure

```
bulk-query/
├── src/
│   ├── main.jsx          # Entry point
│   ├── App.jsx           # Main app component (1,125 lines)
│   └── index.css         # Global styles
├── public/               # Static assets (if any)
├── dist/                 # Production build output (generated)
├── index-vite.html       # HTML template for Vite
├── index.html            # Standalone version (no build needed)
├── app.js                # Standalone version (no build needed)
├── vite.config.js        # Vite configuration
├── package.json          # NPM dependencies and scripts
└── .gitignore           # Git ignore rules
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm start` | Alias for `npm run dev` |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run serve` | Alias for `npm run preview` |

## 🎯 Two Ways to Run

### Option 1: NPM Development (Recommended for Development)

**Pros:**
- ✅ Hot module replacement
- ✅ Fast refresh
- ✅ Better error messages
- ✅ Optimized builds
- ✅ Modern tooling

**Usage:**
```bash
npm install
npm run dev
```

### Option 2: Standalone (No Build Required)

**Pros:**
- ✅ No installation needed
- ✅ Works offline
- ✅ Simple deployment
- ✅ Just open in browser

**Usage:**
```bash
# Just open index.html in your browser
# Or use a simple server:
python3 -m http.server 8000
```

## 🔄 Development Workflow

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Make changes to files in `src/`:**
   - `src/App.jsx` - Main application logic
   - `src/index.css` - Styles
   - `src/main.jsx` - Entry point

3. **See changes instantly** - Browser auto-refreshes

4. **Build for production when ready:**
   ```bash
   npm run build
   ```

5. **Test production build:**
   ```bash
   npm run preview
   ```

## 📦 Dependencies

### Production Dependencies
- `react` (^18.2.0) - UI library
- `react-dom` (^18.2.0) - React DOM renderer

### Development Dependencies
- `vite` (^5.0.12) - Build tool and dev server
- `@vitejs/plugin-react` (^4.2.1) - React plugin for Vite

## 🌐 Deployment

### Deploy to Netlify

```bash
# Build the app
npm run build

# Deploy the dist/ folder to Netlify
# Or connect your Git repo to Netlify for auto-deployment
```

**Build settings:**
- Build command: `npm run build`
- Publish directory: `dist`

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Deploy to GitHub Pages

```bash
# Build the app
npm run build

# Deploy dist/ folder to gh-pages branch
# Or use gh-pages package:
npm install -D gh-pages
```

Add to `package.json`:
```json
{
  "scripts": {
    "deploy": "gh-pages -d dist"
  }
}
```

## 🐛 Troubleshooting

### Port 3000 already in use

```bash
# Kill the process using port 3000
# Or change port in vite.config.js
```

### Module not found errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build fails

```bash
# Check for TypeScript/ESLint errors
# Make sure all imports are correct
# Verify all dependencies are installed
```

## 🔍 Key Differences: NPM vs Standalone

| Feature | NPM Version | Standalone |
|---------|-------------|------------|
| Installation | `npm install` | None |
| Dev Server | Vite (fast HMR) | Python/http-server |
| Build Process | Yes (optimized) | No |
| File Size | Smaller (minified) | Larger |
| Browser Support | Modern browsers | Modern browsers |
| Dependencies | Managed by npm | CDN links |
| Hot Reload | ✅ Yes | ❌ No |
| Production Ready | ✅ Yes | ⚠️ Demo only |

## 📝 Notes

- The standalone version (`index.html` + `app.js`) still works without npm
- Both versions have identical functionality
- NPM version is recommended for active development
- Standalone version is great for quick demos or offline use

## 🎓 Learn More

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Deployment Guide](https://vitejs.dev/guide/static-deploy.html)

---

**Happy coding!** 🚀

