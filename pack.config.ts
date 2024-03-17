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
      }
    ]
  },
  textures: {
    list: {
      patterns: ['assets']
    }
  },
  manifest: {
    name: 'Java UI - KM',
    description: 'Created by KalmeMarq',
    version: '1.0.0',
    uuid: '4d31f3ad-830f-4ab6-add0-9de9804ab3d3',
    mdule_uuid: 'e9b92edc-fd42-4083-9faa-e52d89cb6450'
  },
  target: 'MCPE_1_2_10'
};

export default config;
