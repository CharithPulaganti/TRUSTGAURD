# TRUSTGUARD AI — Detection Fixes (working-copy update)

## What changed

This update expands the existing local, weighted-rule detector. It does not add an LLM and does not claim that a score is a probability of fraud.

### Detection rule improvements
- Recognizes more law-enforcement authority wording, including cybercrime/cyber-crime officer variants.
- Recognizes contextual arrest coercion such as “to avoid arrest”, conditional arrest threats, and disconnection-related arrest threats.
- Recognizes isolation wording such as “do not discuss this case”, “do not inform your family”, and instructions not to visit/contact police or other people.
- Recognizes more secrecy phrases around a case or investigation.
- Recognizes additional urgency wording such as “today”, “by tonight”, “within ... days”, and “time is running out”.
- Recognizes additional video-call pressure variants.
- Handles wording such as “your Aadhaar is linked to an illegal account” in the criminal-accusation rule.

### Regression tests added
- Police/cybercrime impersonation + illegal-account accusation + ₹12,000 verification fee + arrest threat + secrecy + urgency.
- Police impersonation + investigation claim + video-call pressure + family isolation + transfer demand + arrest threat.
- Bank message demanding OTP/password under account-suspension pressure.
- Legitimate college library fee notice to help guard against obvious false positives.

## Test result verified in this working copy

Command run from `artifacts/api-server`:

```powershell
node --experimental-strip-types --test src/lib/analysis.test.mjs
```

Result: **9 tests passed, 0 failed** using Node.js v22.16.0 in the analysis environment. Node emitted its expected experimental TypeScript stripping warning.

## Important limitations

- This is still a rule-based detector. It can miss new or unusually phrased scams and can flag benign messages that use similar wording.
- The new tests validate known examples; they do not establish real-world accuracy or a statistically calibrated fraud probability.
- The full application build and browser/UI integration were not verified in this environment because pnpm and installed workspace dependencies were not available. Run the full build locally after installing dependencies.

## Suggested local verification

1. Open the project root in VS Code.
2. Install Node.js 22 LTS and pnpm if not already installed.
3. In the project root, run `pnpm install`.
4. Run the focused tests with `pnpm --filter @workspace/api-server test`.
5. Run `pnpm run typecheck` and `pnpm run build`.
6. Manually test the app with the sample messages above and check both the score and evidence shown in the UI.

Keep the original ZIP unchanged. This folder is a separate working copy.
