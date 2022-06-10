import { ethers } from "ethers";

import { fetchPainting } from "./painting";
import { paint } from "./painter";
import { abi } from "../abi/TheSpace.json";

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
  const thespace = initTheSpaceContract(
    process.env.THESPACE_ADDRESS,
    process.env.PROVIDER_RPC_HTTP_URL,
    process.env.PRIVATE_KEY
  );

  await paint(fetchPainting(path), thespace);
}

// helpers

const initTheSpaceContract = (address: string, rpcUrl: string, privateKey: string) => {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
  const signer = new ethers.Wallet(privateKey, provider)
  return new ethers.Contract(address, abi, signer)
}

main(process.argv[2]);
