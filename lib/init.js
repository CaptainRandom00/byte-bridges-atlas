/**
 * BB Atlas — init subcommand
 *
 * Scaffolds a starter project.json (and a placeholder index.html) in a
 * target directory. Refuses to overwrite an existing project.json.
 */
const fs = require('fs');
const path = require('path');
const { generate } = require('./generate');

const TEMPLATE_PATH = path.resolve(__dirname, '..', 'templates', 'starter.project.json');

function init(targetDir) {
  const dir = path.resolve(targetDir || '.');
  fs.mkdirSync(dir, { recursive: true });

  const jsonPath = path.join(dir, 'project.json');
  const htmlPath = path.join(dir, 'index.html');

  if (fs.existsSync(jsonPath)) {
    throw new Error(`refusing to overwrite ${jsonPath} — delete or move it first`);
  }

  fs.copyFileSync(TEMPLATE_PATH, jsonPath);
  const { sizeBytes, viewCount } = generate({ dataPath: jsonPath, outPath: htmlPath });

  return {
    dir,
    jsonPath,
    htmlPath,
    sizeBytes,
    viewCount,
  };
}

module.exports = { init };
