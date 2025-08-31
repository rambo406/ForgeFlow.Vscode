# RxMethod Migration CLI Tool

A powerful command-line tool for migrating async/await methods to RxMethod implementations in Angular applications using @ngrx/signals.

## Features

- 🔄 **Automatic Pattern Recognition** - Detects simple loading, optimistic update, and bulk operation patterns
- 🛡️ **Safe Migration** - Creates backups and validates changes before applying
- 🔧 **Compatibility Wrappers** - Generates async wrappers to maintain existing API compatibility
- 📊 **Detailed Reporting** - Comprehensive reports in multiple formats (Markdown, JSON, HTML, Text)
- 🎯 **Dry Run Mode** - Preview changes without modifying files
- 🚀 **Parallel Processing** - Efficient batch processing of multiple files
- 🎛️ **Interactive Mode** - Guided setup and configuration
- ✅ **Validation** - Pre and post-migration validation with TypeScript compilation checks

## Installation

### Global Installation
```bash
npm install -g rxmethod-migrate-cli
```

### Local Installation
```bash
npm install --save-dev rxmethod-migrate-cli
```

### From Source
```bash
git clone <repository>
cd scripts/migration
npm install
npm run build
npm link
```

## Quick Start

### 1. Basic Migration
```bash
# Migrate all store files in current directory (dry run)
rxmethod-migrate migrate --dry-run

# Migrate specific files
rxmethod-migrate migrate --target "src/**/*.store.ts" --dry-run

# Actual migration with backups
rxmethod-migrate migrate
```

### 2. Interactive Setup
```bash
rxmethod-migrate setup
```

### 3. Validate Files Before Migration
```bash
rxmethod-migrate validate
```

### 4. Check System Status
```bash
rxmethod-migrate status
```

## Commands

### `migrate [directory]`
Run async/await to RxMethod migration

**Arguments:**
- `directory` - Root directory to scan (default: current directory)

**Options:**
- `-t, --target <files...>` - Specific files to migrate (supports glob patterns)
- `-e, --exclude <patterns...>` - Patterns to exclude from migration
- `-d, --dry-run` - Preview changes without writing files
- `-v, --verbose` - Enable verbose logging
- `--no-backup` - Skip creating backup files
- `--no-compatibility` - Skip generating compatibility wrappers
- `-f, --format <format>` - Report format (markdown|json|html|text)
- `-o, --output <path>` - Output path for migration report
- `-i, --interactive` - Run in interactive mode
- `-p, --parallel <number>` - Maximum parallel file processing (default: 5)
- `--stop-on-error` - Stop migration on first error
- `--force` - Force migration even with validation warnings

**Examples:**
```bash
# Basic dry run
rxmethod-migrate migrate --dry-run

# Migrate specific store files
rxmethod-migrate migrate src/stores --target "**/*.store.ts"

# Interactive migration with custom report
rxmethod-migrate migrate --interactive --format html --output report.html

# Production migration with minimal logging
rxmethod-migrate migrate --no-backup --format json --parallel 10
```

### `setup`
Interactive setup for migration configuration

Creates a configuration file (`.rxmethod-migrate.json`) with your preferences.

### `validate [directory]`
Validate store files for migration readiness

**Options:**
- `-t, --target <files...>` - Specific files to validate
- `-v, --verbose` - Enable verbose output

**Examples:**
```bash
# Validate all store files
rxmethod-migrate validate

# Validate specific files
rxmethod-migrate validate --target "src/user.store.ts" --verbose
```

### `report <reportPath>`
Generate report from previous migration

**Arguments:**
- `reportPath` - Path to migration results JSON file

**Options:**
- `-f, --format <format>` - Output format (markdown|html|text)
- `-o, --output <path>` - Output file path

**Examples:**
```bash
# Generate HTML report
rxmethod-migrate report migration-results.json --format html

# Generate and save report
rxmethod-migrate report results.json --format markdown --output final-report.md
```

### `status`
Show migration system status and capabilities

Displays:
- Dependency availability (TypeScript, @ngrx/signals, RxJS)
- Migration component status
- Supported patterns
- Available commands

## Configuration

### Configuration File
Create `.rxmethod-migrate.json` in your project root:

```json
{
  "rootDirectory": "./src",
  "dryRun": false,
  "createBackups": true,
  "preserveCompatibility": true,
  "reportFormat": "markdown",
  "excludePatterns": [
    "node_modules/**",
    "dist/**",
    "**/*.spec.ts",
    "**/*.test.ts"
  ],
  "maxParallelFiles": 5
}
```

### Environment Variables
- `RXMETHOD_MIGRATE_VERBOSE` - Enable verbose logging
- `RXMETHOD_MIGRATE_DRY_RUN` - Force dry run mode
- `RXMETHOD_MIGRATE_NO_BACKUP` - Disable backup creation

## Migration Patterns

The tool automatically detects and converts these patterns:

### 1. Simple Loading Pattern
**Before:**
```typescript
async loadUsers(): Promise<User[]> {
  patchState(store, { isLoading: true });
  try {
    const users = await userService.getUsers();
    patchState(store, { users });
    return users;
  } catch (error) {
    patchState(store, { error: error.message });
    throw error;
  } finally {
    patchState(store, { isLoading: false });
  }
}
```

**After:**
```typescript
readonly loadUsers = rxMethod<void>(() =>
  pipe(
    switchMap(() => {
      patchState(this, { isLoading: true });
      return from(this.userService.getUsers()).pipe(
        tap((users) => patchState(this, { users })),
        catchError((error) => {
          patchState(this, { error: error.message });
          return EMPTY;
        }),
        finalize(() => patchState(this, { isLoading: false }))
      );
    })
  )
);

// Compatibility wrapper
async loadUsersAsync(): Promise<User[]> {
  return lastValueFrom(this.loadUsers());
}
```

### 2. Optimistic Update Pattern
**Before:**
```typescript
async updateUser(id: string, updates: Partial<User>): Promise<void> {
  const originalUsers = store.users();
  const optimisticUsers = originalUsers.map(user => 
    user.id === id ? { ...user, ...updates } : user
  );
  patchState(store, { users: optimisticUsers });

  try {
    await userService.updateUser(id, updates);
  } catch (error) {
    patchState(store, { users: originalUsers });
    throw error;
  }
}
```

**After:**
```typescript
readonly updateUser = rxMethod<{id: string, updates: Partial<User>}>((params) =>
  params.pipe(
    switchMap(({id, updates}) => {
      const originalUsers = this.users();
      const optimisticUsers = originalUsers.map(user => 
        user.id === id ? { ...user, ...updates } : user
      );
      
      patchState(this, { users: optimisticUsers });
      
      return from(this.userService.updateUser(id, updates)).pipe(
        catchError((error) => {
          patchState(this, { users: originalUsers });
          throw error;
        })
      );
    })
  )
);
```

### 3. Bulk Operations Pattern
**Before:**
```typescript
async deleteMultipleUsers(userIds: string[]): Promise<void> {
  patchState(store, { isLoading: true });
  
  try {
    await Promise.all(userIds.map(id => userService.deleteUser(id)));
    const updatedUsers = store.users().filter(user => !userIds.includes(user.id));
    patchState(store, { users: updatedUsers });
  } finally {
    patchState(store, { isLoading: false });
  }
}
```

**After:**
```typescript
readonly deleteMultipleUsers = rxMethod<string[]>((userIds) =>
  userIds.pipe(
    switchMap((ids) => {
      patchState(this, { isLoading: true });
      
      return from(Promise.all(ids.map(id => this.userService.deleteUser(id)))).pipe(
        tap(() => {
          const updatedUsers = this.users().filter(user => !ids.includes(user.id));
          patchState(this, { users: updatedUsers });
        }),
        finalize(() => patchState(this, { isLoading: false }))
      );
    })
  )
);
```

## Output and Reports

### Dry Run Output
```
⚙️ Migration Configuration:
   Root directory: /project/src
   Dry run: Yes
   Create backups: Yes
   Compatibility wrappers: Yes
   Report format: markdown

📋 Migration Results:
✅ Migration completed successfully!

📊 Statistics:
   Files processed: 5
   Successful conversions: 5
   Methods converted: 12
   Compatibility wrappers: 12
```

### Detailed Reports
Generated reports include:
- Executive summary
- File-by-file conversion details
- Before/after code comparisons
- Warning and error analysis
- Performance metrics
- Manual review recommendations

### Report Formats

**Markdown** - Human-readable with code highlighting
**JSON** - Machine-readable for CI/CD integration
**HTML** - Interactive web reports with search and filtering
**Text** - Simple console-friendly output

## Error Handling

### Common Issues and Solutions

**TypeScript Compilation Errors:**
```
❌ Pre-validation found issues: Cannot find module '@ngrx/signals'
```
Solution: Install required dependencies
```bash
npm install @ngrx/signals rxjs
```

**File Permission Errors:**
```
❌ Failed to create backup for file.store.ts: EACCES
```
Solution: Check file permissions or run with appropriate privileges

**Pattern Recognition Warnings:**
```
⚠️ Methods requiring manual review: complexAsyncOperation
   Reason: Complex pattern requires manual review
```
Solution: Review generated code and adjust manually if needed

### Rollback Process
If migration fails:
1. Original files are automatically restored from backups
2. Error report is generated with specific failure details
3. Partial changes are rolled back to maintain consistency

## Advanced Usage

### Custom Patterns
For methods that don't match standard patterns, the tool generates custom templates that preserve the original logic structure while converting to RxMethod format.

### Integration with CI/CD
```bash
# Validate before merging
rxmethod-migrate validate --target "src/**/*.store.ts"

# Generate migration report for review
rxmethod-migrate migrate --dry-run --format json --output migration-analysis.json

# Apply migration in production pipeline
rxmethod-migrate migrate --force --no-backup --format json
```

### Batch Processing
```bash
# Process multiple directories
for dir in src/stores src/features src/shared; do
  rxmethod-migrate migrate $dir --dry-run
done

# Parallel processing with custom settings
rxmethod-migrate migrate --parallel 10 --verbose
```

## Troubleshooting

### Debug Mode
```bash
# Enable detailed logging
rxmethod-migrate migrate --verbose

# Check system status
rxmethod-migrate status

# Validate specific problematic files
rxmethod-migrate validate --target "problematic.store.ts" --verbose
```

### Common Solutions

1. **Missing Dependencies**: Run `rxmethod-migrate status` to check dependencies
2. **Permission Issues**: Ensure write permissions for target directories
3. **TypeScript Errors**: Fix compilation errors before migration
4. **Pattern Recognition**: Use `--force` flag for complex patterns requiring manual review
5. **Large Codebases**: Increase `--parallel` setting for better performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- 📧 Email: support@forgeflow.dev
- 🐛 Issues: GitHub Issues
- 📖 Documentation: [Full Documentation](./docs/)
- 💬 Discussions: GitHub Discussions