#!/usr/bin/env node

import { promises as fs } from 'fs';
import { createWriteStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRIPT_DIR = __dirname;
const CONFIG_FILE = path.join(SCRIPT_DIR, 'dependencies.yaml');
const BINARIES_DIR = path.join(SCRIPT_DIR, '..', 'src-tauri', 'binaries');

// Colors for terminal
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Parse YAML (simple implementation for our use case)
async function parseYaml(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const result = {
    binaries: {},
    target_mappings: {}
  };
  
  let currentBinary = null;
  let currentPlatform = null;
  let inSources = false;
  let inFallback = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Target mappings
    if (line.startsWith('target_mappings:')) {
      let inMappings = true;
      continue;
    }
    
    if (line.match(/^  \w+-.*:/)) {
      const [key, value] = line.trim().split(':').map(s => s.trim());
      result.target_mappings[key] = value.replace(/"/g, '');
      continue;
    }
    
    // Binaries
    if (line.match(/^  \w+:/)) {
      currentBinary = line.trim().split(':')[0];
      result.binaries[currentBinary] = {
        sources: {},
        fallback: {}
      };
      inSources = false;
      inFallback = false;
      continue;
    }
    
    if (!currentBinary) continue;
    
    // Binary properties
    if (line.match(/^    enabled:/)) {
      result.binaries[currentBinary].enabled = trimmed.includes('true');
    } else if (line.match(/^    version:/)) {
      result.binaries[currentBinary].version = trimmed.split(':')[1].trim().replace(/"/g, '');
    } else if (line.match(/^    sources:/)) {
      inSources = true;
      inFallback = false;
    } else if (line.match(/^    fallback:/)) {
      inFallback = true;
      inSources = false;
    } else if (inSources && line.match(/^      \w+-\w+:/)) {
      currentPlatform = line.trim().split(':')[0];
      result.binaries[currentBinary].sources[currentPlatform] = {};
    } else if (inSources && currentPlatform && line.match(/^        url:/)) {
      const url = trimmed.split('url:')[1].trim().replace(/"/g, '');
      result.binaries[currentBinary].sources[currentPlatform].url = url === 'null' ? null : url;
    } else if (inSources && currentPlatform && line.match(/^        checksum:/)) {
      const checksum = trimmed.split('checksum:')[1].trim().replace(/"/g, '');
      result.binaries[currentBinary].sources[currentPlatform].checksum = checksum === 'null' ? null : checksum;
    } else if (inFallback && line.match(/^      type:/)) {
      result.binaries[currentBinary].fallback.type = trimmed.split(':')[1].trim().replace(/"/g, '');
    } else if (inFallback && line.match(/^      package:/)) {
      result.binaries[currentBinary].fallback.package = trimmed.split(':')[1].trim().replace(/"/g, '');
    }
  }
  
  return result;
}

// Get Rust target
function getRustTarget() {
  try {
    const output = execSync('rustc -vV').toString();
    const match = output.match(/host: (.+)/);
    return match ? match[1].trim() : null;
  } catch (err) {
    log('red', '❌ Failed to detect Rust target');
    return null;
  }
}

// Download file
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const file = createWriteStream(dest);
    
    protocol.get(url, { followRedirect: true }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest);
      reject(err);
    });
    
    file.on('error', (err) => {
      fs.unlink(dest);
      reject(err);
    });
  });
}

// Create Python wrapper
async function createPythonWrapper(name, packageName, rustTarget) {
  const targetFile = path.join(BINARIES_DIR, `${name}-${rustTarget}`);
  
  if (await fs.access(targetFile).then(() => true).catch(() => false)) {
    log('green', `✅ ${name} wrapper already present`);
    return true;
  }
  
  log('blue', `🔧 Creating Python wrapper for ${name}...`);
  
  // Check if command exists in PATH
  try {
    execSync(`which ${name}`, { stdio: 'ignore' });
    log('green', `   Found ${name} in PATH, copying...`);
    
    const whichOutput = execSync(`which ${name}`).toString().trim();
    await fs.copyFile(whichOutput, targetFile);
    await fs.chmod(targetFile, 0o755);
    
    log('green', `✅ ${name} wrapper created from system installation`);
    return true;
  } catch {}
  
  // Check if Python package is installed
  try {
    const safePackage = packageName.replace(/-/g, '_');
    execSync(`python3 -c "import ${safePackage}"`, { stdio: 'ignore' });
    
    log('green', '   Found Python package, creating wrapper script');
    
    const wrapper = `#!/usr/bin/env python3
import sys
import runpy

# Run the module as __main__
sys.exit(runpy.run_module('${safePackage}', run_name='__main__'))
`;
    
    await fs.writeFile(targetFile, wrapper);
    await fs.chmod(targetFile, 0o755);
    
    log('green', `✅ ${name} wrapper created`);
    return true;
  } catch {}
  
  log('yellow', `⚠️  Python package '${packageName}' not found`);
  console.log('');
  console.log('Please install it with:');
  log('blue', `  pipx install ${packageName}`);
  console.log('  OR');
  log('blue', `  pip install --user ${packageName}`);
  console.log('');
  
  return false;
}

// Download a binary
async function downloadBinary(name, config, platform, rustTarget) {
  const binaryConfig = config.binaries[name];
  
  if (!binaryConfig.enabled) {
    log('yellow', `⏭️  ${name} is disabled, skipping`);
    return true;
  }
  
  const sourceConfig = binaryConfig.sources[platform];
  
  if (!sourceConfig || !sourceConfig.url) {
    log('yellow', `⚠️  No binary URL for ${name} on ${platform}`);
    
    // Try fallback
    if (binaryConfig.fallback?.type === 'python-wrapper') {
      console.log(`   Using Python wrapper fallback for package: ${binaryConfig.fallback.package}`);
      return await createPythonWrapper(name, binaryConfig.fallback.package, rustTarget);
    }
    
    console.log('   No fallback available');
    return false;
  }
  
  const url = sourceConfig.url.replace('{version}', binaryConfig.version);
  const targetFile = path.join(BINARIES_DIR, `${name}-${rustTarget}`);
  
  // Check if already downloaded
  if (await fs.access(targetFile).then(() => true).catch(() => false)) {
    log('green', `✅ ${name} v${binaryConfig.version} already present`);
    return true;
  }
  
  log('blue', `📥 Downloading ${name} v${binaryConfig.version}...`);
  console.log(`   URL: ${url}`);
  
  // Download to temp file
  const tempFile = path.join(BINARIES_DIR, `.${name}.tmp`);
  
  try {
    await downloadFile(url, tempFile);
    
    // Move to target location
    await fs.rename(tempFile, targetFile);
    await fs.chmod(targetFile, 0o755);
    
    log('green', `✅ ${name} v${binaryConfig.version} ready`);
    return true;
  } catch (err) {
    log('red', `❌ Failed to download ${name} from ${url}`);
    console.error(`   Error: ${err.message}`);
    
    // Try fallback
    if (binaryConfig.fallback?.type === 'python-wrapper') {
      console.log(`   Attempting fallback with Python wrapper for: ${binaryConfig.fallback.package}`);
      return await createPythonWrapper(name, binaryConfig.fallback.package, rustTarget);
    }
    
    return false;
  }
}

// Main
async function main() {
  log('blue', '🎯 PixiDen Sidecar Downloader');
  console.log('');
  
  // Detect Rust target
  const rustTarget = getRustTarget();
  if (!rustTarget) {
    process.exit(1);
  }
  
  console.log(`Detected Rust target: ${rustTarget}`);
  
  // Parse config
  const config = await parseYaml(CONFIG_FILE);
  
  // Map to platform
  const platform = config.target_mappings[rustTarget];
  if (!platform) {
    log('red', `❌ Unsupported platform: ${rustTarget}`);
    process.exit(1);
  }
  
  console.log(`Platform: ${platform}`);
  console.log('');
  
  // Ensure binaries directory exists
  await fs.mkdir(BINARIES_DIR, { recursive: true });
  
  // Download binaries
  const binaries = ['legendary', 'gogdl', 'nile'];
  let successCount = 0;
  let failedCount = 0;
  
  for (const binary of binaries) {
    const success = await downloadBinary(binary, config, platform, rustTarget);
    if (success) {
      successCount++;
    } else {
      failedCount++;
    }
    console.log('');
  }
  
  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`${colors.green}✅ Success: ${successCount}${colors.reset}  ${colors.red}❌ Failed: ${failedCount}${colors.reset}`);
  console.log('');
  console.log(`Binaries in: ${BINARIES_DIR}`);
  
  try {
    const files = await fs.readdir(BINARIES_DIR);
    for (const file of files) {
      if (file !== '.gitkeep' && file !== 'README.md') {
        const stats = await fs.stat(path.join(BINARIES_DIR, file));
        const size = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`  ${file} (${size} MB)`);
      }
    }
  } catch {}
  
  console.log('');
  
  if (failedCount > 0) {
    log('yellow', '⚠️  Some binaries failed to download. Build may fail.');
    console.log('   Run the script again or install manually.');
    process.exit(0); // Don't fail npm install
  }
  
  log('green', '🎉 All sidecars configured successfully!');
}

main().catch(err => {
  log('red', `❌ Fatal error: ${err.message}`);
  process.exit(0); // Don't fail npm install
});