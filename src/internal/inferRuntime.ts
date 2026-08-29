import type { JsonSchema } from '../types.js';

/**
 * Runtime inference — best-effort, confidence: low (§11).
 * We cannot know types from JS alone. We return placeholders and defaults detection.
 * Build-time TS/JSDoc inference (unplugin) will overwrite this in prod if enabled.
 */

export type InferredParam = {
  name: string;
  hasDefault: boolean;
  defaultValue?: unknown;
  // we don't know type; assume string-ish placeholder unless default hints
};

export type RuntimeInference = {
  params: InferredParam[];
  isAsync: boolean;
  isObjectParam: boolean;
  objectKeys: string[]; // if first param is destructured object
  confidence: 'low';
};

function parseFunctionSource(fn: Function): string {
  try {
    return Function.prototype.toString.call(fn);
  } catch {
    return '';
  }
}

/**
 * Extract param list from fn.toString()
 * Handles:
 * - function foo(a,b=1, {x,y}= {}) {}
 * - (a,b) => {}
 * - async ({query, limit=20}) => {}
 * - class { method(a) {} }
 */
export function parseParamNames(fn: Function): InferredParam[] {
  const src = parseFunctionSource(fn);
  // Remove comments and newlines for easier parsing
  const clean = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').replace(/\n/g, ' ');
  // Find first parentheses or destructured object
  // Match: function name?( ... ) or (...) => or async (... ) => etc.
  // We look for outermost `(` ... `)` before `=>` or `{`
  let paramBlock = '';
  const arrowIdx = clean.indexOf('=>');
  const firstParen = clean.indexOf('(');
  const firstBrace = clean.indexOf('{');

  // Prefer '(' block if exists before body
  if (firstParen !== -1) {
    // Find matching closing paren
    let depth = 0;
    let start = firstParen;
    let end = -1;
    for (let i = start; i < clean.length; i++) {
      const ch = clean[i];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end !== -1) {
      paramBlock = clean.slice(start + 1, end);
    }
  } else if (arrowIdx !== -1) {
    // Single param arrow: x => {}
    const beforeArrow = clean.slice(0, arrowIdx).trim();
    // Could be `x` without parens
    const single = beforeArrow.split(/\s+/).pop() || '';
    if (single && !single.includes(' ')) {
      paramBlock = single.replace(/^async\s+/, '');
    }
  }

  if (!paramBlock.trim()) return [];

  // Split by comma not inside braces/brackets/parens
  const params: InferredParam[] = [];
  let current = '';
  let depthCurly = 0;
  let depthBracket = 0;
  let depthParen = 0;
  for (let i = 0; i < paramBlock.length; i++) {
    const ch = paramBlock[i];
    if (ch === '{') depthCurly++;
    else if (ch === '}') depthCurly--;
    else if (ch === '[') depthBracket++;
    else if (ch === ']') depthBracket--;
    else if (ch === '(') depthParen++;
    else if (ch === ')') depthParen--;
    if (ch === ',' && depthCurly === 0 && depthBracket === 0 && depthParen === 0) {
      const p = current.trim();
      if (p) params.push(parseSingleParam(p));
      current = '';
    } else {
      current += ch;
    }
  }
  const last = current.trim();
  if (last) params.push(parseSingleParam(last));
  return params;
}

function parseSingleParam(raw: string): InferredParam {
  // raw could be: "a", "b=20", "{x, y}", "{query, limit=20}", "...rest", "a /* comment */ = 5"
  let s = raw.trim();
  // Remove rest spread prefix
  if (s.startsWith('...')) s = s.slice(3).trim();
  // Check for default value `=`
  let hasDefault = false;
  let defaultValue: unknown = undefined;
  let eqIdx = -1;
  // Need to find `=` not inside braces
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{' || ch === '(' || ch === '[') depth++;
    else if (ch === '}' || ch === ')' || ch === ']') depth--;
    else if (ch === '=' && depth === 0) {
      eqIdx = i;
      break;
    }
  }
  let namePart = s;
  if (eqIdx !== -1) {
    hasDefault = true;
    namePart = s.slice(0, eqIdx).trim();
    const defStr = s.slice(eqIdx + 1).trim();
    defaultValue = parseDefaultLiteral(defStr);
  }

  // If destructured object: {a, b=c, x: alias} etc.
  let name = namePart;
  // For destructuring, keep the raw interior for objectKeys extraction
  // But the param name for tool args is the object itself — we'll expand later
  // For now, return the raw destructure as name and let caller handle
  if (name.startsWith('{') && name.endsWith('}')) {
    // Keep as is — will be expanded
    name = name;
  } else if (name.startsWith('[')) {
    // array destructure — rare
    name = name;
  }
  return { name, hasDefault, defaultValue };
}

function parseDefaultLiteral(str: string): unknown {
  const t = str.trim().replace(/,$/, '');
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null') return null;
  if (t === 'undefined') return undefined;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")) || (t.startsWith('`') && t.endsWith('`'))) {
    return t.slice(1, -1);
  }
  if (t.startsWith('{') || t.startsWith('[')) return undefined; // complex literal — don't eval
  return undefined;
}

/**
 * Main runtime inference entry — returns low-confidence schema placeholder.
 */
export function inferRuntime(fn: Function): { inference: RuntimeInference; schema: JsonSchema } {
  const params = parseParamNames(fn);
  const src = parseFunctionSource(fn);
  const isAsync = /^\s*async\b/.test(src);

  // Determine if single param is destructured object → treat as object tool input
  let isObjectParam = false;
  let objectKeys: string[] = [];
  if (params.length === 1 && params[0].name.startsWith('{')) {
    isObjectParam = true;
    const inner = params[0].name.slice(1, -1); // strip { }
    // Split inner similarly to extract keys
    // e.g. "query, limit=20, status" → ["query","limit","status"]
    const keys: string[] = [];
    let cur = '';
    let d = 0;
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (ch === '{' || ch === '[' || ch === '(') d++;
      else if (ch === '}' || ch === ']' || ch === ')') d--;
      if (ch === ',' && d === 0) {
        const k = cur.trim(); if (k) keys.push(extractKey(k)); cur = '';
      } else cur += ch;
    }
    const last = cur.trim(); if (last) keys.push(extractKey(last));
    objectKeys = keys.filter(Boolean);
  }

  const inference: RuntimeInference = {
    params,
    isAsync,
    isObjectParam,
    objectKeys,
    confidence: 'low',
  };

  // Build low-confidence schema: object with placeholder properties
  const schema: JsonSchema = {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  };

  if (isObjectParam && objectKeys.length > 0) {
    const props: Record<string, JsonSchema> = {};
    const required: string[] = [];
    // Try to know defaults per key
    // Re-parse inner with defaults mapping
    const innerRaw = params[0].name.slice(1, -1);
    const entries = splitObjectEntries(innerRaw);
    for (const entry of entries) {
      const { key, hasDefault, defaultValue } = entry;
      const prop: JsonSchema = {};
      // Best guess type from default value
      if (typeof defaultValue === 'number') prop.type = 'number';
      else if (typeof defaultValue === 'boolean') prop.type = 'boolean';
      // else leave type undefined (any) — valid placeholder but warn
      if (hasDefault && defaultValue !== undefined) prop.default = defaultValue;
      props[key] = prop;
      if (!hasDefault) required.push(key);
    }
    schema.properties = props;
    schema.required = required;
  } else if (params.length > 0) {
    // For multi-arg or single non-object param, create properties per param name
    // But if param was destructured without isObject detection fallback, still treat similarly
    const props: Record<string, JsonSchema> = {};
    const required: string[] = [];
    for (const p of params) {
      // For object-like still expand? we already handled single object case.
      // Now single 'query' etc.
      let key = p.name;
      // Strip alias `x: y` or `query: string` leftovers already removed; keep before colon/equals
      if (key.includes(':')) key = key.split(':')[0].trim();
      if (key.includes('=')) key = key.split('=')[0].trim();
      // Remove braces/brackets artifacts
      if (key.startsWith('{') || key.startsWith('[')) continue;
      if (!key) continue;
      const prop: JsonSchema = {};
      if (typeof p.defaultValue === 'number') prop.type = 'number';
      else if (typeof p.defaultValue === 'boolean') prop.type = 'boolean';
      if (p.hasDefault && p.defaultValue !== undefined) prop.default = p.defaultValue;
      props[key] = prop;
      if (!p.hasDefault) required.push(key);
    }
    schema.properties = props;
    schema.required = required;
  }

  return { inference, schema };
}

function extractKey(raw: string): string {
  let s = raw.trim();
  // Remove default `=`
  const eq = s.indexOf('=');
  if (eq !== -1) s = s.slice(0, eq).trim();
  // Remove alias `x: y` — keep x
  const colon = s.indexOf(':');
  if (colon !== -1) s = s.slice(0, colon).trim();
  // Remove spread
  if (s.startsWith('...')) s = s.slice(3).trim();
  // Remove braces
  s = s.replace(/^{|}$/g, '').trim();
  return s.split(/\s+/)[0] || '';
}

function splitObjectEntries(inner: string): Array<{ key: string; hasDefault: boolean; defaultValue?: unknown }> {
  const res: Array<{ key: string; hasDefault: boolean; defaultValue?: unknown }> = [];
  let cur = '';
  let d = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '{' || ch === '[' || ch === '(') d++;
    else if (ch === '}' || ch === ']' || ch === ')') d--;
    if (ch === ',' && d === 0) {
      if (cur.trim()) res.push(parseObjectEntry(cur.trim()));
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) res.push(parseObjectEntry(cur.trim()));
  return res;
}

function parseObjectEntry(raw: string): { key: string; hasDefault: boolean; defaultValue?: unknown } {
  let s = raw.trim();
  let hasDefault = false;
  let defaultValue: unknown;
  let eqIdx = s.indexOf('=');
  if (eqIdx !== -1) {
    hasDefault = true;
    const def = s.slice(eqIdx + 1).trim();
    defaultValue = parseDefaultLiteral(def);
    s = s.slice(0, eqIdx).trim();
  }
  // alias `prop: alias` → keep prop
  const colon = s.indexOf(':');
  if (colon !== -1) s = s.slice(0, colon).trim();
  const key = extractKey(s);
  return { key, hasDefault, defaultValue };
}
