import fs from "fs";
import { ethers } from "ethers";
import { PNG, PackerOptions } from "pngjs";

import { fetchPainting, blackFirst } from "./painting";
import { paint } from "./painter";
import { abi as thespaceABI } from "../abi/TheSpace.json";
import { abi as registryABI } from "../abi/TheSpaceRegistry.json";
import { abi as erc20ABI } from "../abi/ERC20.json";

const USAGE = `Usage:
  npx ts-node src/cli.ts <image-to-paint path> [--run]

  Environment values below should be set when --run specified:
    - THESPACE_ADDRESS
    - PRIVATE_KEY
    - PROVIDER_RPC_HTTP_URL
`

const cli = () => {
  const count = process.argv.length;
  if (count <= 2) {
    console.info(USAGE);
    return;
  };

  let path;
  let run = false;

  for (const i of Array(count - 2).keys()) {
    const item = process.argv[2+i];
    if (item.indexOf('/') !== -1) {
      path = item;
    };
    if (item === '--run') {
      run = true;
    };
  };

  if (path === undefined) {
    console.info(USAGE);
    return;
  }

  if (run === true) {
    main(path)
  } else {
    dryrun(path)
  }
}

const main = async (path: string) => {

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

  const painting = fetchPainting(path);
  //console.log(painting.colors);
  await paint(painting, thespace);
}

// helpers 
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

const dryrun = (path: string) => {

  const baseOutDir = 'out/'
  const outDir = baseOutDir + hashCode(path).toString(32).slice(1);
  if (!fs.existsSync(baseOutDir)) {
      fs.mkdirSync(baseOutDir);
  }
  if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir);
  }

  const painting = fetchPainting(path)
  const steps = blackFirst(painting);

  const png0 = new PNG({ width: painting.width, height: painting.height })
  for (const i of steps) {
  }
  
  console.info(`see in './${outDir}'`)
}

cli();
