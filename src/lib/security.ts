import path from 'path';

/**
 * Validates if a requested path is within the allowed root directories.
 * Throws an error if the path is outside the allowed scope.
 * 
 * @param requestedPath The path to validate
 * @param allowedRoots List of allowed root directories. Defaults to process.cwd() if not provided.
 * @returns The resolved absolute path
 */
export async function validatePath(requestedPath: string, allowedRoots?: string[]): Promise<string> {
    const resolvedPath = path.resolve(requestedPath);
    const roots = allowedRoots || [process.cwd()];

    const isAllowed = roots.some(root => {
        const resolvedRoot = path.resolve(root);
        return resolvedPath.startsWith(resolvedRoot) && 
               (resolvedPath === resolvedRoot || resolvedPath.startsWith(resolvedRoot + path.sep));
    });

    if (!isAllowed) {
        throw new Error(`Access denied. The path '${requestedPath}' is outside the allowed scope. Allowed roots: ${roots.join(', ')}`);
    }

    return resolvedPath;
}
