import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(process.cwd());
const envFilePath = resolve(rootDir, '.env.local');
const frontendEnvFilePath = resolve(rootDir, 'packages/frontend/.env.local');
const backendSettingsExamplePath = resolve(rootDir, 'packages/backend/local.settings.json.example');
const backendSettingsPath = resolve(rootDir, 'packages/backend/local.settings.json');

const backendKeys = [
  'AzureWebJobsStorage',
  'FUNCTIONS_WORKER_RUNTIME',
  'APPLICATIONINSIGHTS_CONNECTION_STRING',
  'CHURCHTOOL_URL',
  'OIDC_AUTHORITY_URL',
  'CHURCHTOOL_IDP_BASE_URL',
  'CHURCHTOOL_IDP_FUNCTION_KEY',
  'CHURCHTOOL_ADMIN_GROUP_ID',
  'CHURCHTOOL_IDP_STORAGE_CONNECTION_STRING',
];

function stripInlineComment(rawValue) {
  let quote = '';
  for (let index = 0; index < rawValue.length; index += 1) {
    const char = rawValue[index];

    if ((char === '"' || char === "'") && rawValue[index - 1] !== '\\') {
      if (quote === '') {
        quote = char;
      } else if (quote === char) {
        quote = '';
      }
      continue;
    }

    if (char === '#' && quote === '') {
      const previous = rawValue[index - 1];
      if (index === 0 || previous === ' ' || previous === '\t') {
        return rawValue.slice(0, index).trim();
      }
    }
  }

  return rawValue.trim();
}

function normalizeValue(rawValue) {
  const withoutComment = stripInlineComment(rawValue);
  if (
    (withoutComment.startsWith('"') && withoutComment.endsWith('"'))
    || (withoutComment.startsWith("'") && withoutComment.endsWith("'"))
  ) {
    return withoutComment.slice(1, -1);
  }

  return withoutComment;
}

function parseEnvFile(content) {
  const result = new Map();

  for (const line of content.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1);
    const value = normalizeValue(rawValue);

    result.set(key, value);
  }

  return result;
}

function loadJson(path) {
  if (!existsSync(path)) {
    return null;
  }

  return JSON.parse(readFileSync(path, 'utf8'));
}

if (!existsSync(envFilePath)) {
  console.error('Fehler: .env.local wurde im Projekt-Root nicht gefunden.');
  console.error('Bitte erstelle die Datei zuerst, z. B. mit: cp .env.example .env.local');
  process.exit(1);
}

const envMap = parseEnvFile(readFileSync(envFilePath, 'utf8'));

if (!envMap.has('OIDC_AUTHORITY_URL') && envMap.has('VITE_OIDC_AUTHORITY')) {
  envMap.set('OIDC_AUTHORITY_URL', envMap.get('VITE_OIDC_AUTHORITY'));
}

const frontendEntries = [];
for (const [key, value] of envMap.entries()) {
  if (key.startsWith('VITE_')) {
    frontendEntries.push(`${key}=${value}`);
  }
}

frontendEntries.sort((left, right) => left.localeCompare(right));
writeFileSync(frontendEnvFilePath, `${frontendEntries.join('\n')}\n`, 'utf8');

const baseBackendSettings = loadJson(backendSettingsPath)
  ?? loadJson(backendSettingsExamplePath)
  ?? { IsEncrypted: false, Values: {}, Host: {} };

const backendSettings = {
  ...baseBackendSettings,
  Values: {
    ...(baseBackendSettings.Values ?? {}),
  },
};
console.log('Synchronisiere Backend-Einstellungen...');
console.log(envMap);
for (const key of backendKeys) {
  if (envMap.has(key)) {
    backendSettings.Values[key] = envMap.get(key);
  }
}

writeFileSync(backendSettingsPath, `${JSON.stringify(backendSettings, null, 2)}\n`, 'utf8');

console.log('Umgebungsdateien synchronisiert:');
console.log(`- ${frontendEnvFilePath}`);
console.log(`- ${backendSettingsPath}`);
