/**
 * Version Generator
 * Generates a unique version for each build to enable cache busting
 */

import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate version based on timestamp and package.json version
const packageJsonPath = path.join(__dirname, '../../package.json');
const packageJson = JSON.parse(
  readFileSync(packageJsonPath, 'utf-8')
);

const timestamp = Date.now();
const version = `${packageJson.version}-${timestamp}`;
const shortHash = createHash('md5').update(version).digest('hex').substring(0, 8);

const versionData = {
  version,
  timestamp,
  hash: shortHash,
  buildTime: new Date().toISOString(),
  packageVersion: packageJson.version
};

// Write version to a JSON file
const versionFilePath = path.join(__dirname, '../../public/version.json');
writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2));

console.log(`[Version] Build version: ${version} (${shortHash})`);
console.log(`[Version] Build time: ${versionData.buildTime}`);

export default versionData;

