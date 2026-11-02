import ts from "typescript";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { t } from "../apps/mobile/src/i18n";
import es from "../apps/mobile/src/locales/es.json";
import pt from "../apps/mobile/src/locales/pt.json";

const catalogKeys = new Set(Object.keys(es).map(key => key.toLowerCase()));
const escapePattern = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const catalogTemplates = Object.keys(es).filter(key => /\{\d+\}/.test(key)).map(key => ({
  pattern: new RegExp("^" + key.split(/(\{\d+\})/).map(part => /^\{\d+\}$/.test(part) ? "(.+?)" : escapePattern(part)).join("") + "$", "i"),
  fragments: key.split(/\{\d+\}/).map(part => part.trim()).filter(Boolean),
}));
/** A partially translated string is still a defect (e.g. 'Endurance ritmo'). */
export function hasCompleteTranslation(source: string, depth = 0): boolean {
  const text = source.replace(/\s+/g, " ").trim();
  if (!text || !/[A-Za-z]/.test(text) || properNames.has(text) || catalogKeys.has(text.toLowerCase())) return true;
  if (depth > 20) return false;
  const clean = text.replace(/^[★✓○·→\s.,:]+|[·→\s.,:]+$/g, "");
  if (clean !== text) return hasCompleteTranslation(clean, depth + 1);
  if (/^\d+(?:[.,]\d+)?\s*(?:s|sec|min|m|h|%)$/i.test(text)) return true;
  const pieces = text.split(/\s*[·→]\s*/);
  if (pieces.length > 1) return pieces.every(piece => hasCompleteTranslation(piece, depth + 1));
  // JSX splits text around expressions; each fixed fragment must belong to an authored template.
  if (catalogTemplates.some(item => item.fragments.some(fragment => fragment.toLowerCase() === text.toLowerCase()))) return true;
  return catalogTemplates.some(item => {
    const match = item.pattern.exec(text);
    return match && match.slice(1).every(value => value.length < text.length && hasCompleteTranslation(value, depth + 1));
  });
}
export function catalogIntegrityIssues() {
  const issues: string[] = [];
  for (const [language, catalog] of Object.entries({ es, pt })) for (const [key, value] of Object.entries(catalog)) {
    if (!value.trim() || /\uFFFD|Ã[\u0080-\u00bf]|Â[\u0080-\u00bf]/.test(value)) issues.push(`${language}: damaged translation: ${key}`);
  }
  return issues;
}

const visibleAttributes = new Set(["title", "label", "summary", "placeholder", "accessibilityLabel", "accessibilityHint", "backLabel", "timing"]);
const contentFields = new Set(["title", "label", "text", "description", "purpose", "instructions", "precaution", "heading", "body", "reminder", "message", "rationale", "recommendation", "feeling", "requirement"]);
const properNames = new Set(["IN", "OUT", "IN/OUT", "IN/OUT ·", "IN/OUT PRO", "InOut", "InOut Pro", "Pro", "PRO", "Pulse", "Nadi Shodhana", "Wim Hof", "Westerpark", "Bliss Breath", "Sweet and Spicy", "The Awakening", "The Initiation", "Apple", "Google", "App Store", "Google Play", "Apple App Store", "OK", "BOLT", "CO₂", "English", "Español (Latinoamérica)", "Português (Brasil)", "s", "{0} min", "{0} {1}s", "RITUAL", "EXPERIMENTAL"]);
// Internal failures are caught and replaced with localized recovery copy before display.
const internalErrors = new Set(["Invalid frequency state", "Invalid coach state", "Invalid program enrollment", "Invalid completion state", "Multiple active programs", "Invalid weekly plan", "Unknown program", "Development entitlements are disabled in release builds", "Invalid store entitlement", "Development entitlements are disabled", "Invalid achievement notification identifier.", "HTTPS required", "Reviewer request failed", "Secure storage unavailable", "Check device clock", "SessionProvider required", "Verified account ID required", "Development subscriptions are disabled", "Unexpected mock grant", "Store verification required", "Unhandled JavaScript error", "Telemetry withdrawal failed"]);
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(f => f.isDirectory() ? files(`${dir}/${f.name}`) : /\.tsx?$/.test(f.name) ? [`${dir}/${f.name}`] : []);
}
function ancestors(node: ts.Node) { const result: ts.Node[] = []; for (let p = node.parent; p; p = p.parent) result.push(p); return result; }
export function copyCandidates(sourceText: string, file: string) {
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);
  const nativeComponents = new Set<string>(), nativeNamespaces = new Set<string>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== "react-native") continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) nativeNamespaces.add(bindings.name.text);
    if (bindings && ts.isNamedImports(bindings)) for (const binding of bindings.elements) nativeComponents.add(binding.name.text);
  }
  const candidates: { text: string; line: number; raw: boolean }[] = [];
  function visit(n: ts.Node) {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isJsxText(n) || ts.isTemplateExpression(n)) {
      const value = ts.isTemplateExpression(n) ? n.head.text + n.templateSpans.map((span, index) => `{${index}}${span.literal.text}`).join("") : n.text;
      const text = value.replace(/\s+/g, " ").trim(), parents = ancestors(n);
      const attribute = parents.find(ts.isJsxAttribute);
      const property = parents.find(ts.isPropertyAssignment);
      const jsx = parents.find(ts.isJsxElement);
      const call = parents.find(ts.isCallExpression);
      const callArgument = !!call && !parents.slice(0, parents.indexOf(call)).some(p => ts.isJsxElement(p) || ts.isJsxAttribute(p) || ts.isArrowFunction(p) || ts.isPropertyAssignment(p));
      const visible = ts.isJsxText(n) || !!attribute && visibleAttributes.has(attribute.name.getText(source)) ||
        !!property && contentFields.has(property.name.getText(source)) ||
        !!jsx && !attribute && /^(Copy|Title|Label|Text|Native.Text)$/.test(jsx.openingElement.tagName.getText(source)) ||
        !!call && /^(t|message|countLabel)$/.test(call.expression.getText(source)) && call.arguments[0] === n;
      const prose = /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(text);
      const technical = parents.some(p => ts.isImportDeclaration(p) || ts.isTypeNode(p) || ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(p.operatorToken.kind)) ||
        !prose && callArgument && !/^(t|message)$/.test(call!.expression.getText(source)) ||
        !!property && !contentFields.has(property.name.getText(source)) && !prose ||
        !!property && property.name.getText(source) === "transformOrigin" ||
        /^(INSERT |SELECT |PRAGMA |CREATE |UPDATE |DELETE |ALTER |DROP )/i.test(text) ||
        text.includes("://") || text.startsWith("../") || /^#[\da-f]{3,8}$/i.test(text) || /^[\w.-]+\.(xyz|com|org)$/.test(text) ||
        file.endsWith("telemetry-native.ts") && text === "at app (bundle:{0}:{1})" ||
        file.endsWith("app.config.ts") && parents.some(p => ts.isNewExpression(p) && p.expression.getText(source) === "Error") ||
        !!call && /^(require|console\..*|.*\.track|.*\.recordError)$/.test(call.expression.getText(source)) ||
        parents.some(p => ts.isPropertyAssignment(p) && /^(searchTerms|aliases|authors|attribution)$/.test(p.name.getText(source))) ||
        file.endsWith("protocol-search.ts") && !visible ||
        file.endsWith("protocol-evidence.ts") && !!property && property.name.getText(source) === "title" ||
        file.endsWith("packages/protocols/src/index.ts") && !!call && call.expression.getText(source) === "protocol" && call.arguments[8] && parents.includes(call.arguments[8]);
      if ((visible || prose) && /[A-Za-z]/.test(text) && !technical && !properNames.has(text) && !internalErrors.has(text)) {
        const element = parents.find(p => ts.isJsxOpeningElement(p) || ts.isJsxSelfClosingElement(p)) as ts.JsxOpeningElement | ts.JsxSelfClosingElement | undefined;
        const tag = element?.tagName.getText(source) ?? "";
        const nativeAttribute = !!attribute && visibleAttributes.has(attribute.name.getText(source)) &&
          (nativeComponents.has(tag) || nativeNamespaces.has(tag.split(".")[0]));
        const raw = (!!jsx && /^(Text|Native.Text)$/.test(jsx.openingElement.tagName.getText(source)) || nativeAttribute) &&
          !parents.some(p => ts.isCallExpression(p) && /^(t|message|countLabel)$/.test(p.expression.getText(source)));
        candidates.push({ text, line: source.getLineAndCharacterOfPosition(n.getStart()).line + 1, raw });
      }
    }
    ts.forEachChild(n, visit);
  }
  visit(source);
  return candidates;
}
export function auditLocalization() {
  const issues: string[] = catalogIntegrityIssues(), checked = new Set<string>();
  for (const file of [...files("apps/mobile/app"), ...files("apps/mobile/src"), ...files("packages/protocols/src"), "apps/mobile/app.config.ts"]) {
    for (const candidate of copyCandidates(readFileSync(file, "utf8"), file)) {
      checked.add(candidate.text);
      if (candidate.raw) issues.push(`${file}:${candidate.line}: raw native text must use Copy or t(): ${candidate.text}`);
      if (!hasCompleteTranslation(candidate.text)) issues.push(`${file}:${candidate.line}: incomplete translation coverage: ${candidate.text}`);
      for (const language of ["es", "pt"] as const) if (t(candidate.text, language) === candidate.text && !(language === "pt" && candidate.text === "Story · 9:16"))
        issues.push(`${file}:${candidate.line}: ${language}: ${candidate.text}`);
    }
  }
  return { issues, checked: checked.size };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { issues, checked } = auditLocalization();
  console.log(`${checked} distinct app copy strings audited; ${issues.length} localization defects.`);
  if (issues.length) { console.error(issues.join("\n")); process.exitCode = 1; }
}
