const fs = require('node:fs');
const path = require('node:path');

const requestedPath = process.argv[2];

if (!requestedPath) {
  console.error('Usage: node scripts/ensure-env-file.js <env-file>');
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), requestedPath);

if (!fs.existsSync(resolvedPath)) {
  console.error(
    `Missing ${requestedPath}. Copy ${requestedPath}.example to ${requestedPath} and point it at your dedicated test database before running this command.`,
  );
  process.exit(1);
}
