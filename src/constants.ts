export const THESPACE_TOTAL_SUPPLY = 1000000;

export const COLORS = [
  0x000000, 0xffffff, 0xd4d7d9, 0x898d90, 0x784102, 0xd26500, 0xff8a00,
  0xffde2f, 0x159800, 0x8de763, 0x58eaf4, 0x059df2, 0x034cba, 0x9503c9,
  0xd90041, 0xff9fab,
];

export const MODES = ['blackFirst', 'randomPick', 'stroll']

export const CLI_USAGE = `Usage:
  npx ts-node src/cli.ts <SUBCOMMAND>

  SUBCOMMANDS:
    - paint         Paint input image on TheSpace app.
    - preview       Ouput a series of png files to show how robot paint the target painting step by step.
    - preprocess    Convert image to valid 16-color png file for TheSpace app.
`

export const CLI_USAGE_PAINT = `Usage:
  npx ts-node src/cli.ts paint <png path> [--mode=<mode>] [--offset=<x,y>] [--interval=<seconds>]

  Environment values below should be set for this subcommand:
    - THESPACE_ADDRESS
    - PRIVATE_KEY
    - PROVIDER_RPC_HTTP_URL
    - MAX_PRICE
`

export const CLI_COMMANDS = ['preview', 'paint', 'preprocess']

export const BASE_OUT_DIR = 'out/'
