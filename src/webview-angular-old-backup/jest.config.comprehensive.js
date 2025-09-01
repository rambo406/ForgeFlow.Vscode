/**
 * Jest configuration for comprehensive testing
 * Supports unit, integration, performance, and visual regression tests
 */

module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/src/setup-jest.ts'],
  testEnvironment: 'jsdom',
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: 'tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$'
      }
    ]
  },
  
  // Module resolution
  moduleFileExtensions: ['ts', 'html', 'js', 'json', 'mjs'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/src/app/shared/$1',
    '^@core/(.*)$': '<rootDir>/src/app/core/$1',
    '^@features/(.*)$': '<rootDir>/src/app/features/$1',
    '^@testing/(.*)$': '<rootDir>/src/app/testing/$1'
  },
  
  // Test patterns and organization
  testMatch: [
    '<rootDir>/src/**/*.spec.ts'
  ],
  
  // Test suites organization
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: [
        '<rootDir>/src/**/*.spec.ts'
      ],
      testPathIgnorePatterns: [
        'integration\\.spec\\.ts$',
        'performance.*\\.spec\\.ts$',
        'visual-regression\\.spec\\.ts$',
        'comprehensive-regression\\.spec\\.ts$'
      ]
    },
    {
      displayName: 'Integration Tests',
      testMatch: [
        '<rootDir>/src/**/*integration*.spec.ts'
      ]
    },
    {
      displayName: 'Performance Tests',
      testMatch: [
        '<rootDir>/src/**/*performance*.spec.ts'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/setup-jest.ts',
        '<rootDir>/src/app/testing/performance-setup.ts'
      ]
    },
    {
      displayName: 'Visual Regression Tests',
      testMatch: [
        '<rootDir>/src/**/*visual-regression*.spec.ts',
        '<rootDir>/src/**/*comprehensive-regression*.spec.ts'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/setup-jest.ts',
        '<rootDir>/src/app/testing/visual-regression-setup.ts'
      ]
    }
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/setup-jest.ts',
    '!src/app/testing/**/*.ts'
  ],
  
  coverageReporters: [
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  coverageDirectory: 'coverage',
  
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Stricter requirements for core services
    'src/app/core/services/*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Performance and timeout settings
  testTimeout: 30000, // 30 seconds for complex tests
  
  // Global settings
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.spec.json',
      stringifyContentPathRegex: '\\.(html|svg)$'
    }
  },
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(@angular|@ngrx|@spartan-ng|@ng-icons)/)'
  ],
  
  // Test results and reporting
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './test-results',
        filename: 'jest-report.html',
        expand: true,
        hideIcon: false
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'junit.xml'
      }
    ]
  ],
  
  // Performance monitoring
  verbose: false,
  silent: false,
  
  // Custom test environment setup
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  },
  
  // Error handling
  errorOnDeprecated: true,
  
  // Cache configuration
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Snapshot configuration
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment'
  ]
};