import fs from "fs";
import { ethers } from "ethers";
import { PNG, PackerOptions } from "pngjs";

import { paint } from "./painter";
import { abi } from "../abi/TheSpace.json";


const readPNG = (path: string) => {
  const data: Buffer = fs.readFileSync(path);
  return PNG.sync.read(data);
}

const getColors = (png: PNG) => {
} 

const initTheSpaceContract = (address: string, rpcUrl: string, privateKey: string) => {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
  const signer = new ethers.Wallet(privateKey, provider)
  return new ethers.Contract(address, abi, signer)
}

const main = async (path: string | undefined) => {
  if (path === undefined) {
    console.error('please provide png file path');
    return;
  };
  if (process.env.PROVIDER_RPC_HTTP_URL === undefined) {
    console.error('please set PROVIDER_RPC_HTTP_URL env');
    return;
  };
  if (process.env.PRIVATE_KEY === undefined) {
    console.error('please set PRIVATE_KEY env');
    return;
  };
  if (process.env.THESPACE_ADDRESS === undefined) {
    console.error('please set THESPACE_ADDRESS env');
    return;
  };
  const png = readPNG(path);
  const thespace = initTheSpaceContract(
    process.env.THESPACE_ADDRESS,
    process.env.PROVIDER_RPC_HTTP_URL,
    process.env.PRIVATE_KEY
  );


  // colors gen from png
  // here is a expamle: 2*2 black image:
  const colors = [0x000000, 0x000000, 0x000000, 0x000000];
  const height = png.height;
  const width = png.width;
  await paint({colors, height, width}, thespace);
}


main(process.argv[2]);
