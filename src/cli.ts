import { ethers } from "ethers";

import { fetchPainting } from "./painting";
import { paint } from "./painter";
import { abi as thespaceABI } from "../abi/TheSpace.json";
import { abi as registryABI } from "../abi/TheSpaceRegistry.json";
import { abi as erc20ABI } from "../abi/ERC20.json";

const main = async (path: string | undefined) => {
  const thespaceAddr = process.env.THESPACE_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.PROVIDER_RPC_HTTP_URL;
  if (path === undefined) {
    console.error('please provide png file path');
    return;
  };
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

main(process.argv[2]);
