import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import security from 'eslint-plugin-security'
import sonarjs from 'eslint-plugin-sonarjs'
import noUnsanitized from 'eslint-plugin-no-unsanitized'

export default tseslint.config(
  { ignores: ['dist', '**/*.css'] },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  security.configs.recommended,
  sonarjs.configs.recommended,
  noUnsanitized.configs.recommended,
  {
    rules: {
      // Example: relax a sonarjs rule if needed
      // 'sonarjs/cognitive-complexity': 'warn',
      // Example: relax a security rule if needed
      // 'security/detect-object-injection': 'off',
    }
  }
)
