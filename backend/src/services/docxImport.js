const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PYTHON_BIN_CANDIDATES = [
  process.env.PYTHON_BIN,
  'python3',
  'python',
].filter(Boolean);

function parseWithPython(docxPath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, '../../scripts/parse_docx_songs.py');

    const tryNext = (index) => {
      if (index >= PYTHON_BIN_CANDIDATES.length) {
        reject(new Error('No usable Python runtime found for DOCX import. Set PYTHON_BIN in .env if needed.'));
        return;
      }

      const pythonBin = PYTHON_BIN_CANDIDATES[index];
      const child = spawn(pythonBin, [scriptPath, docxPath]);
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', () => {
        tryNext(index + 1);
      });

      child.on('close', (code) => {
        if (code !== 0) {
          if (code === 127 || /not found/i.test(stderr)) {
            tryNext(index + 1);
            return;
          }
          reject(new Error(stderr.trim() || `DOCX parser failed with code ${code}`));
          return;
        }

        try {
          const parsed = JSON.parse(stdout);
          resolve(parsed.songs || []);
        } catch (error) {
          reject(new Error(`Failed to parse DOCX parser output: ${error.message}`));
        }
      });
    };

    tryNext(0);
  });
}

async function parseSongsFromDocxBuffer(buffer) {
  const tempPath = path.join(os.tmpdir(), `lyrics-import-${Date.now()}-${Math.random().toString(36).slice(2)}.docx`);

  try {
    await fs.writeFile(tempPath, buffer);
    return await parseWithPython(tempPath);
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
}

module.exports = {
  parseSongsFromDocxBuffer,
};
