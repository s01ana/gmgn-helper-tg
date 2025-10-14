import { ethers } from "ethers";
import buyToken from "./buy";
import { bot, bscProvider } from "./config";
import { SubscriptionsCache } from "./context";
import { Order } from "./schema/order";
import { SellOrder } from "./schema/sellOrder";
import { Setting } from "./schema/setting";
import { Subscription } from "./schema/subscription";
import ERC20ABI from "./abi/erc20";

const createOrder = async (data: any) => {
  try {
    const chatId = Number(data.userId);
    const tokenAddress = data.tokenAddress;
    const devAddress = data.creator;
    const orderType = data.orderType;

    const tokenName = data.name;
    const tokenSymbol = data.symbol;

    const creatorAmount = data.creatorBalance;

    // check user
    const setting = await Setting.findOne({ chatId });
    if (!setting) {
      console.log(`[CreateOrder]: Not user chatId ${chatId}`);
      return { status: false, message: 'No registered user' };
    }

    if (orderType === "devSell" || orderType === "lastSell") {
      let type = orderType === "devSell" ? "Dev Sell" : "Last Sell";
      let order = await Order.findOne({
        chatId,
        tokenAddress
      })

      if (order) {
        bot.sendMessage(chatId, `⚠️ (${type}) Order already exists for ${tokenSymbol} ( ${tokenName} )\nCA: <code>${tokenAddress}</code>`, { parse_mode: "HTML" });
        return { status: false, message: 'Order is already created' };
      }

      // save order
      order = new Order({
        chatId: chatId,
        tokenAddress,
        devAddress,
        orderType,
        tokenName,
        tokenSymbol,
        creatorAmount
      });

      await order.save();

      let subscription = await Subscription.findOne({
        tokenAddress,
        devAddress
      });

      if (!subscription) {
        subscription = new Subscription({
          tokenAddress,
          devAddress
        });

        await subscription.save();

        SubscriptionsCache.push({
          tokenAddress,
          devAddress
        })
      }

      bot.sendMessage(chatId, `✅ New Order (${type}) is created for ${tokenSymbol} ( ${tokenName} )\nCA: <code>${tokenAddress}</code>`, { parse_mode: "HTML" });

      return { status: true, message: 'Order is successfully created.' };
    } else if (orderType === "cancel") {
      let orders = await Order.find({
        chatId,
        tokenAddress
      })

      if (orders.length == 0) {
        bot.sendMessage(chatId, `⚠️ Any Order doesn't exist for ${tokenSymbol} ( ${tokenName} )\nCA: <code>${tokenAddress}</code>`, { parse_mode: "HTML" });

        return { status: false, message: 'Order not existed' };
      }

      await Order.deleteMany({
        chatId,
        tokenAddress,
        devAddress,
        tokenName,
        tokenSymbol
      });

      const similarOrders = await Order.find({ tokenAddress, devAddress });
      if (similarOrders.length == 0) {
        await Subscription.deleteOne({ tokenAddress, devAddress });
        SubscriptionsCache.splice(SubscriptionsCache.findIndex(subscription => subscription.tokenAddress === tokenAddress && subscription.devAddress === devAddress), 1);
      }

      bot.sendMessage(chatId, `❌ All Orders cancelled for ${tokenSymbol} ( ${tokenName} )\nCA: <code>${tokenAddress}</code>`, { parse_mode: "HTML" });

      return { status: true, message: 'Order is successfully cancelled.' };
    }
  } catch (err) {
    console.error('[CreateOrder]: ', err);
    return { status: false, message: 'Server unexpected error.' };
  }
}

export const handleOrders = async (subscription: any) => {
  // const creatorBalance = await bscProvider.getBalance(subscription.devAddress);
  const tokenContract = new ethers.Contract(subscription.tokenAddress, ERC20ABI, bscProvider);
  const creatorBalance = await tokenContract.balanceOf(subscription.devAddress);

  const orders = await Order.find({
    tokenAddress: subscription.tokenAddress,
    devAddress: subscription.devAddress
  })

  if (orders.length == 0) {
    console.info('[HandleOrders]: no orders');
    return;
  }

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const setting = await Setting.findOne({ chatId: order.chatId });

    if (!setting) {
      console.info(`[HandleOrders]: no setting, user: ${order.chatId}`);
      continue;
    }

    if (!setting.key) {
      console.info(`[HandleOrders]: no key, user: ${setting.userName}`);
      continue;
    }

    if (order.orderType === "devSell") {
      if (creatorBalance >= BigInt(order.creatorAmount *10**18)) {
        console.info(`[HandleOrders]: creatorBalance >= order.creatorAmount, user: ${order.chatId}`);
        continue;
      } else {
        const amount = BigInt(order.creatorAmount * 10**18) - creatorBalance;
        if (amount > BigInt(order.creatorAmount * setting.devSellRate / 100 * 10**18)) {
          // buy token
          const tx = await buyToken(setting.key, subscription.tokenAddress, setting.buyAmount);

          if (!tx) {
            console.error(`[HandleOrders]: buyToken error, user: ${setting.userName}`);
            continue;
          }

          bot.sendMessage(
            order.chatId, 
            `📈 Bought ${setting.buyAmount} ${order.tokenName} (${order.tokenSymbol}) successfully\nCA: <code>${order.tokenAddress}</code>\n` +
            `<a href="https://bscscan.com/tx/${tx.hash}">View on BscScan</a>`, 
            { parse_mode: "HTML" }
          );

          if (setting.autoSell) {
            let sellOrder = await SellOrder.findOne({ chatId: order.chatId, tokenAddress: subscription.tokenAddress });
            if (!sellOrder) {
              sellOrder = new SellOrder({
                chatId: order.chatId,
                tokenAddress: subscription.tokenAddress,
                sellSeconds: Math.floor(Date.now() / 1000) + setting.sellTime,
                tokenName: order.tokenName,
                tokenSymbol: order.tokenSymbol
              });
              await sellOrder.save();
            }
          }

          await Order.deleteOne({ _id: order._id });
          const similarOrders = await Order.find({ tokenAddress: subscription.tokenAddress, devAddress: subscription.devAddress });
          if (similarOrders.length == 0) {
            await Subscription.deleteOne({ 
              tokenAddress: subscription.tokenAddress, 
              devAddress: subscription.devAddress 
            });
            SubscriptionsCache.splice(SubscriptionsCache.findIndex(
              subscription => 
                subscription.tokenAddress === subscription.tokenAddress && 
                subscription.devAddress === subscription.devAddress
            ), 1);
          }
        }
      }
    } else if (order.orderType === "lastSell") {
      if (creatorBalance >= BigInt(order.creatorAmount * 10**18)) {
        console.info(`[HandleOrders]: creatorBalance >= order.creatorAmount, user: ${order.chatId}`);
        continue;
      } else {
        if (creatorBalance === BigInt(0)) {
          // buy token
          const tx = await buyToken(setting.key, subscription.tokenAddress, setting.buyAmount);

          if (!tx) {
            console.error(`[HandleOrders]: buyToken error, user: ${setting.userName}`);
            continue;
          }

          bot.sendMessage(
            order.chatId, 
            `📈 Bought ${setting.buyAmount} ${order.tokenName} (${order.tokenSymbol}) successfully\nCA: <code>${order.tokenAddress}</code>\n` +
            `<a href="https://bscscan.com/tx/${tx.hash}">View on BscScan</a>`, 
            { parse_mode: "HTML" }
          );

          if (setting.autoSell) {
            let sellOrder = await SellOrder.findOne({ chatId: order.chatId, tokenAddress: subscription.tokenAddress });
            if (!sellOrder) {
              sellOrder = new SellOrder({
                chatId: order.chatId,
                tokenAddress: subscription.tokenAddress,
                sellSeconds: Math.floor(Date.now() / 1000) + setting.sellTime,
                tokenName: order.tokenName,
                tokenSymbol: order.tokenSymbol
              });
              await sellOrder.save();
            }
          }

          await Order.deleteOne({ _id: order._id });
          const similarOrders = await Order.find({ tokenAddress: subscription.tokenAddress, devAddress: subscription.devAddress });
          if (similarOrders.length == 0) {
            await Subscription.deleteOne({ 
              tokenAddress: subscription.tokenAddress, 
              devAddress: subscription.devAddress 
            });
            SubscriptionsCache.splice(SubscriptionsCache.findIndex(
              subscription => 
                subscription.tokenAddress === subscription.tokenAddress && 
                subscription.devAddress === subscription.devAddress
            ), 1);
          }
        }
      }
    }
  }
}

export default createOrder;