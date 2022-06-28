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
  registry: Contract | null;
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
    this.registry = null;
    this.canvas = null;
  }

  async init() {

    const signerBalance = wei2ether(await this.signer.getBalance());
    console.info(`use wallet ${this.signer.address}`)
    if (signerBalance < 0.01) {
      console.warn(`WARN: wallet ${this.signer.address} has only ${signerBalance} Matic`)
    }

  
    const registryAddr = await this.thespace.registry();

    this.registry = new ethers.Contract(
      registryAddr,
      registryABI,
      this.signer
    );

    const currencyAddr = await this.registry.currency();
    
    const currency = new ethers.Contract(
      currencyAddr,
      erc20ABI,
      this.signer
    );

    const balance = await currency.balanceOf(this.signer.address);
    if ( wei2ether(balance) < 1) {
      console.error(`ERROR: this wallet address has few Space tokens (erc20 ${currencyAddr})`)
      throw new Error('Space Tokens too few');
    }

    const allowance = await currency.allowance(this.signer.address, registryAddr);

    if ( allowance.isZero() ) {
      const tx = await currency.approve(registryAddr, balance);
      await tx.wait();
    }

    this.canvas = await fetchCanvas(this.snapper, this.registry);
    this.registry.on(
      'Color',
      (tokenId, color, owner) => {
        const pixelId = tokenId.toNumber();
        const colorCode = color.toNumber();
        this.canvas!.colors[pixelId-1] = code2color(colorCode);
      }
    )
  }

  async getPrice(pixelId: number) {
    let count = 0
    while (count++ < 5) {
      try {
        const price = await this.thespace.getPrice(pixelId);
        return wei2ether(price);
      } catch (error) {
        console.warn(error);
      } 
    }
    const price = await this.thespace.getPrice(pixelId);
    return wei2ether(price);
  }

  async setPixel(pixelId: number, bidPrice: number, newPrice: number, colorCode: number, overrides: ethers.Overrides) {
    if (this.snapper.address === '0xc92c2944fe36ee4ddf7d160338ce2ef8c342c4ed') {
      return await this.thespace.setPixel(
        pixelId,
        ethers.utils.parseEther(bidPrice.toString()),
        ethers.utils.parseEther(newPrice.toString()),
        colorCode,
      )
    } else {
      return await this.thespace.setPixel(
        pixelId,
        ethers.utils.parseEther(bidPrice.toString()),
        ethers.utils.parseEther(newPrice.toString()),
        colorCode,
        overrides,
      )
    }
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
//
const wei2ether = (bn: ethers.BigNumber): number => Number(ethers.utils.formatEther(bn));

const fetchCanvas = async (snapper: Contract, registry: Contract): Promise<Painting> => {
  let cdn;
  if (snapper.address === '0xc92c2944fe36ee4ddf7d160338ce2ef8c342c4ed') {
    cdn = 'd1gykh5008m3d7.cloudfront.net';
  } else {
    cdn = 'd3ogaonsclhjen.cloudfront.net';
  }
  const regionId = 0;
  const [_fromBlock, snapshotCid] = await snapper[
    "latestSnapshotInfo(uint256)"
  ](regionId);
  const fromBlock = _fromBlock.toNumber();
  const response = await axios(`https://${cdn}/${snapshotCid}`, { responseType: 'arraybuffer' });
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
