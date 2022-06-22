import type { Event, Contract } from "ethers";
import type { Painting } from './painting'

import axios from "axios";
import { PNG } from "pngjs";
import { ethers } from "ethers";

import { fetchPainting, code2color, color2code } from './painting'
import { abi as thespaceABI } from "../abi/TheSpace.json";
import { abi as registryABI } from "../abi/TheSpaceRegistry.json";
import { abi as erc20ABI } from "../abi/ERC20.json";
import { abi as snapperABI } from "../abi/Snapper.json";

export class TheSpace {
  signer: ethers.Wallet; 
  thespace: Contract;
  snapper: Contract;
  canvas: Painting | null;

  constructor(privateKey: string, rpcUrl: string, thespaceAddr: string, snapperAddr:string) {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
    this.signer = new ethers.Wallet(privateKey, provider)

    this.snapper = new ethers.Contract(
      snapperAddr,
      snapperABI,
      provider,
    );

    this.thespace = new ethers.Contract(
      thespaceAddr,
      thespaceABI,
      this.signer
    );

    this.canvas = null;
  }

  async init() {
  
    const registryAddr = await this.thespace.registry();

    const registry = new ethers.Contract(
      registryAddr,
      registryABI,
      this.signer
    );

    const currencyAddr = await registry.currency();
    
    const currency = new ethers.Contract(
      currencyAddr,
      erc20ABI,
      this.signer
    );

    const balance = await currency.balanceOf(this.signer.address);
    if ( balance.isZero() ) {
      console.error(`error: this wallet address has no space tokens (erc20 ${currencyAddr})`)
      throw Error();
    }

    const allowance = await currency.allowance(this.signer.address, registryAddr);

    if ( allowance.isZero() ) {
      const tx = await currency.approve(registryAddr, balance);
      await tx.wait();
    }

    this.canvas = await fetchCanvas(this.snapper, registry);
  }

  async getPrice(pixelId: number) {
    const price = await this.thespace.getPrice(pixelId);
    return Number(ethers.utils.formatEther(price));
  }

  async setPixel(pixelId: number, bidPrice: number, newPrice: number, colorCode: number) {
    return await this.thespace.setPixel(
      pixelId,
      ethers.utils.parseEther(bidPrice.toString()),
      ethers.utils.parseEther(newPrice.toString()),
      colorCode
    )
  }

  getPixelColorCode(pixelId: number): number | never {
    if (this.canvas === null) {
      throw Error('thespace do not have init')
    }
    return color2code(this.canvas.colors[pixelId-1])
  }

  getCanvas(): Painting | never {
    if (this.canvas === null) {
      throw Error('thespace do not have init')
    }
    return this.canvas;
  }

}

//  const getColorCodeFromContract = async(pixelId: number): Promise<number> => {
//    return (await thespace.getColor(pixelId)).toNumber();
//  }



// helpers

const fetchCanvas = async (snapper: Contract, registry: Contract): Promise<Painting> => {
  const regionId = 0;
  const [_fromBlock, snapshotCid] = await snapper[
    "latestSnapshotInfo(uint256)"
  ](regionId);
  const fromBlock = _fromBlock.toNumber();
  const response = await axios(`https://d3ogaonsclhjen.cloudfront.net/${snapshotCid}`, { responseType: 'arraybuffer' });
  const snapshot = PNG.sync.read(Buffer.from(response.data, 'binary'));
  const canvas = fetchPainting(snapshot);
  const colorEvents = await registry.queryFilter(registry.filters.Color(), fromBlock);
  for (const e of colorEvents) {
    const pixelID = parseInt(e.args!.tokenId);
    const colorCode = parseInt(e.args!.color);
    canvas.colors[pixelID-1] = code2color(colorCode);
  }
  return canvas;
}
