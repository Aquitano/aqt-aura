import css from '@eslint/css';
import js from '@eslint/js';
import json from '@eslint/json';
import reactPlugin from 'eslint-plugin-react';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
    globalIgnores(['node_modules/', 'build/', '.output/', 'dist/', '.wxt/', 'old/']),
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        plugins: { js },
        extends: ['js/recommended'],
        languageOptions: { globals: globals.browser },
    },
    tseslint.configs.recommended,
    reactPlugin.configs.flat['jsx-runtime'],
    { files: ['**/*.json'], plugins: { json }, language: 'json/json', extends: ['json/recommended'] },
    { files: ['**/*.css'], plugins: { css }, language: 'css/css', extends: ['css/recommended'] },
]);
