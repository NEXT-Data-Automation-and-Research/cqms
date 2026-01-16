/**
 * SRI Hash Generator Script
 * 
 * This script helps generate Subresource Integrity (SRI) hashes for CDN resources.
 * Run this script to calculate the correct SRI hashes for external resources.
 * 
 * Usage:
 *   node scripts/generate-sri-hashes.js
 * 
 * Or use online tools:
 *   https://www.srihash.org/
 *   https://cdnjs.com/libraries (shows SRI hashes)
 */

const crypto = require('crypto');
const https = require('https');

/**
 * Generate SRI hash for a URL
 */
function generateSRIHash(url, algorithm = 'sha384') {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const content = Buffer.concat(chunks);
        const hash = crypto.createHash(algorithm).update(content).digest('base64');
        resolve(`${algorithm}-${hash}`);
      });
    }).on('error', reject);
  });
}

/**
 * Resources that need SRI hashes
 */
const resources = [
  {
    url: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    type: 'script',
    note: 'Supabase JS v2 (latest)'
  },
  {
    url: 'https://accounts.google.com/gsi/client',
    type: 'script',
    note: 'Google Sign-In'
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
    type: 'script',
    note: 'Chart.js v4.4.0'
  },
  {
    url: 'https://cdn.tailwindcss.com',
    type: 'script',
    note: 'Tailwind CSS CDN (should be replaced with compiled CSS)'
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/loglevel@1.9.1/+esm',
    type: 'script',
    note: 'Loglevel ESM'
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm',
    type: 'script',
    note: 'Supabase JS ESM v2.39.0'
  },
  {
    url: 'https://cdn.jsdelivr.net/npm/dompurify@3.3.1/+esm',
    type: 'script',
    note: 'DOMPurify ESM v3.3.1'
  },
  {
    url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
    type: 'stylesheet',
    note: 'Google Fonts - Poppins'
  }
];

/**
 * Main function
 */
async function main() {
  console.log('Generating SRI hashes for CDN resources...\n');
  
  for (const resource of resources) {
    try {
      console.log(`Fetching ${resource.note}...`);
      const hash = await generateSRIHash(resource.url);
      console.log(`✅ ${resource.type}: ${hash}`);
      console.log(`   URL: ${resource.url}\n`);
    } catch (error) {
      console.error(`❌ Failed to generate hash for ${resource.note}:`, error.message);
      console.log(`   URL: ${resource.url}\n`);
    }
  }
  
  console.log('\nNote: Some resources (like Google GSI) may not support SRI.');
  console.log('For those, consider hosting locally or using alternative methods.');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateSRIHash };
