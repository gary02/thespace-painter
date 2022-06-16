import type { Event, Contract } from "ethers";

import { ethers } from "ethers";
import { stroll } from "./painting";

const RGBS = [
  0x000000, 0xffffff, 0xd4d7d9, 0x898d90, 0x784102, 0xd26500, 0xff8a00,
  0xffde2f, 0x159800, 0x8de763, 0x58eaf4, 0x059df2, 0x034cba, 0x9503c9,
  0xd90041, 0xff9fab,
];

function rgb2cc(rgb: number) {
  return RGBS.indexOf(rgb);
}

 const sleep = (ms: number) => {
     console.log(`Sleep ${ms} ms...`);
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

export const paint = async (
  painting: {
    colors: number[];
    alphas: number[];
    height: number;
    width: number;
  },
  thespace: Contract
) => {
  // , x: number, y: number, maxPrice: number
  const x = 484;
  const y = 702;
  const maxPrice = 20;
  const pixelsOfRow = 1000;
  const steps = stroll(painting);
  console.log({ steps });
  for (const [i, step] of steps.entries()) {
    const rgb = painting.colors[step];
    const pixelX = step % painting.width;
    const pixelY = Math.floor(step / painting.width);
    const tokenId = (y + pixelY - 1) * pixelsOfRow + (x + pixelX);
    const bidPrice = ethers.BigNumber.from("1000000000000000000");
    const newPrice = ethers.BigNumber.from("1000000000000000000");
    const color = rgb2cc(rgb) + 1;
    console.log('\n----------------------------------------------')    
    const price = await thespace.getPrice(tokenId);
    const colored = await thespace.getColor(tokenId);
    const p = Number(ethers.utils.formatEther(price));
    console.log({ step, x: x + pixelX, y: y + pixelY, color, price: p });
    if (p <= maxPrice && colored.toNumber() !== color) {
      const tx = await thespace.setPixel(tokenId, bidPrice, newPrice, color);
      console.log({ tx });
    //   const tr = await tx.wait();
    //   console.log({ tr });
     sleep(getRandomInt(0, 1000))
    }
  }
};
