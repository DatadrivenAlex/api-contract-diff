export type Finding = { severity: 'breaking' | 'warning'; location: string; message: string };
type JsonObject = Record<string, unknown>;
const methods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
function obj(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}
function entries(value: unknown): [string, unknown][] { return Object.entries(obj(value)); }
function params(path: JsonObject, op: JsonObject): Map<string, JsonObject> {
  const merged = new Map<string, JsonObject>();
  for (const value of [...(Array.isArray(path.parameters) ? path.parameters : []), ...(Array.isArray(op.parameters) ? op.parameters : [])]) {
    const p = obj(value);
    if (typeof p.name === 'string' && typeof p.in === 'string') merged.set(`${p.in}:${p.name}`, p);
  }
  return merged;
}
function hasRef(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasRef);
  return Object.entries(obj(value)).some(([k,v]) => k === '$ref' || hasRef(v));
}
export function compare(oldSpec: unknown, newSpec: unknown): Finding[] {
  const oldRoot = obj(oldSpec), newRoot = obj(newSpec);
  if (!Object.keys(obj(oldRoot.paths)).length || !Object.keys(obj(newRoot.paths)).length) throw new Error('Both documents must contain a non-empty paths object');
  const findings: Finding[] = [];
  if (hasRef(oldSpec) || hasRef(newSpec)) findings.push({severity:'warning', location:'document', message:'$ref is not resolved; inline referenced parameters to inspect them'});
  const oldPaths = obj(oldRoot.paths), newPaths = obj(newRoot.paths);
  for (const [path, rawPath] of entries(oldPaths)) {
    const oldPath = obj(rawPath), newPath = obj(newPaths[path]);
    for (const [method, rawOperation] of entries(oldPath)) {
      if (!methods.has(method)) continue;
      const loc = `${method.toUpperCase()} ${path}`;
      if (!(method in newPath)) {
        findings.push({severity:'breaking', location:loc, message:'Operation removed'});
        continue;
      }
      const oldOp = obj(rawOperation), newOp = obj(newPath[method]);
      const oldParams = params(oldPath, oldOp), newParams = params(newPath, newOp);
      for (const [key, p] of newParams) {
        const oldP = oldParams.get(key);
        if (p.required === true && oldP?.required !== true) findings.push({severity:'breaking', location:loc, message:`Required parameter added: ${key}`});
      }
      for (const [code] of entries(oldOp.responses)) {
        if (!(code in obj(newOp.responses))) findings.push({severity:'breaking', location:loc, message:`Response removed: ${code}`});
      }
      const oldBody = obj(oldOp.requestBody), newBody = obj(newOp.requestBody);
      if (newBody.required === true && oldBody.required !== true) findings.push({severity:'breaking', location:loc, message:'Request body became required'});
    }
  }
  return findings.sort((a,b) => a.location.localeCompare(b.location) || a.message.localeCompare(b.message));
}
