import type { Event, Contract } from "ethers";

import { ethers } from "ethers";

const RGBS = [
  0x000000, 0xffffff, 0xd4d7d9, 0x898d90, 0x784102, 0xd26500, 0xff8a00,
  0xffde2f, 0x159800, 0x8de763, 0x58eaf4, 0x059df2, 0x034cba, 0x9503c9,
  0xd90041, 0xff9fab,
];

export const paint = async(painting: {colors: number[] ; height: number ;  width: number}, thespace: Contract) => {
  const tokenId = 1;
  const bidPrice = ethers.BigNumber.from('1000000000000000000');
  const newPrice = ethers.BigNumber.from('1000000000000000000');
  const color = 1;

  const tx = await thespace.setPixel(tokenId, bidPrice, newPrice, color)
  await tx.wait();
}
