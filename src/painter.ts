import type { Event, Contract } from "ethers";
import type { Painting } from "./painting";
import type { Coordinate, Index } from "./utils";

import { ethers } from "ethers";

import { COLORS, THESPACE_TOTAL_SUPPLY } from "./constants";
import { getFeeDataFromPolygon, index2coordinate } from "./utils";

const color2cc = (color: number) => {
  return COLORS.indexOf(color) + 1;
}

const sleep = async (ms: number) => {
    console.log(`sleep ${ms} ms...`);
    return await (new Promise((resolve) => setTimeout(resolve, ms)));
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
  //TODO: max gas fee

  const [ox, oy] = offset;
  const thespaceWidth = Math.sqrt(THESPACE_TOTAL_SUPPLY);

  const getTokenId = (paintingIdx: Index) => {
    const [x, y] = index2coordinate(paintingIdx, painting.width);
    return (y + oy - 1) * thespaceWidth + (x + ox);
  }
  const tryGetColorCode = async(tokenId: number): Promise<number> => {
    if (tokenId >= THESPACE_TOTAL_SUPPLY) {
      return -1
    }
    return (await thespace.getColor(tokenId)).toNumber();
  }

  const tokenIds = steps.map((i: Index) => getTokenId(i));
  console.log('querying colors from thespace...(this process may take long time)')
  console.time('querying colors')
  const colorCodes = await Promise.all(
    tokenIds.map((id) => tryGetColorCode(id))
  );
  console.timeEnd('querying colors')

  for (const [i, step] of steps.entries()) {

    const [x, y] = index2coordinate(tokenIds[i] - 1, thespaceWidth).map((i) => i + 1)
    console.log('\n----------------------------------------------')    
    console.log(`painting pixelID ${tokenIds[i]} (${x}, ${y}) [${i+1} of ${steps.length}]`);

    const newColorCode = color2cc(painting.colors[step]);

    if (colorCodes[i] === -1) {
      console.log('out of thespace map, skip');
      continue;
    }

    if (colorCodes[i] === newColorCode) {
      console.log('painted, skip');
      continue;
    }

    const price = await thespace.getPrice(tokenIds[i]);
    const p = Number(ethers.utils.formatEther(price));

    if (p > maxPrice) {
      console.log(`price ${p} too much, skip`);
      continue;
    }
    //const feeData = await getFeeDataFromPolygon();
    console.log('painting...')
    const tx = await thespace.setPixel(tokenIds[i], price, price, newColorCode);
    console.log({ tx });
    //const tr = await tx.wait();
    //console.log({ tr });
    await sleep(getRandomInt(interval * 1000 - 500, interval * 1000 + 500));
 }
};
