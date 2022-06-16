import type { Event, Contract } from "ethers";
import type { Painting } from "./painting";

import { ethers } from "ethers";

import { COLORS } from "./constants";
import { stroll } from "./painting";
import { getFeeDataFromPolygon, index2coordinate } from "./utils";

const oneSpaceToken = ethers.BigNumber.from("1000000000000000000");

function color2cc(color: number) {
  return COLORS.indexOf(color) + 1;
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
  painting: Painting,
  thespace: Contract
) => {
  // , x: number, y: number, maxPrice: number
  const x = 484;
  const y = 702;
  const maxPrice = 20;
  //TODO: max gas fee
  const pixelsOfRow = 1000;
  const steps = stroll(painting);
  for (const [i, step] of steps.entries()) {
    const color = painting.colors[step];
    const [pixelX, pixelY] = index2coordinate(step, painting.width);
    const tokenId = (y + pixelY - 1) * pixelsOfRow + (x + pixelX);
    const bidPrice = oneSpaceToken;
    const newPrice = oneSpaceToken;
    const cc = color2cc(color);
    console.log('\n----------------------------------------------')    
    const price = await thespace.getPrice(tokenId);
    const colored = await thespace.getColor(tokenId);
    const p = Number(ethers.utils.formatEther(price));
    const feeData = await getFeeDataFromPolygon();
    console.log({ progress: `${i+1} of ${steps.length}`, x: x + pixelX, y: y + pixelY, 'color':cc, price: p });
    if (p <= maxPrice && colored.toNumber() !== cc) {
      const tx = await thespace.setPixel(tokenId, bidPrice, newPrice, cc);
      console.log({ tx });
    //   const tr = await tx.wait();
    //   console.log({ tr });
     sleep(getRandomInt(0, 1000))
    }
  }
};
