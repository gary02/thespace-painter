import { ethers } from "ethers";
import axios from "axios";

export const getFeeDataFromPolygon = async () => {
  const defaultGasFee = ethers.BigNumber.from(30000000000);
  let maxFeePerGas, maxPriorityFeePerGas, gasPrice;
  try {
    const { data } = await axios({
      method: "get",
      url: "https://gasstation-mainnet.matic.network/v2",
    });
    maxFeePerGas = ethers.utils.parseUnits(
      Math.ceil(data.safeLow.maxFee) + "",
      "gwei"
    );
    maxPriorityFeePerGas = ethers.utils.parseUnits(
      Math.ceil(data.safeLow.maxPriorityFee) + "",
      "gwei"
    );
    gasPrice = null;
  } catch (err) {
    console.warn(err);
    maxFeePerGas = defaultGasFee;
    maxPriorityFeePerGas = defaultGasFee;
    gasPrice = defaultGasFee;
  }
  return {
    maxFeePerGas,
    maxPriorityFeePerGas,
    gasPrice,
  };
};
