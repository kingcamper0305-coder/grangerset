/**
 * 🤚 Right Hand — Clean Executor
 * Builds, deploys, and tests things properly
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class RightHand {
  constructor() {
    this.name = 'Right Hand';
    this.role = 'Clean Executor';
    this.log = [];
  }

  _record(action, detail) {
    const entry = { action, detail, time: new Date().toISOString() };
    this.log.push(entry);
    console.log(`[Right Hand] ${action}: ${detail}`);
    return entry;
  }

  /**
   * Run a shell command and return output.
   */
  async run(command, opts = {}) {
    const cwd = opts.cwd || process.cwd();
    const timeout = opts.timeout || 60000;
    return new Promise((resolve, reject) => {
      this._record('run', command);
      exec(command, { cwd, timeout }, (err, stdout, stderr) => {
        if (err) {
          this._record('error', err.message);
          return reject({ ok: false, error: err.message, stderr });
        }
        resolve({ ok: true, stdout: stdout.trim(), stderr: stderr.trim() });
      });
    });
  }

  /**
   * Build a project (npm, python, make).
   */
  async build(projectPath) {
    this._record('build', projectPath);
    const pkgPath = path.join(projectPath, 'package.json');
    const makePath = path.join(projectPath, 'Makefile');
    const setupPath = path.join(projectPath, 'setup.py');

    if (fs.existsSync(pkgPath)) {
      return this.run('npm install && npm run build', { cwd: projectPath });
    } else if (fs.existsSync(makePath)) {
      return this.run('make', { cwd: projectPath });
    } else if (fs.existsSync(setupPath)) {
      return this.run('pip install -e .', { cwd: projectPath });
    }
    return { ok: false, error: 'No build system detected (tried package.json, Makefile, setup.py)' };
  }

  /**
   * Deploy via wrangler (Cloudflare Workers).
   */
  async deploy(projectPath) {
    this._record('deploy', projectPath);
    return this.run('npx wrangler deploy', { cwd: projectPath });
  }

  /**
   * Run tests (npm test, pytest, or custom).
   */
  async test(projectPath) {
    this._record('test', projectPath);
    const pkgPath = path.join(projectPath, 'package.json');
    const hasPytest = fs.existsSync(path.join(projectPath, 'test')) ||
                      fs.existsSync(path.join(projectPath, 'tests'));

    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.scripts && pkg.scripts.test) {
        return this.run('npm test', { cwd: projectPath });
      }
    }
    if (hasPytest) {
      return this.run('python3 -m pytest', { cwd: projectPath });
    }
    return { ok: false, error: 'No test runner found' };
  }

  /**
   * Create a file with content.
   */
  async write(filePath, content) {
    this._record('write', filePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    return { ok: true, path: filePath, size: Buffer.byteLength(content) };
  }

  /**
   * Read a file.
   */
  async read(filePath) {
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: 'File not found: ' + filePath };
    }
    return { ok: true, content: fs.readFileSync(filePath, 'utf8') };
  }

  getLog() { return this.log; }
}

module.exports = RightHand;
