export const COLORS = [
  0x000000, 0xffffff, 0xd4d7d9, 0x898d90, 0x784102, 0xd26500, 0xff8a00,
  0xffde2f, 0x159800, 0x8de763, 0x58eaf4, 0x059df2, 0x034cba, 0x9503c9,
  0xd90041, 0xff9fab,
];

export const MODES = ['blackFirst', 'randomPick', 'stroll']

export const CLI_USAGE = `Usage:
  node bot.js src/cli.ts <SUBCOMMAND>

SUBCOMMANDS:
  - paint         Paint input image on TheSpace app.
  - preview       Ouput a series of png files to show how robot paint the target painting step by step.
  - preprocess    Convert image to valid 16-color png file for TheSpace app.
`

export const CLI_USAGE_PAINT = `Usage:
  node bot.js src/cli.ts paint <PNG PATH> [OPTIONS]

OPTIONS:
            --offset=<x,y>                  TheSpace canvas coordinate (1-base) to start paint the image, default 1,1
            --mode=<mode name>              The way to paint the image, valid mode: stroll (default), randomPick, blackFirst
  -p=<x,y>, --stroll-label-point=<x,y>      When in stroll mode, specify a series of pixel coordinates (1-base) to help paint process
            --interval=<seconds>            the interval between paint, default 1 second

ENVIRONMENT VALUES:
  THESPACE_ADDRESS
  SNAPPER_ADDRESS
  PRIVATE_KEY
  PROVIDER_RPC_HTTP_URL
  MAX_PRICE
`

export const CLI_COMMANDS = ['preview', 'paint', 'preprocess']

export const BASE_OUT_DIR = 'out/'
