import eslintReact from '@eslint-react/eslint-plugin'
import js from '@eslint/js'
import {defineConfig} from 'eslint/config'
import globals from 'globals'
import reactRefresh from 'eslint-plugin-react-refresh'

export default defineConfig([
    {ignores: ['dist']},
    {
        files: ['**/*.{js,jsx}'],
        extends: [
            js.configs.recommended,
            eslintReact.configs.recommended
        ],
        languageOptions: {
            ecmaVersion: 2022,
            globals: globals.browser,
            parserOptions: {
                ecmaVersion: 'latest',
                ecmaFeatures: {jsx: true},
                sourceType: 'module'
            }
        },
        plugins: {
            'react-refresh': reactRefresh
        },
        rules: {
            'react-refresh/only-export-components': ['warn', {allowConstantExport: true}]
        }
    }
])
