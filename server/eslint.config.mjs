import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';

export default tseslint.config(
    // Global ignores must be the first element
    { ignores: ['dist/', 'node_modules/', 'jest.config.ts', '**/*.test.ts'] },

    // Base ESLint recommended rules
    js.configs.recommended,

    // Recommended TypeScript rules (type-aware)
    // Spread the array of configs returned by recommendedTypeChecked
    ...tseslint.configs.recommendedTypeChecked,

    // --- Configure Parser for Type-Aware Rules --- 
    // This object tells the type-aware rules (enabled above) how to find the TS project
    {
        languageOptions: {
            parserOptions: {
                project: true, // Automatically find tsconfig.json
                tsconfigRootDir: import.meta.dirname, // Relative to eslint.config.mjs
            },
        }
    },

    // Security & SonarJS recommended rules
    security.configs.recommended,
    sonarjs.configs.recommended,

    // --- Disable Type Checking for Config File --- 
    // This prevents the type-aware parser options above from applying to the config file itself
    {
        files: ['eslint.config.mjs'],
        extends: [tseslint.configs.disableTypeChecked],
        languageOptions: {
            globals: { // Allow node globals in config file
                ...globals.node,
            }
        },
    },

    // --- Project-specific overrides for TS source files --- 
    {
        files: ['src/**/*.ts'],
        rules: {
            // Relax cognitive complexity slightly
            'sonarjs/cognitive-complexity': ['warn', 20],
            // Allow console logging in Node.js applications
            'no-console': 'off',
            // Warn about explicit any
            '@typescript-eslint/no-explicit-any': 'warn',
            // Add any other specific rule adjustments needed for the backend
            // e.g. '@typescript-eslint/no-unsafe-assignment': 'warn',
            // e.g. 'security/detect-unsafe-regex': 'warn',
        }
    }
); 
