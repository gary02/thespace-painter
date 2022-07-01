import type { Painting } from "./painting";
import type { Coordinate, Index } from "./utils";
import type { TheSpace } from "./thespace";

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
  offset: Coordinate,
  interval: number,
  maxPrice: number,
  maxGasPrice: number,
  thespace: TheSpace,
) => {
  let catchErrorTime = 0

  const canvas = thespace.getCanvas();
  const [ox, oy] = offset;

  const getPixelId = (paintingIdx: Index) => {
    const [x, y] = index2coordinate(paintingIdx, painting.width);
    return (y + oy - 1) * canvas.width + (x + ox);
  }

  const transaction = async (index: number, step: number, checking: boolean = false) => {
    const pixelId = getPixelId(step);

    if (pixelId > canvas.width * canvas.height) {
      console.log("out of thespace map, skip");
      return;
    }

    const [x, y] = index2coordinate(pixelId - 1, canvas.width).map(
      (i) => i + 1
    );
    if (!checking) {
        console.log("\n----------------------------------------------");
        console.log(
          `painting pixelID ${pixelId} (${x}, ${y}) [${index + 1} of ${
            steps.length
          }]`
        );
    }

    const oldColorCode = thespace.getPixelColorCode(pixelId);
    const newColorCode = color2cc(painting.colors[step]);

    if (oldColorCode === newColorCode) {
        if (!checking) {
            console.log("painted, skip");
        }      
      return;
    }

    const price = await thespace.getPrice(pixelId);

    if (price > maxPrice) {
      console.log(`price ${price} too much, skip`);
      return;
    }

    const feeData = await getFeeDataFromPolygon();
    const gasPrice = Number(ethers.utils.formatUnits(feeData.maxFeePerGas,'gwei'));

    console.log({gasPrice});
    if (gasPrice > maxGasPrice) {
      console.log(`gas price ${gasPrice} gwei too much, skip`);
      return;
    }

    if (checking) {
        console.log("repainting...");
    } else {
        console.log("painting...");
    }
    
    try {
        const tx = await thespace.setPixel(
          pixelId,
          price,
          price,
          newColorCode,
          feeData
        );
        console.log({ tx });
        await tx.wait()
    } catch (error: any) {
        console.error(error);
        catchErrorTime += 1;
        if (error?.code === "UNPREDICTABLE_GAS_LIMIT") {
          console.log(`Not enough Matic!!!!!`);
          process.exit(1);
        }
    }    
    //const tr = await tx.wait();
    //console.log({ tr });
    console.log(`Transaction fail ${catchErrorTime} times.`);
    await sleep(getRandomInt(interval * 1000 * 0.5, interval * 1000 * 1.2));
  }

  const checkInterval = 60 * 1000;
  let lastTick = Date.now();
  const checkPrevPiexl = async (index: number) => {
    if (Date.now() - lastTick < checkInterval) return;

    console.log("\n--------Time to Check Prev Pixel.------");
    for (let j = 0; j < index - 10; j++) {
      const prevStep = steps[j];
      await transaction(j, prevStep, true);
    }
    lastTick = Date.now();
    console.log("--------Check End!------\n");
  };
  
  for (const [i, step] of steps.entries()) {
    await checkPrevPiexl(i);
    await transaction(i, step);
  }
};
