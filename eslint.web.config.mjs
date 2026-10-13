import js from '@eslint/js';
import ts from 'typescript-eslint';
export default [
  { ignores:['apps/web/public/**'] },
  { ...js.configs.recommended, files:['apps/web/*.mjs','scripts/build-public-pages.mjs','scripts/build-shared-web.mjs'], languageOptions:{globals:{process:'readonly',console:'readonly',URL:'readonly'}} },
  ...ts.configs.recommended.map(config=>({...config,files:['apps/web/src/privacy-request.ts','supabase/functions/inout-privacy/*.ts']})),
];
