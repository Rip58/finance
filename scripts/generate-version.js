import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Get Commit SHA (from Vercel env or local git)
const getCommitSha = () => {
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
        return process.env.VERCEL_GIT_COMMIT_SHA;
    }
    // Fallback for local
    return 'local-dev';
};

// 2. Read Manual Version from src/lib/version.ts
const getManualVersion = () => {
    try {
        const versionFile = fs.readFileSync(path.join(__dirname, '../src/lib/version.ts'), 'utf8');
        const match = versionFile.match(/APP_VERSION\s*=\s*"([^"]+)"/);
        return match ? match[1] : 'unknown';
    } catch (e) {
        console.error("Error reading version.ts", e);
        return 'unknown';
    }
};

const versionData = {
    version: getManualVersion(),
    gitSha: getCommitSha(),
    timestamp: new Date().toISOString()
};

const outputPath = path.join(__dirname, '../public/version.json');

fs.writeFileSync(outputPath, JSON.stringify(versionData, null, 2));

console.log(`✅ Generated version.json: v${versionData.version} (${versionData.gitSha})`);
