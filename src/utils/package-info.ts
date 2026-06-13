import * as fs from 'fs';
import * as path from 'path';

const pkgPath = path.join(__dirname, '../../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

export const packageInfo = {
  name: pkg.name as string,
  version: pkg.version as string,
  description: pkg.description as string,
};
