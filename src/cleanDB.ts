import { ethers } from "ethers";
import { Subscription } from "./schema/subscription";
import ERC20ABI from "./abi/erc20";
import { bscProvider } from "./config";
import { Order } from "./schema/order";
import { SubscriptionsCache } from "./context";

const cleanDB = () => {
  setInterval(async () => {
    const subscriptions = await Subscription.find({});
    console.info(`[CleanDB]: subscriptions length: ${subscriptions.length}`);
    if (subscriptions.length) {
      for (let i = 0; i < subscriptions.length; i++) {
        const devAddress = subscriptions[i].devAddress;
        const tokenAddress = subscriptions[i].tokenAddress;

        const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, bscProvider);
        const balance = await tokenContract.balanceOf(devAddress);

        if (balance && balance > 1000000000000000000n) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        console.info(`[CleanDB]: devBalance is 0, so remove order ${tokenAddress}`);

        await Subscription.deleteOne({ _id: subscriptions[i]._id });
        SubscriptionsCache.splice(SubscriptionsCache.findIndex(subscription => subscription.tokenAddress === tokenAddress && subscription.devAddress === devAddress), 1);

        await Order.deleteMany({ tokenAddress: tokenAddress, devAddress: devAddress });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }, 60000);
}

export default cleanDB