import fs from "fs";
import { ethers } from "ethers";
import { PNG, PackerOptions } from "pngjs";
import { abi } from "../abi/TheSpace.json";

const RGBS = [
  0x000000, 0xffffff, 0xd4d7d9, 0x898d90, 0x784102, 0xd26500, 0xff8a00,
  0xffde2f, 0x159800, 0x8de763, 0x58eaf4, 0x059df2, 0x034cba, 0x9503c9,
  0xd90041, 0xff9fab,
];

const readPNG = (path: string) => {
  const data: Buffer = fs.readFileSync(path);
  return PNG.sync.read(data);
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

  const tokenId = 1;
  const bidPrice = ethers.BigNumber.from('1000000000000000000');
  const newPrice = ethers.BigNumber.from('1000000000000000000');
  const color = 1;

  const tx = await thespace.setPixel(tokenId, bidPrice, newPrice, color)
  await tx.wait();


}


main(process.argv[2]);
