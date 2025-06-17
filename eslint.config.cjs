const path = require("node:path");
const js = require("@eslint/js");
const { FlatCompat } = require("@eslint/eslintrc");

// __dirname is a global in CommonJS modules, so no need to derive it using import.meta.url
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = [
    ...compat.extends("next/core-web-vitals").map(config => ({
        ...config,
        rules: {
            ...config.rules,
            "@next/next/no-html-link-for-pages": "off"
        }
    })),
    ...compat.extends("next/typescript"),
    {
        // This override should apply to JS files within the 'functions' directory context
        // when 'npm run lint --prefix functions' is run.
        // The paths in `files` are typically relative to the eslint.config.cjs file.
        // However, since linting is run from `functions/`, ESLint might resolve
        // this against `functions/`. Let's be explicit.
        files: ["functions/**/*.js"],
        rules: {
            "@typescript-eslint/no-require-imports": "off"
        }
    }
];