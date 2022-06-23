import type { Painting } from "./painting";
import type { Coordinate, Index } from "./utils";
import type { TheSpace } from "./thespace";

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
  offset: Coordinate,
  interval: number,
  maxPrice: number,
  maxGasPrice: number,
  thespace: TheSpace,
) => {
  //TODO: max gas fee

  const canvas = thespace.getCanvas();
  const [ox, oy] = offset;

  const getPixelId = (paintingIdx: Index) => {
    const [x, y] = index2coordinate(paintingIdx, painting.width);
    return (y + oy - 1) * canvas.width + (x + ox);
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

    const oldColorCode = thespace.getPixelColorCode(pixelId);
    const newColorCode = color2cc(painting.colors[step]);

    if (oldColorCode === newColorCode) {
      console.log('painted, skip');
      continue;
    }

    const price = await thespace.getPrice(pixelId);

    if (price > maxPrice) {
      console.log(`price ${price} too much, skip`);
      continue;
    }

    const feeData = await getFeeDataFromPolygon();
    console.log('painting...')
    const tx = await thespace.setPixel(pixelId, price, price, newColorCode, feeData);
    console.log({ tx });
    //const tr = await tx.wait();
    //console.log({ tr });
    await sleep(getRandomInt(interval * 1000 - 500, interval * 1000 + 500));
 }
};
