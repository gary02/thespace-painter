import type { Event, Contract } from "ethers";
import type { Painting } from "./painting";
import type { Coordinate, Index } from "./utils";

import { ethers } from "ethers";

import { color2code as color2cc } from "./painting";
import { getFeeDataFromPolygon, index2coordinate } from "./utils";

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
  canvas: Painting,
  offset: Coordinate,
  interval: number,
  maxPrice: number,
  thespace: Contract,
) => {
  //TODO: max gas fee

  const [ox, oy] = offset;

  const getPixelId = (paintingIdx: Index) => {
    const [x, y] = index2coordinate(paintingIdx, painting.width);
    return (y + oy - 1) * canvas.width + (x + ox);
  }
  const getColorCodeFromCanvas = (pixelId: number): number => {
    return color2cc(canvas.colors[pixelId-1])
  }
  const getColorCodeFromContract = async(pixelId: number): Promise<number> => {
    return (await thespace.getColor(pixelId)).toNumber();
  }

  for (const [i, step] of steps.entries()) {

    const pixelId = getPixelId(step);

    if (pixelId > canvas.width * canvas.height) {
      console.log('out of thespace map, skip');
      continue;
    }

    const [x, y] = index2coordinate(pixelId - 1, canvas.width).map((i) => i + 1)
    console.log('\n----------------------------------------------')    
    console.log(`painting pixelID ${pixelId} (${x}, ${y}) [${i+1} of ${steps.length}]`);

    const oldColorCode = getColorCodeFromCanvas(pixelId);
    const newColorCode = color2cc(painting.colors[step]);

    if (oldColorCode === newColorCode) {
      console.log('painted, skip');
      continue;
    }

    const price = await thespace.getPrice(pixelId);
    const p = Number(ethers.utils.formatEther(price));

    if (p > maxPrice) {
      console.log(`price ${p} too much, skip`);
      continue;
    }

    if ((await getColorCodeFromContract(pixelId)) === newColorCode) {
      // check color again
      console.log('painted, skip');
      continue;
    }
    //const feeData = await getFeeDataFromPolygon();
    console.log('painting...')
    const tx = await thespace.setPixel(pixelId, price, price, newColorCode);
    console.log({ tx });
    //const tr = await tx.wait();
    //console.log({ tr });
    await sleep(getRandomInt(interval * 1000 - 500, interval * 1000 + 500));
 }
};
