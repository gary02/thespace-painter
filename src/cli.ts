import type { Coordinate } from "./utils";

import fs from "fs";
import { ethers } from "ethers";
import { PNG } from "pngjs";

import { CLI_USAGE, CLI_USAGE_PAINT, CLI_COMMANDS, BASE_OUT_DIR, MODES, COLORS } from "./constants";
import { fetchPainting, fetchCanvas, convert16color, stroll, blackFirst, randomPick } from "./painting";
import { paint as _paint } from "./painter";
import { hash } from "./utils";
import { abi as thespaceABI } from "../abi/TheSpace.json";
import { abi as registryABI } from "../abi/TheSpaceRegistry.json";
import { abi as erc20ABI } from "../abi/ERC20.json";
import { abi as snapperABI } from "../abi/Snapper.json";

const cli = () => {

  const getImagePathOrPrintHelp = (help: string): string | never => {
    let imagePath;
    for (const i of Array(process.argv.length-3).keys()) {
      const item = process.argv[3+i];
      if (item.startsWith('-')) {
        continue;
      }
      imagePath = item;
      break;
    }
    if (imagePath === undefined) {
      console.info(help);
      process.exit(1);
    }
    return imagePath;
  }
  const getModeOrPrintHelp = (help: string): string | never => {
    let mode;
    for (const i of Array(process.argv.length-3).keys()) {
      const item = process.argv[3+i];
      if (item.startsWith('--mode=')) {
        mode = item.split('=')[1];
        break;
      }
    }
    if (mode === undefined) {
      mode = 'stroll';
    }
    if (MODES.indexOf(mode)===-1) {
      console.info(help);
      process.exit(1);
    }
    return mode;
  }

  const getOffsetOrPrintHelp = (help: string): Coordinate | never => {
    const pattern = /\d+,\d+/
    let offset;
    for (const i of Array(process.argv.length-3).keys()) {
      const item = process.argv[3+i];
      if (item.startsWith('--offset=')) {
        const _offset = item.split('=')[1];
        if (pattern.test(_offset)) {
          offset = _offset;
        } else {
          console.info(help);
          process.exit(1);
        }
        break;
      }
    }
    if (offset === undefined) {
      offset = '1,1';
    }
    const [x, y] = offset.split(',');
    return [parseInt(x), parseInt(y)];
  }
  const getStartOrPrintHelp = (help: string): Coordinate | null | never => {
    const pattern = /\d+,\d+/
    let start;
    for (const i of Array(process.argv.length-3).keys()) {
      const item = process.argv[3+i];
      if (item.startsWith('--start=')) {
        const _start = item.split('=')[1];
        if (pattern.test(_start)) {
          start = _start;
        } else {
          console.info(help);
          process.exit(1);
        }
        break;
      }
    }
    if (start === undefined) {
      return null;
    }
    const [x, y] = start.split(',');
    return [parseInt(x), parseInt(y)];
  }
  const getIntervalOrPrintHelp = (help: string): number | never => {
    const pattern = /\d+/
    let interval;
    for (const i of Array(process.argv.length-3).keys()) {
      const item = process.argv[3+i];
      if (item.startsWith('--interval=')) {
        const _interval = item.split('=')[1];
        if (pattern.test(_interval)) {
          interval = _interval;
        } else {
          console.info(help);
          process.exit(1);
        }
        break;
      }
    }
    if (interval === undefined) {
      interval = '1';
    }
    return parseInt(interval);
  }

  const count = process.argv.length;
  if (count <= 2) {
    console.info(CLI_USAGE);
    process.exit(1);
  };

  const command = process.argv[2];
  if (CLI_COMMANDS.indexOf(command) === -1) {
    console.info(CLI_USAGE);
    process.exit(1);
  }

  if (command === 'paint') {
    paint(
      getImagePathOrPrintHelp(CLI_USAGE_PAINT),
      getModeOrPrintHelp(CLI_USAGE_PAINT),
      getOffsetOrPrintHelp(CLI_USAGE_PAINT),
      getIntervalOrPrintHelp(CLI_USAGE_PAINT)
    );
  } else if (command === 'preview') {
    preview(
      getImagePathOrPrintHelp(CLI_USAGE),
      getModeOrPrintHelp(CLI_USAGE),
      getStartOrPrintHelp(CLI_USAGE),
    );
  } else {
    preprocess(getImagePathOrPrintHelp(CLI_USAGE));
  }
}

const paint = async (path: string, mode: string, offset: Coordinate, interval: number) => {

  const thespaceAddr = process.env.THESPACE_ADDRESS;
  const snapperAddr = process.env.SNAPPER_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.PROVIDER_RPC_HTTP_URL;
  const _maxPrice = process.env.MAX_PRICE;
  let maxPrice = (_maxPrice !== undefined) ? parseInt(_maxPrice) : undefined;

  if (thespaceAddr === undefined) {
    console.error('error: please set THESPACE_ADDRESS env');
    process.exit(1);
  };
  if (snapperAddr === undefined) {
    console.error('error: please set SNAPPER_ADDRESS env');
    process.exit(1);
  };
  if (privateKey === undefined) {
    console.error('error: please set PRIVATE_KEY env');
    process.exit(1);
  };
  if (rpcUrl === undefined) {
    console.error('error: please set PROVIDER_RPC_HTTP_URL env');
    process.exit(1);
  };
  if (maxPrice === undefined ) {
    maxPrice = 50
  };

  console.log('setting up...')
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
  const signer = new ethers.Wallet(privateKey, provider)

  const snapper = new ethers.Contract(
    snapperAddr,
    snapperABI,
    provider,
  );

  const thespace = new ethers.Contract(
    thespaceAddr,
    thespaceABI,
    signer
  );
  const registryAddr = await thespace.registry();

  const registry = new ethers.Contract(
    registryAddr,
    registryABI,
    provider
  );

  const currencyAddr = await registry.currency();
  
  const currency = new ethers.Contract(
    currencyAddr,
    erc20ABI,
    signer
  );

  const balance = await currency.balanceOf(signer.address);
  if ( balance.isZero() ) {
    console.error(`error: this wallet address has no space tokens (erc20 ${currencyAddr})`)
    process.exit(1);
  }

  const allowance = await currency.allowance(signer.address, registryAddr);

  if ( allowance.isZero() ) {
    const tx = await currency.approve(registryAddr, balance);
    await tx.wait();
  }

  console.log('fetching painting data...')
  const painting = fetchPainting(readPNG(path));
  console.log('fetching canvas data...')
  const canvas = await fetchCanvas(snapper, registry);

  if (hasInvalidColors(painting.colors)) {
    console.error('error: this image contains invalid colors. You can use `preprocess` subcommand to convert it to valid image')
    process.exit(1);
  }

  let steps = [];
  if (mode === 'randomPick') {
    steps = randomPick(painting);
  } else if (mode === 'blackFirst') {
    steps = blackFirst(painting);
  } else {
    steps = stroll(painting);
  };

  await _paint(painting, steps, canvas, offset, interval, maxPrice!, thespace);
}

const preview = (path: string, mode: string, start: Coordinate | null) => {

  const painting = fetchPainting(readPNG(path))
  let steps = [];
  if (mode === 'randomPick') {
    steps = randomPick(painting);
  } else if (mode === 'blackFirst') {
    steps = blackFirst(painting);
  } else {
    if (start !== null) {
      steps = stroll(painting, [start[0]-1, start[1]-1]);
    } else {
      steps = stroll(painting);
    }
  };

  let filename = hash(path) + '-' + mode;
  if (start !== null) {
    filename = filename + `-start(${start[0]}, ${start[1]})`
  }
  const outDir = BASE_OUT_DIR + filename;

  if (!fs.existsSync(BASE_OUT_DIR)) {
      fs.mkdirSync(BASE_OUT_DIR);
  }
  if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir);
  }

  const png = new PNG({ width: painting.width, height: painting.height })
  for (const [i, step] of steps.entries()) {
    const color = painting.colors[step];
    const idx  = step * 4;
    png.data[idx] = (color >> 16) & 0xff;
    png.data[idx + 1] = (color >> 8) & 0xff;
    png.data[idx + 2] = color & 0xff;
    png.data[idx + 3] = 0xff;

    fs.writeFileSync(outDir + '/' + String(i+1).padStart(10, '0') +  '.png' , PNG.sync.write(png))

  }
  
  console.info(`done, try run "feh --keep-zoom-vp -Z -S name -D 0.005 './${outDir}/'"`)
}

const preprocess = (path: string) => {

  if (!fs.existsSync(BASE_OUT_DIR)) {
      fs.mkdirSync(BASE_OUT_DIR);
  }
  const png = readPNG(path);
  convert16color(png);
  const outFilePath = BASE_OUT_DIR + hash(path) + '.png';
  fs.writeFileSync(outFilePath , PNG.sync.write(png))
  console.info(`output to './${outFilePath}'`)
}

// helpers

const hasInvalidColors = (colors: number[]):boolean => {
  for (const c of colors) {
    if (COLORS.indexOf(c) === -1) {
      return true;
    }
  }
  return false;
}

const readPNG = (path: string) => {
  const data: Buffer = fs.readFileSync(path);
  return PNG.sync.read(data);
}

cli();
