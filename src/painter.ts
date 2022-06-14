import type { Event, Contract } from "ethers";

import { ethers } from "ethers";

const RGBS = [
  0x000000, 0xffffff, 0xd4d7d9, 0x898d90, 0x784102, 0xd26500, 0xff8a00,
  0xffde2f, 0x159800, 0x8de763, 0x58eaf4, 0x059df2, 0x034cba, 0x9503c9,
  0xd90041, 0xff9fab,
];

function rgb2cc(rgb: number) {
  return RGBS.indexOf(rgb);
}

export const paint = async(painting: {colors: number[] ; alphas: number[]; height: number ;  width: number}, thespace: Contract) => {
    // , x: number, y: number, maxPrice: number  
  const x = 400
  const y = 480
  const maxPrice = 20
  const needPaint = (value: number) => value === 255
  const pixelsOfRow = 1000;
  let index = 0;
  for (let rgb of painting.colors) {
    if (needPaint(painting.alphas[index])) {
      const pixelX = index % painting.width;
      const pixelY = Math.floor(index / painting.width);
      const tokenId = (y + pixelY - 1) * pixelsOfRow + (x + pixelX);
      const bidPrice = ethers.BigNumber.from("1000000000000000000");
      const newPrice = ethers.BigNumber.from("1000000000000000000");
      const color = rgb2cc(rgb) + 1;
      console.log({ index, x: x + pixelX, y: y + pixelY, color });
      const price = await thespace.getPrice(tokenId);
      const p = Number(ethers.utils.formatEther(price));
      if (p <= maxPrice) {
        const tx = await thespace.setPixel(tokenId, bidPrice, newPrice, color);
        console.log({tx})
        // await tx.wait();
      }
    }
    
    index += 1
  }
  
}
