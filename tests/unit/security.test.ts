import { describe, it, expect } from 'vitest';
import { validatePath } from '../../src/lib/security.js';
import path from 'path';

describe('validatePath', () => {
  it('should allow paths inside root', async () => {
    const root = process.cwd();
    const safePath = path.join(root, 'src');
    await expect(validatePath(safePath, [root])).resolves.toBe(safePath);
  });

  it('should block paths outside root', async () => {
    const root = process.cwd();
    const unsafePath = '/etc/passwd';
    await expect(validatePath(unsafePath, [root])).rejects.toThrow('Access denied');
  });

  it('should block paths using parent directory traversal', async () => {
    const root = process.cwd();
    const unsafePath = path.join(root, '../outside');
    await expect(validatePath(unsafePath, [root])).rejects.toThrow('Access denied');
  });
});
