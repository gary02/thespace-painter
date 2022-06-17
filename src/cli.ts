import type { Coordinate } from "./utils";

import fs from "fs";
import { ethers } from "ethers";
import { PNG, PackerOptions } from "pngjs";

import { CLI_USAGE, CLI_USAGE_PAINT, CLI_COMMANDS, BASE_OUT_DIR } from "./constants";
import { fetchPainting, convert16color, stroll, blackFirst, randomPick } from "./painting";
import { paint as _paint } from "./painter";
import { abi as thespaceABI } from "../abi/TheSpace.json";
import { abi as registryABI } from "../abi/TheSpaceRegistry.json";
import { abi as erc20ABI } from "../abi/ERC20.json";

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
  const getMode = (help: string): string | never => {
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
    return mode;
  }

  const getOffset = (help: string): Coordinate | never => {
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
    paint(getImagePathOrPrintHelp(CLI_USAGE_PAINT), getMode(CLI_USAGE_PAINT), getOffset(CLI_USAGE_PAINT));
  } else if (command === 'preview') {
    preview(getImagePathOrPrintHelp(CLI_USAGE), getMode(CLI_USAGE));
  } else {
    preprocess(getImagePathOrPrintHelp(CLI_USAGE));
  }
}

const paint = async (path: string, mode: string, offset: Coordinate) => {

  const thespaceAddr = process.env.THESPACE_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.PROVIDER_RPC_HTTP_URL;
  if (thespaceAddr === undefined) {
    console.error('error: please set THESPACE_ADDRESS env');
    return;
  };
  if (privateKey === undefined) {
    console.error('error: please set PRIVATE_KEY env');
    return;
  };
  if (rpcUrl === undefined) {
    console.error('error: please set PROVIDER_RPC_HTTP_URL env');
    return;
  };

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
  const signer = new ethers.Wallet(privateKey, provider)

  const thespace = new ethers.Contract(
    thespaceAddr,
    thespaceABI,
    signer
  );
  const registryAddr = await thespace.registry();

  const registry = new ethers.Contract(
    registryAddr,
    registryABI,
    signer
  );

  const currencyAddr = await registry.currency();
  
  const currency = new ethers.Contract(
    currencyAddr,
    erc20ABI,
    signer
  );

  const balance = await currency.balanceOf(signer.address);
  if ( balance.isZero() ) {
    console.error('error: this wallet address has no space tokens')
    return;
  }

  const allowance = await currency.allowance(signer.address, registryAddr);

  if ( allowance.isZero() ) {
    const tx = await currency.approve(registryAddr, balance);
    await tx.wait();
  }

  const painting = fetchPainting(readPNG(path));
  let steps = [];
  if (mode === 'randomPick') {
    steps = randomPick(painting);
  } else if (mode === 'blackFirst') {
    steps = blackFirst(painting);
  } else {
    steps = stroll(painting);
  };
  await _paint(painting, steps, thespace, offset);
}

const preview = (path: string, mode: string) => {

  const painting = fetchPainting(readPNG(path))
  let steps = [];
  if (mode === 'randomPick') {
    steps = randomPick(painting);
  } else if (mode === 'blackFirst') {
    steps = blackFirst(painting);
  } else {
    steps = stroll(painting);
  };

  const outDir = BASE_OUT_DIR + hashCode(path).toString(32).slice(1) + '-' + mode;
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
  
  console.info(`done, try run 'feh --keep-zoom-vp -Z -S name -D 0.005 ./${outDir}/'`)
}

const preprocess = (path: string) => {

  if (!fs.existsSync(BASE_OUT_DIR)) {
      fs.mkdirSync(BASE_OUT_DIR);
  }
  const png = readPNG(path);
  convert16color(png);
  const outFilePath = BASE_OUT_DIR + hashCode(path).toString(32).slice(1) + '.png';
  fs.writeFileSync(outFilePath , PNG.sync.write(png))
  console.info(`output to './${outFilePath}'`)
}

// helpers

const readPNG = (path: string) => {
  const data: Buffer = fs.readFileSync(path);
  return PNG.sync.read(data);
}

const hashCode = (str: string) => {
    var hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
          chr   = str.charCodeAt(i);
          hash  = ((hash << 5) - hash) + chr;
          hash |= 0; // Convert to 32bit integer
        }
    return hash;
};

cli();
