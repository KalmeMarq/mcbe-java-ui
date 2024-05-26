import { copySync, existsSync, walkSync, ensureDirSync } from 'https://deno.land/std@0.224.0/fs/mod.ts';
import { debounce } from 'https://deno.land/std@0.224.0/async/mod.ts';
import { resolve, relative, dirname } from 'https://deno.land/std@0.224.0/path/mod.ts';
import jsep from 'npm:jsep@1.3.8';
import { JSONC } from 'https://deno.land/x/jsonc_parser@v0.0.1/mod.ts';

class Profiler {
  private _locationInfos: Map<string, { totalTime: number }> = new Map();
  private _fullPath: string = '';
  private _path: string[] = [];
  private _timeInfos: number[] = [];
  private _currentInfo?: { totalTime: number };

  public start() {
    this._fullPath = '';
    this._path = [];
    this.push('root');
  }

  public end() {
    this.pop();
  }

  public printResults() {
    const results = Array.from(this._locationInfos.entries()); //.sort((a, b) => (a[0] == 'root' ? 1 : a[0].length - b[0].length));

    for (const [name, { totalTime }] of results) {
      console.log('%c[' + (name === 'root' ? '*' : name.replace('root/', '')) + ']%c took %c' + totalTime.toFixed(2) + 'ms%c', 'color: blue;', 'color: reset;', 'color: yellow;', 'color: reset;');
    }

    this._locationInfos.clear();
  }

  public push(location: string) {
    if (this._fullPath.length > 0) {
      this._fullPath += '/';
    }

    this._fullPath += location;
    this._path.push(this._fullPath);
    this._timeInfos.push(performance.now());
    this._currentInfo = undefined;
  }

  public pop() {
    const now = performance.now();
    const last = this._timeInfos.pop()!;
    this._path.pop();
    const taken = now - last;
    const info = this.getCurrentInfo();
    info.totalTime += taken;

    this._fullPath = this._path.length === 0 ? '' : this._path[this._path.length - 1];

    this._currentInfo = undefined;
  }

  private getCurrentInfo() {
    if (this._currentInfo == null) {
      if (!this._locationInfos.has(this._fullPath)) {
        const info = {
          totalTime: 0
        };
        this._locationInfos.set(this._fullPath, info);
        this._currentInfo = info;
      } else {
        this._currentInfo = this._locationInfos.get(this._fullPath)!;
      }
    }

    return this._currentInfo;
  }
}

const profiler = new Profiler();

export type MCPEVersion = `MCPE_${number}` | `MCPE_${number}_${number}` | `MCPE_${number}_${number}_${number}`;
export type MCPEVersionWithComparision<T extends string> = `${T}${MCPEVersion}`;

export interface ConfigProfile {
  version: MCPEVersionWithComparision<'>'> | MCPEVersionWithComparision<'<'> | MCPEVersionWithComparision<'<='> | MCPEVersionWithComparision<'>='> | MCPEVersion;
  minecraftAppData?: string;
  resourcePackPath?: string;
}

export interface PackConfig {
  targetVersion: string; //`MCPE_${number}` | `MCPE_${number}_${number}` | `MCPE_${number}_${number}_${number}`;
  profiles?: ConfigProfile[];
}

type DefineType = 'constant' | 'function';
type Define = {
  name: string;
  value: string | number;
  cachedRegex?: RegExp;
} & (
  | {
      type: 'constant';
    }
  | {
      type: 'function';
      args: string[];
    }
);

function createDefine(name: string, value: string | number): Define {
  return { name, type: 'constant', value };
}

function createDefineFunc(name: string, args: string[], value: string | number): Define {
  return { name, args, type: 'function', value };
}

type DynamicDefineCreator = (name: string) => [true, Define] | [false, undefined];

class DefineContext {
  private _parent?: DefineContext;
  private _map: Map<string, Define>;
  private _dynamicCreator?: DynamicDefineCreator;

  constructor(parent?: DefineContext, dynamicCreator?: DynamicDefineCreator) {
    this._parent = parent;
    this._map = new Map();
    this._dynamicCreator = dynamicCreator;
  }

  add(define: Define) {
    this._map.set(define.name, define);
  }

  remove(defineName: string) {
    this._map.delete(defineName);
  }

  get(defineName: string): Define | undefined {
    if (this._dynamicCreator != null) {
      const [success, value] = this._dynamicCreator(defineName);
      if (success) {
        return value;
      }
    }

    return this._map.get(defineName) ?? (this._parent != null ? this._parent.get(defineName) : undefined);
  }

  has(defineName: string, type?: DefineType): boolean {
    const define = this._map.get(defineName) ?? (this._parent != null ? this._parent.get(defineName) : undefined);

    if (define == null) return false;

    if (type != null) {
      return define.type === type;
    }

    return true;
  }

  getDefines() {
    return this._map.values();
  }

  [Symbol.iterator](): Iterator<Define> {
    const that = this;
    function* iter() {
      for (const define of that._map.values()) {
        yield define;
      }

      if (that._parent != null) {
        for (const define of that._parent._map.values()) {
          yield define;
        }
      }
    }
    return iter();
  }
}

function translateToJson(content: string) {
  return content
    .replace(/\r\n/gm, '\n')
    .replace(/(?!({[\n ]*))[a-zA-Z_+0-9|$\:.@]+ = /gm, (a, b, c, d) => {
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

class Preprocessor {
  private _parentContext?: DefineContext;
  private _context: DefineContext;
  private _excluding = false;
  private _ifs: boolean[] = [];

  constructor(parentContext?: DefineContext) {
    this._parentContext = parentContext;
    this._context = new DefineContext(parentContext);
  }

  private reset() {
    this._context = new DefineContext(this._parentContext);
    this._excluding = false;
  }

  private canProcess(): boolean {
    return !this._excluding && this._ifs.every((it) => it);
  }

  public getContext() {
    return this._context;
  }

  private processLine(line: string): string {
    line = line.replace(/MCPE_(?<major>\d{1,3})_(?<minor>\d{1,3})(_(?<patch>\d{1,3}))?/gm, (a) => {
      return this._context.get(a)!.value + '';
    });

    for (const define of this._context) {
      if (define.type == 'function') {
        const rg = define.cachedRegex == null ? new RegExp('\\b' + define.name + '\\([a-z-+.A-Z0-9]+\\s*(\\s*,\\s*[a-zA-Z.0-9]+){0,}\\)') : define.cachedRegex;
        if (!define.cachedRegex) {
          define.cachedRegex = rg;
        }

        line = line.replace(rg, (a) => {
          const args = a
            .substring(a.indexOf('(') + 1, a.indexOf(')'))
            .split(',')
            .map((it) => it.trim());

          let m = define.value + '';
          for (let i = 0; i < define.args.length; ++i) {
            m = m.replace(new RegExp('##' + define.args[i] + '(\\|[/+*-]+\\s*[0-9]+)?##', 'g'), ((aa: string, bb: string) => {
              if (bb != null) {
                const v = Number(args[i]);
                const n = Number(bb.substring(2));
                const o = bb[1];
                return o == '/' ? v / n : o == '-' ? v - n : o == '*' ? v * n : v + n;
              }
              return args[i];
            }) as any);
          }
          return m;
        });
      } else {
        const rg = define.cachedRegex == null ? new RegExp('\\b' + define.name) : define.cachedRegex;
        if (!define.cachedRegex) {
          define.cachedRegex = rg;
        }
        line = line.replace(rg, define.value + '');
      }
    }
    return line;
  }

  public process(content: string): [true, string] | [false, undefined] {
    profiler.push('process_content');
    this.reset();

    const lines = content.replaceAll('\r\n', '\n').split('\n');
    let result: string[] = [];

    for (let i = 0; i < lines.length; ++i) {
      const trimmedLine = lines[i].trimStart();

      if (trimmedLine.startsWith('#ignore ')) {
        const expression = trimmedLine
          .trimStart()
          .split(' ')
          .slice(1)
          .map((it) => it.trim())
          .join(' ');
        const value = Boolean(
          evalJsep(jsep(expression), (name: string) => {
            return this._context.get(name)?.value;
          })
        );

        if (value) {
          return [false, undefined];
        }
      } else if (this.canProcess() && trimmedLine.startsWith('#warn') && trimmedLine.split(' ').length >= 2) {
        console.log('%cWARN (ln ' + (i + 1) + '): ' + this.processLine(trimmedLine.split(' ')[1].trim()), 'color: yellow;');
      } else if (this.canProcess() && trimmedLine.startsWith('#error') && trimmedLine.split(' ').length >= 2) {
        console.log('%cERROR (ln ' + (i + 1) + '): ' + this.processLine(trimmedLine.split(' ')[1].trim()), 'color: red;');
      } else if (this.canProcess() && trimmedLine.startsWith('#info') && trimmedLine.split(' ').length >= 2) {
        console.log('%cINFO (ln ' + (i + 1) + '): ' + this.processLine(trimmedLine.split(' ')[1].trim()), 'color: green;');
      } else if (this.canProcess() && trimmedLine.startsWith('#define ')) {
        const defineName = trimmedLine.substring(8).split(' ')[0];
        const defineValue = trimmedLine.substring(8).split(' ').slice(1).join(' ');
        this._context.add(createDefine(defineName, this.processLine(defineValue)));
      } else if (this.canProcess() && trimmedLine.startsWith('#definefunc')) {
        const defineName = trimmedLine.substring(12).substring(0, trimmedLine.indexOf(')', 12) - 11);
        const args = defineName
          .substring(defineName.indexOf('(') + 1, defineName.indexOf(')'))
          .split(',')
          .map((it) => it.trim());
        this._context.add(createDefineFunc(defineName.substring(0, defineName.indexOf('(')), args, trimmedLine.substring(trimmedLine.indexOf(')') + 1).trim()));
      } else if (this.canProcess() && trimmedLine.startsWith('#undef')) {
        const defineName = trimmedLine.substring(7);
        if (this._context.has(defineName)) {
          this._context.remove(defineName);
        }
      } else if (trimmedLine.startsWith('#exclude')) {
        this._excluding = true;
      } else if (trimmedLine.startsWith('#endexclude')) {
      } else if (this.canProcess() && trimmedLine.startsWith('#include ')) {
        const includeFile = trimmedLine.split(' ').slice(1).join(' ').slice(1, -1);
        const tempPreprocessor = new Preprocessor(this._parentContext);
        tempPreprocessor.process(Deno.readTextFileSync(resolve('pack/include', includeFile)));
        for (const define of tempPreprocessor.getContext().getDefines()) {
          this._context.add(define);
        }
      } else if (trimmedLine.startsWith('#if')) {
        const expression = trimmedLine
          .trimStart()
          .split(' ')
          .slice(1)
          .map((it) => it.trim())
          .join(' ');
        const value = evalJsep(jsep(expression), (name: string) => {
          return this._context.get(name)?.value;
        });

        this._ifs.push(Boolean(value) == true);
      } else if (trimmedLine.startsWith('#ifdef')) {
        const defineName = trimmedLine.substring(8);
        this._ifs.push(this._context.has(defineName));
      } else if (trimmedLine.startsWith('#ifndef')) {
        const defineName = trimmedLine.substring(8);
        this._ifs.push(!this._context.has(defineName));
      } else if (trimmedLine.startsWith('#elif')) {
        const expression = trimmedLine
          .trimStart()
          .split(' ')
          .slice(1)
          .map((it) => it.trim())
          .join(' ');
        const value = evalJsep(jsep(expression), (name: string) => {
          return this._context.get(name)?.value;
        });
        this._ifs[this._ifs.length - 1] = Boolean(value) == true;
      } else if (trimmedLine.startsWith('#else')) {
        this._ifs[this._ifs.length - 1] = !this._ifs[this._ifs.length - 1];
      } else if (trimmedLine.startsWith('#endif')) {
        this._ifs.pop();
      } else if (trimmedLine.startsWith('#for')) {
        throw new Error('#for Not implemented yet');
      } else if (trimmedLine.startsWith('#endfor')) {
        throw new Error('#endfor Not implemented yet');
      } else if (this.canProcess()) {
        result.push(this.processLine(lines[i]));
      }
    }

    profiler.pop();
    return [true, result.join('\n')];
  }
}

function getMCPEVersionNumerically(mcpeVersion: string) {
  return genMCPEVersionDefineValue(testForMCPEVersion(mcpeVersion)!);
}

function testForMCPEVersion(mcpeVersion: string) {
  const regex = /MCPE_(?<major>\d{1,3})_(?<minor>\d{1,3})(_(?<patch>\d{1,3}))?/gm;
  const result = regex.exec(mcpeVersion);

  if (result == null) {
    return null;
  }

  const version = {
    major: 0,
    minor: 0,
    patch: 0
  };

  if (result?.groups) {
    if ('major' in result.groups && typeof result.groups.major === 'string') version.major = Number(result.groups.major);
    if ('minor' in result.groups && typeof result.groups.minor === 'string') version.minor = Number(result.groups.minor);
    if ('patch' in result.groups && typeof result.groups.patch === 'string') version.patch = Number(result.groups.patch);
  }

  return version;
}

function genMCPEVersionDefineValue({ major, minor, patch }: { major: number; minor: number; patch: number }) {
  return Number(`${major}`.padStart(3, '0') + `${minor}`.padStart(3, '0') + `${patch}`.padStart(3, '0'));
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
      case '\\':
        return Math.floor(left / right);
      case '%':
        return left % right;
      case '**':
        return left % right;
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
    if (expr.operator == '+') {
      return +evalJsep(expr.argument, context);
    }
    if (expr.operator == '-') {
      return -evalJsep(expr.argument, context);
    }
    if (expr.operator == '!') {
      return !evalJsep(expr.argument, context);
    }
  } else if (expr.type == 'Literal') {
    return expr.value;
  } else if (expr.type == 'Identifier') {
    return context(expr.name);
  }

  throw new Error('Unknown ' + expr.type);
}

// TODO: Add a watch mode
async function main() {
  const config = (await import('./pack.config.ts')).default;

  const profile = config.profiles?.find((it) => {
    if (it.version.startsWith('MCPE')) {
      return it.version == config.targetVersion;
    } else {
      const version = getMCPEVersionNumerically(it.version.substring(it.version.indexOf('MCPE')));
      const targetVersion = getMCPEVersionNumerically(config.targetVersion);
      const op = it.version.substring(0, it.version.indexOf('MCPE'));

      if (op == '>') return targetVersion > version;
      if (op == '<') return targetVersion < version;
      if (op == '>=') return targetVersion >= version;
      if (op == '<=') return targetVersion <= version;

      return false;
    }
  });

  const rootContext = new DefineContext(undefined, (name: string) => {
    if (testForMCPEVersion(name) != null) {
      const mcpe = testForMCPEVersion(name)!;
      return [true, createDefine(name, genMCPEVersionDefineValue(mcpe))];
    }
    return [false, undefined];
  });
  rootContext.add(createDefine('MCPE_CURRENT', getMCPEVersionNumerically(config.targetVersion)));

  const preprocessor = new Preprocessor(rootContext);

  if (getMCPEVersionNumerically(config.targetVersion) < getMCPEVersionNumerically('MCPE_0_16')) {
    profiler.start();
    const minecraftAppData = profile?.minecraftAppData!;

    if (existsSync('out')) {
      Deno.removeSync('out');
    }
    Deno.symlinkSync(minecraftAppData, 'out');

    const langPath = getMCPEVersionNumerically(config.targetVersion) > getMCPEVersionNumerically('MCPE_0_13') ? 'loc' : 'lang';

    rootContext.add(createDefine('DEFAULT_TEXTURES_PATH', ''));
    rootContext.add(createDefine('CUSTOM_TEXTURES_PATH', 'out'));
    rootContext.add(createDefine('CUSTOM_UI_PATH', 'ui/out'));

    if (!existsSync(minecraftAppData + '/ui_backup')) {
      console.log('Backuping ui folder');
      copySync(resolve(minecraftAppData, 'ui'), resolve(minecraftAppData, 'ui_backup'));
    } else {
      copySync(resolve(minecraftAppData, 'ui_backup'), resolve(minecraftAppData, 'ui'), { overwrite: true });
      if (existsSync(minecraftAppData + '/ui/out')) {
        Deno.removeSync(minecraftAppData + '/ui/out', { recursive: true });
      }
    }

    {
      const uiDefs = JSONC.parse(Deno.readTextFileSync(resolve(minecraftAppData, 'ui_backup', '_ui_defs.json')));
      let defaultEntries = '';
      uiDefs.ui_defs.forEach((it: string) => (defaultEntries += `    "${it}",\n`));
      rootContext.add(createDefine('DEFAULT_ENTRIES', defaultEntries));
    }

    if (!existsSync(resolve(minecraftAppData, langPath + '_backup'))) {
      console.log('Backuping lang folder');
      copySync(resolve(minecraftAppData, langPath), resolve(minecraftAppData, langPath + '_backup'));
    }

    if (!existsSync(resolve(minecraftAppData, 'images/out'))) {
      Deno.mkdirSync(resolve(minecraftAppData, 'images/out'));
    } else {
      Deno.removeSync(resolve(minecraftAppData, 'images/out'), { recursive: true });
      Deno.mkdirSync(resolve(minecraftAppData, 'images/out'));
    }

    profiler.push('process_lang');
    for (const entry of walkSync('pack/langs/', { includeDirs: false })) {
      const isJSONUI = entry.path.endsWith('.jsonui');

      const filename = relative('pack/langs', entry.path).replace('.jsonui', '.json');
      let [success, resultContent] = preprocessor.process(Deno.readTextFileSync(entry.path));

      if (!success) continue;

      if (isJSONUI) resultContent = translateToJson(resultContent!);

      const code = filename.substring(filename.lastIndexOf('/') + 1, filename.lastIndexOf('.'));
      let vani = Deno.readTextFileSync(resolve(minecraftAppData, langPath + '_backup/' + code + '-pocket.lang'));
      vani += '\n\n## Custom';

      for (const [key, value] of Object.entries(JSONC.parse(resultContent!))) {
        vani += '\n' + key + '=' + value;
      }

      Deno.writeTextFileSync(resolve(minecraftAppData, langPath + '/' + code + '-pocket.lang'), vani);
    }
    profiler.pop();

    profiler.push('process_image');
    for (const entry of walkSync('pack/textures/custom', { includeDirs: false })) {
      if (!entry.path.endsWith('.png')) continue;
      const filename = relative('pack/textures/custom', entry.path);
      ensureDirSync(resolve(minecraftAppData, 'images/out', dirname(filename)));
      Deno.copyFileSync(entry.path, resolve(minecraftAppData, 'images/out', filename));
    }
    profiler.pop();

    profiler.push('process_ui_default');
    for (const entry of walkSync('pack/ui/default/', { includeDirs: false })) {
      const isJSONUI = entry.path.endsWith('.jsonui');
      const filename = relative('pack/ui/default', entry.path).replace('.jsonui', '.json');
      let [success, content] = preprocessor.process(Deno.readTextFileSync(entry.path));
      if (!success) continue;
      if (isJSONUI) content = translateToJson(content!);

      Deno.writeTextFileSync(resolve(minecraftAppData, 'ui', filename), content!);
    }
    profiler.pop();

    profiler.push('process_ui_custom');
    if (existsSync(resolve(minecraftAppData, 'ui', 'out'))) {
      Deno.removeSync(resolve(minecraftAppData, 'ui', 'out'), { recursive: true });
    }

    for (const entry of walkSync('pack/ui/custom/', { includeDirs: false })) {
      const isJSONUI = entry.path.endsWith('.jsonui');
      const filename = relative('pack/ui/custom', entry.path).replace('.jsonui', '.json');
      let [success, content] = preprocessor.process(Deno.readTextFileSync(entry.path));
      if (!success) continue;
      if (isJSONUI) content = translateToJson(content!);

      ensureDirSync(resolve(minecraftAppData, 'ui', 'out', dirname(filename)));
      Deno.writeTextFileSync(resolve(minecraftAppData, 'ui', 'out', filename), content!);
    }
    profiler.pop();

    profiler.push('process_root');
    for (const entry of walkSync('pack', { maxDepth: 1, includeDirs: false })) {
      const isJSONUI = entry.path.endsWith('.jsonui');
      let [success, resultContent] = preprocessor.process(Deno.readTextFileSync(entry.path));
      if (!success) continue;
      if (isJSONUI) resultContent = translateToJson(resultContent!);
      const filename = relative('pack', entry.path).replace('.jsonui', '.json');

      if (existsSync(resolve(minecraftAppData, filename)) && !existsSync(resolve(minecraftAppData, filename + '-backup'))) {
        Deno.copyFileSync(resolve(minecraftAppData, filename), resolve(minecraftAppData, filename + '-backup'));
      }

      Deno.writeTextFileSync(resolve(minecraftAppData, filename), resultContent!);
    }
    profiler.pop();

    profiler.end();
    profiler.printResults();

    if (Deno.args.includes('-w')) {
      const watcher = Deno.watchFs('pack');

      Deno.addSignalListener('SIGINT', () => {
        watcher.close();
      });

      const handleEvent = debounce((event: Deno.FsEvent) => {
        profiler.start();

        const entryPath = relative('pack', event.paths[0]);
        const entryDirname = dirname(entryPath).replaceAll('\\', '/');

        if (entryDirname == '.') {
          profiler.push('root_changed');
          for (const entry of walkSync('pack', { maxDepth: 1, includeDirs: false })) {
            const isJSONUI = entry.path.endsWith('.jsonui');
            let [success, resultContent] = preprocessor.process(Deno.readTextFileSync(entry.path));
            if (!success) continue;
            if (isJSONUI) resultContent = translateToJson(resultContent!);
            const filename = relative('pack', entry.path).replace('.jsonui', '.json');

            if (existsSync(resolve(minecraftAppData, filename)) && !existsSync(resolve(minecraftAppData, filename + '-backup'))) {
              Deno.copyFileSync(resolve(minecraftAppData, filename), resolve(minecraftAppData, filename + '-backup'));
            }

            Deno.writeTextFileSync(resolve(minecraftAppData, filename), resultContent!);
          }
          profiler.pop();
        } else if (entryDirname.startsWith('langs')) {
          profiler.push('langs_changed');

          for (const entry of walkSync('pack/langs/', { includeDirs: false })) {
            const isJSONUI = entry.path.endsWith('.jsonui');

            const filename = relative('pack/langs', entry.path).replace('.jsonui', '.json');
            let [success, resultContent] = preprocessor.process(Deno.readTextFileSync(entry.path));

            if (!success) continue;

            if (isJSONUI) resultContent = translateToJson(resultContent!);

            const code = filename.substring(filename.lastIndexOf('/') + 1, filename.lastIndexOf('.'));
            let vani = Deno.readTextFileSync(resolve(minecraftAppData, langPath + '_backup/' + code + '-pocket.lang'));
            vani += '\n\n## Custom';

            for (const [key, value] of Object.entries(JSONC.parse(resultContent!))) {
              vani += '\n' + key + '=' + value;
            }

            Deno.writeTextFileSync(resolve(minecraftAppData, langPath + '/' + code + '-pocket.lang'), vani);
          }

          profiler.pop();
        } else if (entryDirname.startsWith('textures/custom')) {
          profiler.push('textures_custom_changed');

          if (!existsSync(resolve(minecraftAppData, 'images/out'))) {
            Deno.mkdirSync(resolve(minecraftAppData, 'images/out'));
          } else {
            Deno.removeSync(resolve(minecraftAppData, 'images/out'), { recursive: true });
            Deno.mkdirSync(resolve(minecraftAppData, 'images/out'));
          }

          for (const entry of walkSync('pack/textures/custom', { includeDirs: false })) {
            if (!entry.path.endsWith('.png')) continue;
            const filename = relative('pack/textures/custom', entry.path);
            ensureDirSync(resolve(minecraftAppData, 'images/out', dirname(filename)));
            Deno.copyFileSync(entry.path, resolve(minecraftAppData, 'images/out', filename));
          }

          profiler.pop();
        } else if (entryDirname.startsWith('ui/custom')) {
          profiler.push('ui_custom_changed');
          if (existsSync(minecraftAppData + '/ui/out')) {
            Deno.removeSync(minecraftAppData + '/ui/out', { recursive: true });
          }

          for (const entry of walkSync('pack/ui/custom/', { includeDirs: false })) {
            const isJSONUI = entry.path.endsWith('.jsonui');
            const filename = relative('pack/ui/custom', entry.path).replace('.jsonui', '.json');
            let [success, content] = preprocessor.process(Deno.readTextFileSync(entry.path));
            if (!success) continue;
            if (isJSONUI) content = translateToJson(content!);

            ensureDirSync(resolve(minecraftAppData, 'ui', 'out', dirname(filename)));
            Deno.writeTextFileSync(resolve(minecraftAppData, 'ui', 'out', filename), content!);
          }
          profiler.pop();
        } else if (entryDirname.startsWith('ui/default')) {
          profiler.push('ui_default_changed');
          copySync(resolve(minecraftAppData, 'ui_backup'), resolve(minecraftAppData, 'ui'), { overwrite: true });
          for (const entry of walkSync('pack/ui/default/', { includeDirs: false })) {
            const isJSONUI = entry.path.endsWith('.jsonui');
            const filename = relative('pack/ui/default', entry.path).replace('.jsonui', '.json');
            let [success, content] = preprocessor.process(Deno.readTextFileSync(entry.path));
            if (!success) continue;
            if (isJSONUI) content = translateToJson(content!);

            Deno.writeTextFileSync(resolve(minecraftAppData, 'ui', filename), content!);
          }
          profiler.pop();
        }

        profiler.end();
        console.clear();
        profiler.printResults();
      }, 200);

      for await (const event of watcher) {
        handleEvent(event);
      }
    }
  } else {
    profiler.start();
    const resourcePackPath = profile?.resourcePackPath!;

    profiler.push('Setting default defines');
    rootContext.add(createDefine('DEFAULT_TEXTURES_PATH', 'textures'));
    rootContext.add(createDefine('CUSTOM_TEXTURES_PATH', 'assets'));
    rootContext.add(createDefine('CUSTOM_UI_PATH', 'ui/out'));
    rootContext.add(createDefine('DEFAULT_ENTRIES', ''));
    profiler.pop();

    profiler.push('Ensuring rp folder');
    if (existsSync(resourcePackPath)) {
      Deno.removeSync(resourcePackPath, { recursive: true });
    }
    Deno.mkdirSync(resourcePackPath);

    if (existsSync('out')) {
      Deno.removeSync('out');
    }
    Deno.symlinkSync(resourcePackPath, 'out');
    profiler.pop();

    profiler.push('Ensuring required rp subfolder');
    ensureDirSync(resolve(resourcePackPath, 'assets'));
    ensureDirSync(resolve(resourcePackPath, 'texts'));
    ensureDirSync(resolve(resourcePackPath, 'textures'));
    ensureDirSync(resolve(resourcePackPath, 'ui'));
    profiler.pop();

    profiler.push('process_lang');
    for (const entry of walkSync('pack/langs/', { includeDirs: false })) {
      const isJSONUI = entry.path.endsWith('.jsonui');

      const filename = relative('pack/langs', entry.path).replace('.jsonui', '.json');
      let [success, resultContent] = preprocessor.process(Deno.readTextFileSync(entry.path));
      if (!success) continue;
      if (isJSONUI) resultContent = translateToJson(resultContent!);
      const code = filename.substring(filename.lastIndexOf('/') + 1, filename.lastIndexOf('.'));

      let vani = '## Custom';

      for (const [key, value] of Object.entries(JSONC.parse(resultContent!))) {
        vani += '\n' + key + '=' + value;
      }

      Deno.writeTextFileSync(resolve(resourcePackPath, 'texts', `${code}.lang`), vani);
    }
    profiler.pop();

    profiler.push('process_image');
    for (const entry of walkSync('pack/textures/custom', { includeDirs: false })) {
      if (!entry.path.endsWith('.png')) continue;
      const filename = relative('pack/textures/custom', entry.path);
      ensureDirSync(resolve(resourcePackPath, 'assets', dirname(filename)));
      Deno.copyFileSync(entry.path, resolve(resourcePackPath, 'assets', filename));
    }
    profiler.pop();

    profiler.push('process_ui_default');
    for (const entry of walkSync('pack/ui/default/', { includeDirs: false })) {
      const isJSONUI = entry.path.endsWith('.jsonui');
      const filename = relative('pack/ui/default', entry.path).replace('.jsonui', '.json');
      let [success, content] = preprocessor.process(Deno.readTextFileSync(entry.path));
      if (!success) continue;

      profiler.push('jsonui_to_json');
      if (isJSONUI) content = translateToJson(content!);
      profiler.pop();

      profiler.push('writing');
      Deno.writeTextFileSync(resolve(resourcePackPath, 'ui', filename), content!);
      profiler.pop();
    }
    profiler.pop();

    profiler.push('process_ui_custom');

    profiler.push('cleaning_up');
    if (existsSync(resolve(resourcePackPath, 'ui', 'out'))) {
      Deno.removeSync(resolve(resourcePackPath, 'ui', 'out'), { recursive: true });
    }
    profiler.pop();

    for (const entry of walkSync('pack/ui/custom/', { includeDirs: false })) {
      const isJSONUI = entry.path.endsWith('.jsonui');
      const filename = relative('pack/ui/custom', entry.path).replace('.jsonui', '.json');
      let [success, content] = preprocessor.process(Deno.readTextFileSync(entry.path));
      if (!success) continue;
      profiler.push('jsonui_to_json');
      if (isJSONUI) content = translateToJson(content!);
      profiler.pop();

      profiler.push('ensuring_parent_dir');
      ensureDirSync(resolve(resourcePackPath, 'ui', 'out', dirname(filename)));
      profiler.pop();

      profiler.push('writing');
      Deno.writeTextFileSync(resolve(resourcePackPath, 'ui', 'out', filename), content!);
      profiler.pop();
    }
    profiler.pop();

    profiler.push('process_root');
    for (const entry of walkSync('pack', { maxDepth: 1, includeDirs: false })) {
      const isJSONUI = entry.path.endsWith('.jsonui');
      let [success, resultContent] = preprocessor.process(Deno.readTextFileSync(entry.path));
      if (!success) continue;

      profiler.push('jsonui_to_json');
      if (isJSONUI) resultContent = translateToJson(resultContent!);
      profiler.pop();

      const filename = relative('pack', entry.path).replace('.jsonui', '.json');

      profiler.push('writing');
      Deno.writeTextFileSync(resolve(resourcePackPath, filename), resultContent!);
      profiler.pop();
    }
    profiler.pop();

    profiler.end();
    profiler.printResults();

    if (Deno.args.includes('-w')) {
      const watcher = Deno.watchFs('pack');

      Deno.addSignalListener('SIGINT', () => {
        watcher.close();
      });

      const handleEvent = debounce((event: Deno.FsEvent) => {
        profiler.start();
        const entryPath = relative('pack', event.paths[0]);
        const entryDirname = dirname(entryPath).replaceAll('\\', '/');

        if (entryDirname == '.') {
          profiler.push('root_changed');
          for (const entry of walkSync('pack', { maxDepth: 1, includeDirs: false })) {
            const isJSONUI = entry.path.endsWith('.jsonui');
            let [success, resultContent] = preprocessor.process(Deno.readTextFileSync(entry.path));
            if (!success) continue;
            if (isJSONUI) resultContent = translateToJson(resultContent!);
            const filename = relative('pack', entry.path).replace('.jsonui', '.json');

            Deno.writeTextFileSync(resolve(resourcePackPath, filename), resultContent!);
          }
          profiler.pop();
        } else if (entryDirname.startsWith('langs')) {
          profiler.push('langs_changed');
          for (const entry of walkSync('pack/langs/', { includeDirs: false })) {
            const isJSONUI = entry.path.endsWith('.jsonui');

            const filename = relative('pack/langs', entry.path).replace('.jsonui', '.json');
            let [success, resultContent] = preprocessor.process(Deno.readTextFileSync(entry.path));
            if (!success) continue;
            if (isJSONUI) resultContent = translateToJson(resultContent!);
            const code = filename.substring(filename.lastIndexOf('/') + 1, filename.lastIndexOf('.'));

            let vani = '## Custom';

            for (const [key, value] of Object.entries(JSONC.parse(resultContent!))) {
              vani += '\n' + key + '=' + value;
            }

            Deno.writeTextFileSync(resolve(resourcePackPath, 'texts', `${code}.lang`), vani);
          }
          profiler.pop();
        } else if (entryDirname.startsWith('textures/custom')) {
          profiler.push('textures_custom_changed');

          if (existsSync(resolve(resourcePackPath, 'assets'))) {
            Deno.removeSync(resolve(resourcePackPath, 'assets'));
          }

          for (const entry of walkSync('pack/textures/custom', { includeDirs: false })) {
            if (!entry.path.endsWith('.png')) continue;
            const filename = relative('pack/textures/custom', entry.path);
            ensureDirSync(resolve(resourcePackPath, 'assets', dirname(filename)));
            Deno.copyFileSync(entry.path, resolve(resourcePackPath, 'assets', filename));
          }

          profiler.pop();
        } else if (entryDirname.startsWith('ui/custom')) {
          profiler.push('ui_custom_changed');

          profiler.push('remove_old');
          if (existsSync(resolve(resourcePackPath, 'ui', 'out'))) {
            Deno.removeSync(resolve(resourcePackPath, 'ui', 'out'), { recursive: true });
          }
          profiler.pop();

          for (const entry of walkSync('pack/ui/custom/', { includeDirs: false })) {
            const isJSONUI = entry.path.endsWith('.jsonui');
            const filename = relative('pack/ui/custom', entry.path).replace('.jsonui', '.json');
            let [success, content] = preprocessor.process(Deno.readTextFileSync(entry.path));
            if (!success) continue;
            if (isJSONUI) content = translateToJson(content!);

            ensureDirSync(resolve(resourcePackPath, 'ui', 'out', dirname(filename)));
            Deno.writeTextFileSync(resolve(resourcePackPath, 'ui', 'out', filename), content!);
          }
          profiler.pop();
        } else if (entryDirname.startsWith('ui/default')) {
          profiler.push('ui_default_changed');
          for (const entry of walkSync('pack/ui/default/', { includeDirs: false })) {
            const isJSONUI = entry.path.endsWith('.jsonui');
            const filename = relative('pack/ui/default', entry.path).replace('.jsonui', '.json');
            let [success, content] = preprocessor.process(Deno.readTextFileSync(entry.path));
            if (!success) continue;
            if (isJSONUI) content = translateToJson(content!);

            Deno.writeTextFileSync(resolve(resourcePackPath, 'ui', filename), content!);
          }
          profiler.pop();
        }

        profiler.end();
        profiler.printResults();
      }, 200);

      for await (const event of watcher) {
        handleEvent(event);
      }
    }
  }
}

if (import.meta.main) {
  await main();
}
