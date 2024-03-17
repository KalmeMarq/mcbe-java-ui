/**
 * A very shitty code
 */
import { debounce } from 'https://deno.land/std@0.220.1/async/debounce.ts';
import * as path from 'https://deno.land/std@0.220.1/path/mod.ts';
import jsep from 'npm:jsep@1.3.8';

type MCPE_Version = `MCPE_${number}_${number}` | `MCPE_${number}_${number}_${number}`;

export interface PackConfig {
  ui: {
    patterns: {
      input: string;
      output: string;
      exclude?: string[];
    }[];
  };
  textures?: {
    list?: {
      patterns: string[];
      extra?: string[];
    };
  };
  manifest: {
    name: string;
    description?: string;
    version: `${number}` | `${number}.${number}` | `${number}.${number}.${number}` | [number, number, number];
    uuid: string;
    mdule_uuid: string;
  };
  target: MCPE_Version;
  defines?: [string | [string, string]];
}

type Define = { kind: 'constant'; name: string; value: any } | { kind: 'function'; name: string; params: string[]; body: string };

class DefineContext {
  #parent?: DefineContext;
  #map: Map<string, Define> = new Map();

  constructor(parent?: DefineContext, ...defines: [string, Define][]) {
    this.#parent = parent;
    for (const item of defines) {
      this.#map.set(item[0], item[1]);
    }
  }

  get(name: string): Define {
    if (this.#map.has(name)) {
      return this.#map.get(name)!;
    }
    return this.#parent?.get(name)!;
  }

  has(name: string): boolean {
    let has = this.#map.has(name);
    if (!has && this.#parent) has = this.#parent.has(name);
    return has;
  }

  remove(name: string) {
    this.#map.delete(name);
  }

  add(name: string, define: Define) {
    this.#map.set(name, define);
  }
}

function stripJSONComments(content: string) {
  return content.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => (g ? '' : m));
}

function testForMCPEVersion(str: string) {
  const r = /MCPE_(?<major>\d{1,3})_(?<minor>\d{1,3})(_(?<patch>\d{1,3}))?/gm;
  const ra = r.exec(str);

  if (ra == null) {
    return null;
  }

  const o = {
    major: 0,
    minor: 0,
    patch: 0
  };

  if (ra?.groups && 'major' in ra.groups && ra.groups.major != null) {
    o.major = Number(ra.groups.major);
  }

  if (ra?.groups && 'minor' in ra.groups && ra.groups.minor != null) {
    o.minor = Number(ra.groups.minor);
  }

  if (ra?.groups && 'patch' in ra.groups && ra.groups.patch != null) {
    o.patch = Number(ra.groups.patch);
  }

  return o;
}

function genMCPEVersionDefineValue({ major, minor, patch }: { major: number; minor: number; patch: number }) {
  return Number(`${major}`.padStart(3, '0') + `${minor}`.padStart(3, '0') + `${patch}`.padStart(3, '0'));
}

function evalDirectiveExpr(context: DefineContext, name: string) {
  if (name == 'defined') {
    return (definedName: string) => context.has(definedName);
  }
  if (name == 'CONTEXT') {
    return context;
  }
  return context.has(name) ? (context.get(name) as any).value : 0;
}

function evalJsep(expr: any, context: any): any {
  if (expr.type == 'BinaryExpression') {
    const left = evalJsep(expr.left, context);
    const right = evalJsep(expr.right, context);

    switch (expr.operator) {
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        return left / right;
      case '>':
        return left > right;
      case '<':
        return left < right;
      case '>=':
        return left >= right;
      case '<=':
        return left <= right;
      case '==':
        return left == right;
      case '!=':
        return left != right;
      case '||':
        return left || right;
      case '&&':
        return left && right;
    }
  } else if (expr.type == 'UnaryExpression') {
    return !evalJsep(expr.argument, context);
  } else if (expr.type == 'CallExpression') {
    if (expr.callee.name == 'defined') {
      return context('CONTEXT').has(expr.arguments[0].name);
    }
    return evalJsep(expr.callee, context)(...expr.arguments.map((it: any) => evalJsep(it, context)));
  } else if (expr.type == 'Literal') {
    return expr.value;
  } else if (expr.type == 'Identifier') {
    return context(expr.name);
  }

  throw new Error('Unknown ' + expr.type);
}

function processFile(global_defines: DefineContext, content: string) {
  let output: string[] = [];

  const localDefineContext = new DefineContext(global_defines);
  const ifConds: boolean[] = [];

  const testIf = () => {
    if (ifConds.length === 0) {
      return true;
    }

    let value = true;
    for (const v of ifConds) {
      value = value && v;
    }

    return value;
  };

  let isExcluding = false;

  let i = 0;
  for (const line of content.split('\n')) {
    const trimmedLine = line.trimStart();

    if (trimmedLine.startsWith('//#define') && trimmedLine.split(' ').length >= 2) {
      const defName = trimmedLine.split(' ')[1].trim();

      if (trimmedLine.split(' ').length > 2) {
        localDefineContext.add(defName, {
          kind: 'constant',
          name: defName,
          value: evalJsep(
            jsep(
              line
                .trimStart()
                .split(' ')
                .slice(2)
                .map((it) => it.trim())
                .join(' ')
            ),
            (name: string) => evalDirectiveExpr(localDefineContext, name)
          )
        });
      } else {
        localDefineContext.add(defName, { kind: 'constant', name: defName, value: true });
      }
    } else if (trimmedLine.startsWith('//#undef') && trimmedLine.split(' ').length >= 2) {
      const defName = trimmedLine.split(' ')[1].trim();
      if (localDefineContext.has(defName)) localDefineContext.remove(defName);
    } else if (trimmedLine.startsWith('//#ifdef') && trimmedLine.split(' ').length >= 2) {
      const defName = trimmedLine.split(' ')[1].trim();
      ifConds.push(localDefineContext.has(defName));
    } else if (trimmedLine.startsWith('//#ifndef') && trimmedLine.split(' ').length >= 2) {
      const defName = trimmedLine.split(' ')[1].trim();
      ifConds.push(!localDefineContext.has(defName));
    } else if (trimmedLine.startsWith('//#endif')) {
      ifConds.pop();
    } else if (trimmedLine.startsWith('//#if') && trimmedLine.split(' ').length >= 2) {
      const defName = line
        .trimStart()
        .split(' ')
        .slice(1)
        .map((it) => it.trim())
        .join(' ');
      const v = evalJsep(jsep(defName), (name: string) => evalDirectiveExpr(localDefineContext, name));
      ifConds.push(Boolean(v) == true);
    } else if (trimmedLine.startsWith('//#elseif') && trimmedLine.split(' ').length >= 2) {
      const defName = line
        .trimStart()
        .split(' ')
        .slice(1)
        .map((it) => it.trim())
        .join(' ');
      const v = evalJsep(jsep(defName), (name: string) => evalDirectiveExpr(localDefineContext, name));
      ifConds[ifConds.length - 1] = Boolean(v) == true;
    } else if (trimmedLine.startsWith('//#else')) {
      ifConds[ifConds.length - 1] = !ifConds[ifConds.length - 1];
    } else if (trimmedLine.startsWith('//#exclude')) {
      isExcluding = true;
    } else if (trimmedLine.startsWith('//#endexclude')) {
      isExcluding = false;
    } else if (trimmedLine.startsWith('//#warn') && trimmedLine.split(' ').length >= 2) {
      console.log('%cWARN (ln ' + (i + 1) + '): ' + trimmedLine.split(' ')[1].trim(), 'color: yellow;');
    } else if (trimmedLine.startsWith('//#error') && trimmedLine.split(' ').length >= 2) {
      console.log('%cERROR (ln ' + (i + 1) + '): ' + trimmedLine.split(' ')[1].trim(), 'color: red;');
    } else if (trimmedLine.startsWith('//#info') && trimmedLine.split(' ').length >= 2) {
      console.log('%cINFO (ln ' + (i + 1) + '): ' + trimmedLine.split(' ')[1].trim(), 'color: green;');
    } else {
      if (!isExcluding && testIf()) output.push(line);
    }

    ++i;
  }

  const outputText = output.join('\n');
  return outputText.replace(/,(?=[\n\r ]*(\]|\}))/gm, '').replace(/\n\n\n/gm, '\n\n');
}

function bufferToHex(buffer: ArrayBuffer) {
  return Array.prototype.map.call(new Uint8Array(buffer), (item: number) => ('00' + item.toString(16)).slice(-2)).join('');
}

function* readDirRecursive(filepath: string) {
  function* read(filepath: string): Generator<Deno.DirEntry & { path: string }, void, unknown> {
    for (const file of Deno.readDirSync(filepath)) {
      yield { ...file, path: filepath + '/' + file.name };

      if (file.isDirectory) {
        yield* read(filepath + '/' + file.name);
      }
    }
  }

  yield* read(filepath);
}

function translateToJson(content: string) {
  return content
    .replace(/\r\n/gm, '\n')
    .replace(/(?!({[\n ]*))[a-zA-Z_0-9|$\:.@]+ = /gm, (a, b, c, d) => {
      return '"' + a.substring(0, a.indexOf('=')).trim() + '": ';
    })
    .replace(/(?<=^[ ]*)#.+/gm, (a) => {
      return '//' + a;
    });
}

function translateToJsonUI(content: string) {
  return content
    .replace(/\r\n/gm, '\n')
    .replace(/\/\/#.+/g, (a) => a.substring(2))
    .replace(/".+"\s*:\s* /gm, (a) =>
      a
        .substring(1)
        .trim()
        .replace(/"\s*:\s*/, ' = ')
    );
}

async function main() {
  const isWatch = Deno.args.includes('--watch') || Deno.args.includes('-w');

  if (Deno.args.includes('-c')) {
    const cIdx = Deno.args.indexOf('-c');
    const ctiIdx = cIdx + 1;
    const ctoIdx = cIdx + 2;

    if (ctiIdx >= Deno.args.length) {
      console.error('Missing input file');
      Deno.exit(1);
    }

    if (ctoIdx >= Deno.args.length) {
      console.error('Missing output file');
      Deno.exit(1);
    }

    const inputFile = Deno.args[ctiIdx];
    const outputFile = Deno.args[ctoIdx];

    const content = Deno.readTextFileSync(inputFile);
    Deno.writeTextFileSync(outputFile, inputFile.endsWith('.jsonui') ? translateToJson(content) : translateToJsonUI(content));

    return;
  }

  const globalDefineContext = new DefineContext();

  for (let i = 0; i < Deno.args.length; ++i) {
    if (Deno.args[i] == '-VARS') {
      i++;
      while (i < Deno.args.length) {
        const varn = Deno.args[i++];

        if (varn.includes('=')) {
          globalDefineContext.add(varn.split('=')[0], {
            kind: 'constant',
            name: varn.split('=')[0],
            value: Boolean(isNaN(parseInt(varn.split('=')[1])) ? varn.split('=')[1] : parseInt(varn.split('=')[1]))
          });
        } else {
          globalDefineContext.add(varn, { kind: 'constant', name: varn, value: true });
        }
      }
    }
  }

  const cache: Record<string, string> = {};

  const packConfig = (await import('./pack.config.ts')).default;
  console.log('Config loaded!');

  function parseManifestJson(version: string) {
    const r = /(?<major>\d+)(\.(?<minor>\d+)(\.(?<patch>\d+))?)?/gm.exec(version);
    const ver = [0, 0, 0];

    if (r?.groups) {
      if (r.groups['major']) {
        ver[0] = Number(r.groups['major']);
      }
      if (r.groups['minor']) {
        ver[1] = Number(r.groups['minor']);
      }
      if (r.groups['patch']) {
        ver[2] = Number(r.groups['patch']);
      }
    }

    return ver;
  }

  if (packConfig.textures?.list) {
    const list: string[] = [];
    for (const pattern of packConfig.textures.list.patterns) {
      for (const file of readDirRecursive(pattern)) {
        if (file.isFile && file.name.endsWith('.png')) {
          list.push(file.path);
        }
      }

      if (packConfig.textures.list.extra) {
        packConfig.textures.list.extra.forEach((it) => list.push(it));
      }
    }
    Deno.mkdirSync('textures', { recursive: true });
    Deno.writeTextFileSync('textures/textures_list.json', JSON.stringify(list, null, 2));
  }

  Deno.writeTextFileSync(
    'manifest.json',
    JSON.stringify(
      {
        format_version: 1,
        header: {
          uuid: packConfig.manifest.uuid,
          name: packConfig.manifest.name,
          version: typeof packConfig.manifest.version === 'string' ? parseManifestJson(packConfig.manifest.version) : packConfig.manifest.version,
          description: packConfig.manifest.description ?? ''
        },
        modules: [
          {
            version: typeof packConfig.manifest.version === 'string' ? parseManifestJson(packConfig.manifest.version) : packConfig.manifest.version,
            description: packConfig.manifest.description ?? '',
            uuid: packConfig.manifest.mdule_uuid,
            type: 'resources'
          }
        ]
      },
      null,
      2
    )
  );

  console.log('Proccessing files...');
  for (const pattern of packConfig.ui.patterns) {
    const inputStat = Deno.statSync(pattern['input']);
    if (inputStat.isFile) {
      const content = Deno.readTextFileSync(pattern['input']);
      const timeStart = performance.now();
      const output = processFile(globalDefineContext, pattern['input'].endsWith('.jsonui') ? translateToJson(content) : content);
      const timeEnd = performance.now();
      console.log('[Processed] ' + pattern['input'] + ' ' + (timeEnd - timeStart).toFixed(2) + ' ms');

      Deno.writeTextFileSync(pattern['output'].replace('.jsonui', '.json'), output);
    } else if (inputStat.isDirectory) {
      for (const fileItem of Deno.readDirSync(pattern['input'])) {
        if ('exclude' in pattern && pattern['exclude']?.includes(fileItem.name)) continue;
        const fStat = Deno.statSync(pattern['input'] + '/' + fileItem.name);
        if (!fStat.isFile) continue;
        const p = pattern['input'] + '/' + fileItem.name;
        const content = Deno.readTextFileSync(p);
        const timeStart = performance.now();
        const output = processFile(globalDefineContext, p.endsWith('.jsonui') ? translateToJson(content) : content);
        const timeEnd = performance.now();
        console.log('[Processed] ' + p + ' ' + (timeEnd - timeStart).toFixed(2) + ' ms');

        Deno.mkdirSync(pattern['output'], { recursive: true });
        Deno.writeTextFileSync(pattern['output'] + '/' + fileItem.name.replace('.jsonui', '.json'), output);
      }
    }
  }

  if (isWatch) {
    console.log('Watching...');
    await Array.fromAsync(
      Deno.watchFs('./'),
      debounce((event) => {
        const patha = path.relative('./', event.paths[0]).replaceAll('\\', '/');
        if (event.kind == 'remove') return;
        for (const pattern of packConfig.ui.patterns) {
          if (patha.startsWith(pattern.input)) {
            const s = Deno.statSync(patha);
            if (s.isFile) {
              const pa = patha.substring(pattern.input.length + 1);

              {
                const p = pattern['input'] + '/' + pa;
                const content = Deno.readTextFileSync(p);
                const timeStart = performance.now();
                const output = processFile(globalDefineContext, p.endsWith('.jsonui') ? translateToJson(content) : content);
                const timeEnd = performance.now();
                console.log('[Processed] ' + p + ' ' + (timeEnd - timeStart).toFixed(2) + ' ms');

                Deno.mkdirSync(pattern['output'], { recursive: true });
                Deno.writeTextFileSync(pattern['output'] + '/' + pa.replace('.jsonui', '.json'), output);
              }
            }
          }
        }
      }, 200)
    );
  }
}

if (import.meta.main) {
  Deno.addSignalListener('SIGINT', () => {
    console.log('Bye');
    Deno.exit(0);
  });
  await main();
}
