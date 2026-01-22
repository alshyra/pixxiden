#!/usr/bin/env node

/**
 * Safe postinstall script that downloads sidecar binaries
 * without failing npm install if download fails
 */

const { execSync } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'download-sidecars.sh');

try {
  console.log('📦 Downloading sidecar binaries...');
  execSync(`bash "${scriptPath}"`, { 
    stdio: 'inherit',
    cwd: path.dirname(__dirname)
  });
  console.log('✅ Sidecars downloaded successfully');
} catch (err) {
  console.warn('⚠️  Sidecar download failed, will retry on next build');
  console.warn('   Run "npm run setup:sidecars" manually if needed');
  // Don't fail npm install
  process.exit(0);
}
