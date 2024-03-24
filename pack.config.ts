import { PackConfig } from './script.ts';

const config: PackConfig = {
  ui: {
    patterns: [
      {
        input: 'src/default',
        output: 'ui'
      },
      {
        input: 'src/custom',
        output: 'ui/dist'
      },
      {
        input: 'src/pack_manifest.jsonui',
        output: 'pack_manifest.json'
      }
    ]
  },
  textures: {
    list: {
      patterns: ['assets']
    }
  },
  resolveInclude: 'src/include',
  target: 'MCPE_1_0'
};

export default config;
