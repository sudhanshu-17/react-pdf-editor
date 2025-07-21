import { pdfjs } from 'react-pdf';

// Configure PDF.js worker with multiple fallbacks
const setupPDFWorker = () => {
  console.log('🔧 Setting up PDF.js worker...');
  console.log('📦 PDF.js version:', pdfjs.version);
  
  // Array of worker sources to try (in order of preference)
  const workerSources = [
    // Local files (best for avoiding CORS)
    '/pdf.worker.min.mjs',
    '/pdf.worker.min.js',
    
    // CDN fallbacks
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`,
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`,
    `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`,
    
    // Mozilla's official CDN as final fallback
    'https://mozilla.github.io/pdf.js/build/pdf.worker.min.mjs'
  ];
  
  let workerConfigured = false;
  
  for (let i = 0; i < workerSources.length && !workerConfigured; i++) {
    try {
      const workerSrc = workerSources[i];
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      
      if (workerSrc.startsWith('/')) {
        console.log(`✅ PDF.js worker configured with local file: ${workerSrc}`);
      } else {
        console.log(`⚠️ PDF.js worker configured with CDN: ${workerSrc}`);
      }
      
      workerConfigured = true;
    } catch (error) {
      console.error(`❌ Failed to configure worker with ${workerSources[i]}:`, error);
      
      if (i === workerSources.length - 1) {
        console.error('💥 All worker sources failed! PDF functionality may not work.');
      }
    }
  }
  
  return workerConfigured;
};

// PDF.js options for better performance and compatibility
export const pdfOptions = {
  cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

// Initialize PDF.js and export worker status
export const isWorkerConfigured = setupPDFWorker();

export { pdfjs }; 