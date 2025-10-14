import { ethers } from "ethers";
import { V2_CONTRACT_ADDRESS, bscProvider } from "./config";
import { SubscriptionsCache } from "./context";
import { handleOrders } from "./order";

const filter = {
  address: V2_CONTRACT_ADDRESS,
  topics: ['0x0a5575b3648bae2210cee56bf33254cc1ddfbc7bf637c0af2ac18b14fb1bae19']
}

function startListener() {
  bscProvider.on(filter, (log) => {
    try {
      const abiCoder = new ethers.AbiCoder();
      const decodedLog = abiCoder.decode(['address', 'address', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'], log.data);
      
      const tokenAddress = decodedLog.at(0);
      const devAddress = decodedLog.at(1);

      const subscription = SubscriptionsCache.find(
        subscription => subscription.tokenAddress.toLowerCase() === tokenAddress.toLowerCase() && 
        subscription.devAddress.toLowerCase() === devAddress.toLowerCase()
      );
      if (subscription) {
        console.log('[Listener]: Listened dev sell event for ', subscription.tokenAddress);
        handleOrders(subscription);
      }
    } catch (error) {
      console.error('[Listener]: ', error);
    }
  })
}

export default startListener;