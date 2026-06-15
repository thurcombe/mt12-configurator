import * as yaml from 'js-yaml';

// Before parsing: quote flightModes digit-strings so js-yaml doesn't interpret them
// as octal integers (e.g. 010000000 → octal 2097152).
function preProcess(text: string): string {
  return text.replace(/^(\s*flightModes:) (\d+)\s*$/gm, "$1 '$2'");
}

// After dumping: remove the YAML quotes js-yaml adds to digit-only strings so the
// file matches the EdgeTX format EdgeTX writes (unquoted octal-looking string).
function postProcess(text: string): string {
  return text.replace(/^(\s*flightModes:) ["'](\d+)["']\s*$/gm, '$1 $2');
}

export function loadYaml(text: string): unknown {
  return yaml.load(preProcess(text), { schema: yaml.CORE_SCHEMA });
}

export function dumpYaml(obj: unknown): string {
  const raw = yaml.dump(obj, {
    indent: 3,
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
  });
  return postProcess(raw);
}
