import { PackConfig } from './script.ts';
import { load } from 'https://deno.land/std@0.224.0/dotenv/mod.ts';

const env = await load();

const config: PackConfig = {
  targetVersion: 'MCPE_0_16',
  profiles: [
    {
      version: 'MCPE_0_12',
      minecraftAppData: env['MCPE_0_12_DATA_PATH']
    },
    {
      version: 'MCPE_0_13',
      minecraftAppData: env['MCPE_0_13_DATA_PATH']
    },
    {
      version: 'MCPE_0_14',
      minecraftAppData: env['MCPE_0_14_DATA_PATH']
    },
    {
      version: 'MCPE_0_15',
      minecraftAppData: env['MCPE_0_15_DATA_PATH']
    },
    {
      version: '>=MCPE_0_16',
      resourcePackPath: env['MCPE_RESOURCE_PACK_PATH']
    }
  ]
};

export default config;
