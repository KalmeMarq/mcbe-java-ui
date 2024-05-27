import { debounce } from 'https://deno.land/std@0.224.0/async/debounce.ts';
import { relative } from 'https://deno.land/std@0.224.0/path/relative.ts';

async function main() {
  const watcher = Deno.watchFs('.', { recursive: false });

  const runScript = () => {
    return new Deno.Command('deno', {
      args: ['run', '-A', 'script.ts', ...Deno.args],
      stderr: 'inherit',
      stdin: 'inherit',
      stdout: 'inherit'
    }).spawn();
  };

  console.log('Starting script.ts...');
  let m = runScript();

  Deno.addSignalListener('SIGINT', () => {
    console.log('Terminating script.ts...');
    m.kill();
    watcher.close();
  });

  const handler = debounce((event) => {
    if (relative(Deno.cwd(), event.paths[0]) == '.env' && event.kind === 'modify') {
      console.log('Restarting script.ts...');
      m.kill();
      m = runScript();
    }
  }, 200);

  for await (const entry of watcher) {
    handler(entry);
  }
}

if (import.meta.main) {
  await main();
}
