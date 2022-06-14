import fs from "fs";
import { ethers } from "ethers";
import { PNG, PackerOptions } from "pngjs";

import { fetchPainting, convert16color, blackFirst, randomPick } from "./painting";
import { paint as _paint } from "./painter";
import { abi as thespaceABI } from "../abi/TheSpace.json";
import { abi as registryABI } from "../abi/TheSpaceRegistry.json";
import { abi as erc20ABI } from "../abi/ERC20.json";

const USAGE = `Usage:
  npx ts-node src/cli.ts <command> <image-to-paint path>

  Supported commands:
    - paint
    - preview
    - convert

  Environment values below should be set when using paint command:
    - THESPACE_ADDRESS
    - PRIVATE_KEY
    - PROVIDER_RPC_HTTP_URL
`

const COMMANDS = ['preview', 'paint', 'convert']
const BASE_OUT_DIR = 'out/'

const cli = () => {
  const count = process.argv.length;
  if (count <= 3) {
    console.info(USAGE);
    return;
  };

  const command = process.argv[2];
  if (COMMANDS.indexOf(command) === -1) {
    console.info(USAGE);
    return;
  }

  const imagePath = process.argv[3];

  if (imagePath === undefined) {
    console.info(USAGE);
    return;
  }

  if (command === 'paint') {
    paint(imagePath);
  } else if (command === 'preview') {
    preview(imagePath);
  } else {
    convert(imagePath);
  }
}

const paint = async (path: string) => {

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
  //console.log(painting.colors);
  await _paint(painting, thespace);
}

const preview = (path: string) => {

  const outDir = BASE_OUT_DIR + hashCode(path).toString(32).slice(1);
  if (!fs.existsSync(BASE_OUT_DIR)) {
      fs.mkdirSync(BASE_OUT_DIR);
  }
  if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir);
  }

  const painting = fetchPainting(readPNG(path))
  // const steps = randomPick(painting);
  const steps = blackFirst(painting);

  const png = new PNG({ width: painting.width, height: painting.height })
  for (const [i, step] of steps.entries()) {
    const color = painting.colors[step]
    const idx  = step * 4
    png.data[idx] = (color >> 16) & 0xff;
    png.data[idx + 1] = (color >> 8) & 0xff;
    png.data[idx + 2] = color & 0xff;
    png.data[idx + 3] = 0xff;

    fs.writeFileSync(outDir + '/' + String(i+1).padStart(10, '0') +  '.png' , PNG.sync.write(png))

  }
  
  console.info(`done, try run 'feh -S name -Z ./${outDir}/*'`)
}

const convert = (path: string) => {

  if (!fs.existsSync(BASE_OUT_DIR)) {
      fs.mkdirSync(BASE_OUT_DIR);
  }
  const png = readPNG(path);
  convert16color(png);
  const outFilePath = BASE_OUT_DIR + hashCode(path).toString(32).slice(1) + '.png';
  fs.writeFileSync(outFilePath , PNG.sync.write(png))
  console.info(`output to ' ${outFilePath}'`)
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
