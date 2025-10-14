import { ethers } from "ethers";
import { SellOrder } from "./schema/sellOrder";
import { V2_ABI, V2_CONTRACT_ADDRESS, bot, bscProvider } from "./config";
import ERC20_ABI from "./abi/erc20";
import { Setting } from "./schema/setting";

const sellToken = async (privateKey: string, sellOrder: any) => {
  let tx = null;
  try {
    const wallet = new ethers.Wallet(privateKey, bscProvider);
    const v2Contract = new ethers.Contract(V2_CONTRACT_ADDRESS, V2_ABI, wallet);
    const tokenContract = new ethers.Contract(sellOrder.tokenAddress, ERC20_ABI, wallet);
    const balance = await tokenContract.balanceOf(wallet.address);

    if (balance.toString() === '0') {
      console.error(`[SellToken]: balance is 0, sellOrder: ${wallet.address} ${sellOrder.tokenAddress}`);
      return null;
    }

    // tx = await tokenContract.approve(V2_CONTRACT_ADDRESS, balance);
    // await tx.wait();

    tx = await v2Contract.sellToken(sellOrder.tokenAddress, balance);
    await tx.wait();
    bot.sendMessage(
      sellOrder.chatId, 
      `📉 Sold ${(balance / BigInt(10 ** 18)).toString()} ${sellOrder.tokenName} (${sellOrder.tokenSymbol}) successfully\nCA: <code>${sellOrder.tokenAddress}</code>\n` +
      `<a href="https://bscscan.com/tx/${tx.hash}">View on BscScan</a>`, 
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error(`[SellToken]: sellOrder: ${sellOrder.tokenAddress} ${error}`);
  }
  return tx;
}

const handleSell = async (sellOrder: any) => {
  try {
    const setting = await Setting.findOne({ chatId: sellOrder.chatId });
    if (!setting) {
      console.error(`[HandleSell]: setting not found, sellOrder: ${sellOrder.chatId} ${sellOrder.tokenAddress}`);
      return;
    }
    const tx = await sellToken(setting.key, sellOrder);
    if (!tx) {
      console.error(`[HandleSell]: transaction failed, sellOrder: ${sellOrder.chatId} ${sellOrder.tokenAddress}`);
      return;
    }
    await SellOrder.deleteOne({ _id: sellOrder._id });
  } catch (error) {
    console.error(`[HandleSell]: error, sellOrder: ${sellOrder.chatId} ${sellOrder.tokenAddress} ${error}`);
  }
}

const handleSellCron = async () => {
  while (true) {
    const sellOrders = await SellOrder.find({ sellSeconds: { $lte: Math.floor(Date.now() / 1000) - 0.5 } });
    if (sellOrders.length > 0) {
      console.info(`[HandleSellCron]: sell orders length: ${sellOrders.length}`);
      await Promise.all(sellOrders.map(handleSell));
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

export default handleSellCron;