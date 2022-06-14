export const COLORS = [
  0x000000, 0xffffff, 0xd4d7d9, 0x898d90, 0x784102, 0xd26500, 0xff8a00,
  0xffde2f, 0x159800, 0x8de763, 0x58eaf4, 0x059df2, 0x034cba, 0x9503c9,
  0xd90041, 0xff9fab,
];

export const CLI_USAGE = `Usage:
  npx ts-node src/cli.ts <command> <image-to-paint path>

  Supported commands:
    - paint
    - preview
    - preprocess

  Environment values below should be set when using paint command:
    - THESPACE_ADDRESS
    - PRIVATE_KEY
    - PROVIDER_RPC_HTTP_URL
`

export const CLI_COMMANDS = ['preview', 'paint', 'preprocess']

export const BASE_OUT_DIR = 'out/'
