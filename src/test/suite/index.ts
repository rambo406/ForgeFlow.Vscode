import * as path from 'path';
import * as Mocha from 'mocha';
import * as fs from 'fs';

export function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 10000
    });

    const testsRoot = path.resolve(__dirname, '..');

    return new Promise((resolve, reject) => {
        try {
            // Find all test files recursively
            const findTestFiles = (dir: string): string[] => {
                const files: string[] = [];
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        files.push(...findTestFiles(fullPath));
                    } else if (entry.name.endsWith('.test.js')) {
                        files.push(fullPath);
                    }
                }
                return files;
            };

            const testFiles = findTestFiles(testsRoot);
            
            // Add files to the test suite
            testFiles.forEach(file => mocha.addFile(file));

            // Run the mocha test
            mocha.run((failures: number) => {
                if (failures > 0) {
                    reject(new Error(`${failures} tests failed.`));
                } else {
                    resolve();
                }
            });
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
}