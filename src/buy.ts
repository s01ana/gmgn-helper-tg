import { ethers } from "ethers"
import { bscProvider, V2_ABI, V2_CONTRACT_ADDRESS, V3_ABI, v3Contract } from "./config"
import ERC20_ABI from "./abi/erc20";

const buyToken = async (privateKey: string, tokenAddress: string, amount: number, gas?: number) => {
  const wallet = new ethers.Wallet(privateKey, bscProvider);

  const v2Contract = new ethers.Contract(V2_CONTRACT_ADDRESS, V2_ABI, wallet);
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

  // const tokenInfo = await v3Contract.getTokenInfo(tokenAddress);
  let tx = null;

  try {
    const feeData = await bscProvider.getFeeData();
    const gasPrice = feeData.maxFeePerGas;

    tx = await v2Contract.buyTokenAMAP(
      tokenAddress,
      amount * 10**18,
      0,
      { value: amount * 10 ** 18, gasPrice: gasPrice }
    )
  
    await tx.wait();
    await tokenContract.approve(V2_CONTRACT_ADDRESS, BigInt(10 ** 27));
  } catch (error) {
    console.log(`[BuyToken]: ${error}`);
  }

  return tx;
}

export default buyToken;