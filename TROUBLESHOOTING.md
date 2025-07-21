# PDF Scribe Artisan - Troubleshooting Guide

## PDF Loading Issues

### "Failed to load PDF" Error

If you're seeing this error, it's typically due to one of these issues:

#### 1. PDF.js Worker CORS Issues
**Symptoms:** Console errors about CORS policy, worker loading failures
**Solution:** The application automatically handles this with local worker files.

**Manual Fix (if needed):**
```bash
# Run the setup script
npm run setup-pdf

# Or manually copy worker files
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/
```

#### 2. Invalid or Corrupted PDF
**Symptoms:** Specific PDF files fail to load
**Solutions:**
- Try a different PDF file
- Ensure the PDF is not password-protected
- Check that the file is a valid PDF (not a renamed image)

#### 3. Browser Compatibility
**Symptoms:** Works in some browsers but not others
**Solutions:**
- Try Chrome/Firefox (best support)
- Ensure JavaScript is enabled
- Clear browser cache and reload

### Console Error Messages

#### `SyntaxError: Unexpected reserved word`
This indicates a Node.js version compatibility issue with Vite.
**Solution:** Use Node.js 16+ or try using a different package manager.

#### `Access to script at '...' has been blocked by CORS policy`
**Solution:** The app now uses local worker files to avoid this issue.

#### `Setting up fake worker`
This is a warning that PDF.js is falling back to a compatibility mode.
**Impact:** PDFs may load slower but should still work.

## Performance Issues

### Slow PDF Loading
- **Large Files:** Files over 5MB may take longer to load
- **Complex PDFs:** PDFs with many images/graphics load slower
- **Network:** Check internet connection for CDN fallbacks

### Memory Issues
- **Multiple PDFs:** Only one PDF is loaded at a time
- **Large Pages:** High-resolution PDFs use more memory
- **Browser Limits:** Some browsers limit worker memory

## Development Issues

### Worker Files Missing
If worker files are missing from the `public/` directory:

```bash
# Reinstall dependencies (runs postinstall hook)
npm install

# Or run setup manually
npm run setup-pdf
```

### Build Issues
If the production build has PDF issues:

```bash
# Build with PDF optimization
npm run build

# Check that worker files are in dist/
ls dist/pdf.worker.*
```

## Browser Console Debugging

Enable these console logs to debug PDF issues:

```javascript
// In browser console
localStorage.setItem('pdf-debug', 'true');
```

Look for these log messages:
- `🔧 Setting up PDF.js worker...` - Worker initialization
- `✅ PDF.js worker configured` - Success
- `❌ Failed to configure worker` - Error in setup
- `✅ PDF loaded successfully` - Document loaded
- `❌ PDF load error` - Document failed to load

## Quick Fixes

### Reset PDF Configuration
```bash
# Clear browser cache
# Hard refresh (Ctrl+F5 / Cmd+Shift+R)

# Reset worker files
npm run setup-pdf
```

### Test with Sample PDF
Try loading a simple PDF first:
1. Create a simple PDF from a text document
2. Ensure it's under 1MB
3. Avoid complex layouts initially

### Environment Check
```bash
# Check Node.js version
node --version  # Should be 16+

# Check if worker files exist
ls public/pdf.worker.*

# Verify dependencies
npm ls react-pdf pdfjs-dist
```

## Getting Help

If issues persist:

1. **Check Console:** Open browser dev tools and look for error messages
2. **Try Different PDF:** Test with a simple, small PDF file
3. **Clear Cache:** Hard refresh and clear browser cache
4. **Check Network:** Ensure internet connection for CDN fallbacks

## Common Solutions Summary

| Issue | Quick Fix |
|-------|-----------|
| CORS errors | `npm run setup-pdf` |
| Worker not found | Check `public/pdf.worker.*` exists |
| PDF won't load | Try different file, check console |
| Slow loading | Use smaller PDF files |
| Build errors | Ensure worker files in `dist/` |

## Advanced Configuration

For custom PDF.js configurations, edit `src/lib/pdf-config.ts`:

```typescript
// Custom worker source
pdfjs.GlobalWorkerOptions.workerSrc = '/custom-worker.js';

// Additional PDF options
export const pdfOptions = {
  cMapUrl: 'path/to/cmaps/',
  cMapPacked: true,
  // ... other options
};
``` 