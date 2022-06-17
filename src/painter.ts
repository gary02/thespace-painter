import type { Event, Contract } from "ethers";
import type { Painting } from "./painting";
import type { Coordinate } from "./utils";

import { ethers } from "ethers";

import { COLORS, THESPACE_TOTAL_SUPPLY } from "./constants";
import { getFeeDataFromPolygon, index2coordinate } from "./utils";

const color2cc = (color: number) => {
  return COLORS.indexOf(color) + 1;
}

const sleep = (ms: number) => {
     console.log(`Sleep ${ms} ms...`);
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const getRandomInt = (min: number, max: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

export const paint = async (
  painting: Painting,
  steps: number[],
  thespace: Contract,
  offset: Coordinate,
  interval: number,
  maxPrice: number
) => {
  // , x: number, y: number, maxPrice: number
  const [x, y] = offset;
  //TODO: max gas fee

  const thespaceWidth = Math.sqrt(THESPACE_TOTAL_SUPPLY);
  for (const [i, step] of steps.entries()) {
    const color = painting.colors[step];
    const [pixelX, pixelY] = index2coordinate(step, painting.width);

    console.log('\n----------------------------------------------')    
    console.log({ progress: `${i+1} of ${steps.length}`, x: x + pixelX, y: y + pixelY});

    const tokenId = (y + pixelY - 1) * thespaceWidth + (x + pixelX);
    if (tokenId >= THESPACE_TOTAL_SUPPLY) {
      console.warn(`warn: invalid tokenId ${tokenId}, pass`);
      continue;
    }

    const cc = color2cc(color);

    const price = await thespace.getPrice(tokenId);
    const p = Number(ethers.utils.formatEther(price));

    const colored = await thespace.getColor(tokenId);

    if (p <= maxPrice && colored.toNumber() !== cc) {
      //const feeData = await getFeeDataFromPolygon();
      const tx = await thespace.setPixel(tokenId, price, price, cc);
      console.log({ tx });
    //   const tr = await tx.wait();
    //   console.log({ tr });
     sleep(getRandomInt(interval * 1000 - 500, interval * 1000 + 500))
    }
  }
};
