export default {
  // Backend
  "src/**/*.{js,jsx,ts,tsx,json,jsonc,css,scss,md,mdx}": "bun x ultracite fix",

  "packages/**/*.{js,jsx,ts,tsx,json,jsonc,css,scss,md,mdx}":
    "bun x ultracite fix",

  // Frontend
  "web/**/!(*api.d).{js,jsx,ts,tsx}": [
    "bun x oxlint -c web/.oxlintrc.json --fix",
    "bun x oxfmt -c web/.oxfmtrc.jsonc",
  ],

  "web/**/*.{json,jsonc,css,scss,md,mdx}": "bun x oxfmt -c web/.oxfmtrc.jsonc",
};
