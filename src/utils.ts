import { ethers } from "ethers";
import axios from "axios";

export type Index = number;
export type Coordinate = [number, number];

// 0-base index
export const index2coordinate = (idx: Index, width: number): Coordinate => {
  return [idx % width, Math.floor(idx / width)];
}

// 0-base index
export const coordinate2index = (coord: Coordinate, width: number): Index => {
  return coord[1] * width + coord[0];
}

export const getFeeDataFromPolygon = async () => {
  let maxFeePerGas, maxPriorityFeePerGas;
  try {
    const { data } = await axios({
      method: "get",
      url: "https://gasstation-mainnet.matic.network/v2",
    });
    maxFeePerGas = ethers.utils.parseUnits(
      Math.ceil(data.fast.maxFee) + "",
      "gwei"
    );
    maxPriorityFeePerGas = ethers.utils.parseUnits(
      Math.ceil(data.fast.maxPriorityFee) + "",
      "gwei"
    );
  } catch (err) {
    throw err;
  }
  return {
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
};

export const hash = (str: string): string => {
  return _hash(str).toString(32).slice(1)
};

const _hash = (str: string): number => {
    var hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
          chr   = str.charCodeAt(i);
          hash  = ((hash << 5) - hash) + chr;
          hash |= 0; // Convert to 32bit integer
        }
    return hash;
};
