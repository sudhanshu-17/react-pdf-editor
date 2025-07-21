#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Setting up PDF.js worker files...');

const sourceDir = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build');
const publicDir = path.join(__dirname, '..', 'public');

// Files to copy
const filesToCopy = [
  { source: 'pdf.worker.min.mjs', dest: 'pdf.worker.min.mjs' },
  { source: 'pdf.worker.min.mjs', dest: 'pdf.worker.min.js' }, // Copy as .js for compatibility
];

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

let filesProcessed = 0;

filesToCopy.forEach(({ source, dest }) => {
  const sourcePath = path.join(sourceDir, source);
  const destPath = path.join(publicDir, dest);
  
  try {
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Copied ${source} → ${dest}`);
      filesProcessed++;
    } else {
      console.warn(`⚠️ Source file not found: ${sourcePath}`);
    }
  } catch (error) {
    console.error(`❌ Failed to copy ${source}:`, error.message);
  }
});

if (filesProcessed > 0) {
  console.log(`🎉 Successfully set up ${filesProcessed} PDF worker file(s)!`);
} else {
  console.error('❌ No PDF worker files were copied. PDF functionality may not work.');
  process.exit(1);
} 