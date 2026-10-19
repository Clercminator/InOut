# IN/OUT repository map

Keep work focused. Do not add instructions or documentation unless requested.

- `apps/mobile` is the product: Expo 57, React Native, Expo Router, TypeScript. Routes live in `app`; shared UI/services in `src`. SQLite stores private history, preferences and Coach progress locally.
- `packages/breathing-engine` owns timing; `protocols` owns approved cadences; `shared-types`, `design-tokens` and `sharing` supply shared contracts. Extend these rather than creating a second engine or subscription system.
- Start with `session-controller.ts`, `storage.ts`, `entitlements.ts`, `subscriptions.ts` and `product-config.ts`. Coach is deterministic and offline. AI remains disabled pending authenticated server entitlement, quota and cost enforcement.
- `apps/web` supplies public/legal pages and shared exercises. `supabase/functions` and historical migrations support sharing, reviewer access and lifecycle services, not cloud history synchronization.
- Locale source is `apps/mobile/src/locales/*.tsv`; run `npm run locales:build` after edits. Device selection and persisted manual selection use the existing i18n service.

## Check and release

`npm ci`; `npm run typecheck`; `npm test`; `npm run test:mobile`; `npm run locales:check`. Use focused tests during edits, then one regression pass. `npm run release:check` checks metadata/build policy, not provider or physical-device acceptance.

From `apps/mobile`, `npx expo export --platform android` checks bundling. `npx eas-cli build --platform android --profile store-test` produces the internal candidate using existing remote upload signing and real store billing with **test ads**. Use the existing `imr-tech/inout` EAS project and `com.imrtech.inout`. Check EAS/Play version history before incrementing. Submit only with the explicit `internal` profile; public Production requires owner authorization and all gates in `release/readiness.json`.

RevenueCat, ads/consent and reviewer grants all pass through centralized services. Never invent prices, trial eligibility, purchases or biometric claims. External store/payment/provider configuration belongs to the owner. See `docs/OWNER_SETUP_CHECKLIST.md` for the maintained acceptance checklist and `docs/README.md` for implementation details.

## Preserve

Never commit secrets, env files, private keys, service accounts or signing files. Never delete data, migrations, signing material or unknown owner files. Keep local `artifacts/` (including rollback builds/worktrees), `UI/` design references, and the animation lab/native capture workflows: these remain intentional. Check references before deleting assets; generated exports/caches are ignored. Native audio, haptics, purchases, ads and smoothness require physical-device evidence.
