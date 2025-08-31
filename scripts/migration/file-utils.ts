import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

/**
 * File I/O utilities for reading and writing .store.ts files during migration
 */

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const copyFile = promisify(fs.copyFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

/**
 * Options for file operations
 */
export interface FileOperationOptions {
  encoding?: BufferEncoding;
  createBackup?: boolean;
  backupSuffix?: string;
}

/**
 * Recursively finds all .store.ts files in a directory
 */
export async function findStoreFiles(rootDirectory: string): Promise<string[]> {
  const storeFiles: string[] = [];
  
  async function scanDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await readdir(dirPath);
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          // Skip node_modules and other irrelevant directories
          if (!['node_modules', '.git', 'dist', 'build'].includes(entry)) {
            await scanDirectory(fullPath);
          }
        } else if (stats.isFile() && entry.endsWith('.store.ts')) {
          storeFiles.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${dirPath}:`, error);
    }
  }
  
  await scanDirectory(rootDirectory);
  return storeFiles;
}

/**
 * Reads a TypeScript file and returns its content
 */
export async function readStoreFile(
  filePath: string, 
  options: FileOperationOptions = {}
): Promise<string> {
  const { encoding = 'utf8' } = options;
  
  try {
    return await readFile(filePath, encoding);
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error}`);
  }
}

/**
 * Writes content to a TypeScript file
 */
export async function writeStoreFile(
  filePath: string, 
  content: string, 
  options: FileOperationOptions = {}
): Promise<void> {
  const { encoding = 'utf8', createBackup = false, backupSuffix = '.backup' } = options;
  
  try {
    // Create backup if requested
    if (createBackup) {
      const backupPath = `${filePath}${backupSuffix}`;
      await copyFile(filePath, backupPath);
    }
    
    // Ensure directory exists
    const directory = path.dirname(filePath);
    await mkdir(directory, { recursive: true });
    
    // Write the file
    await writeFile(filePath, content, encoding);
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error}`);
  }
}

/**
 * Creates a backup of a file before modification
 */
export async function createBackup(
  originalPath: string, 
  backupSuffix: string = '.backup'
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${originalPath}.${timestamp}${backupSuffix}`;
  
  try {
    await copyFile(originalPath, backupPath);
    return backupPath;
  } catch (error) {
    throw new Error(`Failed to create backup for ${originalPath}: ${error}`);
  }
}

/**
 * Restores a file from its backup
 */
export async function restoreFromBackup(
  originalPath: string, 
  backupPath: string
): Promise<void> {
  try {
    await copyFile(backupPath, originalPath);
  } catch (error) {
    throw new Error(`Failed to restore ${originalPath} from backup: ${error}`);
  }
}

/**
 * Checks if a file exists and is accessible
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets file statistics
 */
export async function getFileStats(filePath: string): Promise<fs.Stats> {
  try {
    return await stat(filePath);
  } catch (error) {
    throw new Error(`Failed to get stats for ${filePath}: ${error}`);
  }
}

/**
 * Validates that a file is a TypeScript file and readable
 */
export async function validateStoreFile(filePath: string): Promise<{
  isValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  // Check file extension
  if (!filePath.endsWith('.store.ts')) {
    errors.push('File must have .store.ts extension');
  }
  
  // Check file exists
  if (!(await fileExists(filePath))) {
    errors.push('File does not exist');
    return { isValid: false, errors };
  }
  
  // Check file is readable
  try {
    await readStoreFile(filePath);
  } catch (error) {
    errors.push(`File is not readable: ${error}`);
  }
  
  // Check file is not empty
  try {
    const content = await readStoreFile(filePath);
    if (content.trim().length === 0) {
      errors.push('File is empty');
    }
  } catch {
    // Already handled above
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Batch reads multiple store files
 */
export async function readMultipleStoreFiles(
  filePaths: string[]
): Promise<Array<{ path: string; content: string; error?: string }>> {
  const results = await Promise.allSettled(
    filePaths.map(async (filePath) => ({
      path: filePath,
      content: await readStoreFile(filePath)
    }))
  );
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        path: filePaths[index],
        content: '',
        error: result.reason?.message || 'Unknown error'
      };
    }
  });
}

/**
 * Creates directory structure for migration output
 */
export async function createMigrationDirectories(baseDir: string): Promise<void> {
  const directories = [
    path.join(baseDir, 'backups'),
    path.join(baseDir, 'reports'),
    path.join(baseDir, 'logs')
  ];
  
  for (const dir of directories) {
    await mkdir(dir, { recursive: true });
  }
}

/**
 * Safely writes a file with atomic operation (write to temp file, then rename)
 */
export async function atomicWriteFile(
  filePath: string, 
  content: string
): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  
  try {
    await writeFile(tempPath, content, 'utf8');
    
    // On Windows, we need to handle file replacement differently
    if (process.platform === 'win32') {
      // Delete original if it exists, then rename temp file
      if (await fileExists(filePath)) {
        await fs.promises.unlink(filePath);
      }
    }
    
    await fs.promises.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      if (await fileExists(tempPath)) {
        await fs.promises.unlink(tempPath);
      }
    } catch {
      // Ignore cleanup errors
    }
    
    throw new Error(`Failed to atomically write ${filePath}: ${error}`);
  }
}