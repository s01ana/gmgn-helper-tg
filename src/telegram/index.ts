import TelegramBot from 'node-telegram-bot-api';
import { ethers } from 'ethers';
import { bscProvider } from '../config';
import { Targets } from '../schema/targets';
import { Setting } from '../schema/setting';
import { bot } from '../config';
import { Order } from '../schema/order';

const getMainUI = async (setting: any, chatId: number) => {

  let title;
  try {
    const signer = new ethers.Wallet(setting.key, bscProvider);
    const balance = await bscProvider.getBalance(signer.address);
    title = `👋Hi, <code>${setting.userName}</code>, Welcome to RonyX bot.\n\nUser ID: <code>${chatId}</code>\n\nYou can connect bot using user id in chrome extension.\n\n💵Wallet: ${balance.toString(4)} BNB\n<code>${signer.address}</code>\n`;
  } catch (error) {
    title = `👋Hi, <code>${setting.userName}</code>, Welcome to RonyX bot.\n\nUser ID: <code>${chatId}</code>\n\nYou can connect bot using user id in chrome extension.\n\n💵Wallet: NO Wallet. To set /wallet\n`;
  }

  // title += '\n🎯Target:\n';
  // const target = await Targets.findOne({ chatId });
  
  // if (target) {
  //   title += `<code>${target.target}</code>`;
  // } else {
  //   title += 'No target';
  // }

  const buttons = [
    [
      { text: `Dev sell rate: ${setting.devSellRate} %`, callback_data: `command_DevSell` },
      { text: `Buy amount: ${setting.buyAmount} BNB`, callback_data: `command_BuyAmount` }
    ],
    [
      { text: `Gas Fee: ${setting.fee} Gwei`, callback_data: `command_Fee` },
      { text: `Slippage: ${setting.slippage} %`, callback_data: `command_Slippage` }
    ],
    [
      { text: `Auto sell: ${setting.autoSell ? '✅' : '🚫'}`, callback_data: `command_AutoSell` },
      { text: `⏲️ Sell time: ${setting.sellTime} seconds later`, callback_data: `command_SellTime` }
    ]
  ]
  return { title, buttons };
}

async function switchMenu(chatId: TelegramBot.ChatId, messageId: number | undefined, title: string, json_buttons: any) {
  const keyboard = {
      inline_keyboard: json_buttons,
      resize_keyboard: true,
      one_time_keyboard: true,
      force_reply: true
  };

  try {
      await bot.editMessageText(title, { chat_id: chatId, message_id: messageId, reply_markup: keyboard, disable_web_page_preview: true, parse_mode: 'HTML' })
  } catch (error) {
      console.log(error)
  }
}

const initializeTelegramBot = () => {
  // Start commands
  bot.setMyCommands([
    { command: 'start', description: 'Start the bot' },
    { command: 'wallet', description: 'Show your wallet'},
    { command: 'orders', description: 'Show your orders'}
  ]);

  bot.onText(/\/start/, async (msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const userName = msg.chat.username;

    const setting = await Setting.findOne({ chatId });

    if (setting) {
      const ui = await getMainUI(setting, chatId);
      if (ui) {
        bot.sendMessage(chatId, ui.title, {
          reply_markup: {
            inline_keyboard: ui.buttons
          },
          parse_mode: 'HTML'
        })
      }
    } else {
      const feeData = await bscProvider.getFeeData();
      const gasPrice = feeData.gasPrice;
      const setting = {
        userName: userName || "",
        devSellRate: 30,
        buyAmount: 1,
        fee: Number(gasPrice?.toString()) / 10**9,
        autoSell: false,
        sellTime: 3,
        key: "",
        slippage: 10
      }

      const _setting = new Setting({chatId, ...setting})
      await _setting.save();

      const ui = await getMainUI(setting, chatId);
      if (ui) {
        bot.sendMessage(chatId, ui.title, {
          reply_markup: {
            inline_keyboard: ui.buttons
          },
          parse_mode: 'HTML'
        })
      }
    }
  });

  bot.onText(/\/wallet/, async (msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, "Please input private key of wallet");
    bot.once('message', async (newMsg: TelegramBot.Message) => {
      try {
        if (newMsg.text) {
          const signer = new ethers.Wallet(newMsg.text, bscProvider);
          const setting = await Setting.findOne({ chatId });
          if (!setting) {
            bot.sendMessage(chatId, "No setting data, Please restart bot. /start");
            return;
          }
          setting.key = newMsg.text;
          await setting.save();
          const ui = await getMainUI(setting, chatId);
          bot.sendMessage(chatId, ui.title, {
            reply_markup: {
              inline_keyboard: ui.buttons
            },
            parse_mode: 'HTML'
          })
        }
      } catch (error) {
        console.log(`${chatId} Invalid private key`);
        bot.sendMessage(chatId, "Invalid private key, Please try again");
        return;
      }
    })
  });

  bot.onText(/\/orders/, async (msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;
    const orders = await Order.find({ chatId });
    let message = '';
    for (let i = 0; i < orders.length; i++) {
      // message += `Order ${i + 1}: ${orders[i].tokenAddress} ${orders[i].devAddress} ${orders[i].orderType} ${orders[i].tokenName} ${orders[i].tokenSymbol} ${orders[i].creatorAmount}\n`;
      message += `Order ${i + 1}: \n`;
      message += `Token: ${orders[i].tokenName} (${orders[i].tokenSymbol})\n`;
      message += `CA: <code>${orders[i].tokenAddress}</code>\n`;
      message += `Order Type: ${orders[i].orderType === "devSell" ? "DEV SELL" : "LAST SELL"}\n\n`;
    }
    if (message === '') {
      message = 'No orders';
    }
    bot.sendMessage(chatId, message, {
      parse_mode: 'HTML'
    });
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message!.chat.id;
    const messageId = query.message!.message_id;
    const data = query.data;

    console.log(`callback query ${chatId}, callback data: ${data}`);

    if (!data)
      return;

    if (data === "command_DevSell") {
      bot.sendMessage(chatId, 'Please input dev sell rate');
      bot.once('message', async (newMsg) => {
        try {
          const devSellRate = Number(newMsg.text);
          if (devSellRate < 0 || devSellRate > 100) {
            console.log(`${chatId} invalid dev sell rate input : ${devSellRate} `);
            bot.sendMessage(chatId, `Invalid value. Please input correct value`);
            return;
          }
          console.log(`${chatId} dev sell rate input ${devSellRate} %`);
          const setting = await Setting.findOne({ chatId });
          if (setting) {
            setting.devSellRate = devSellRate;
            await setting.save();
            const ui = await getMainUI(setting, chatId);
            switchMenu(chatId, messageId, ui.title, ui.buttons);
          }
        } catch (error) {
          console.log(`${chatId}, invalid dev sell rate`);
          bot.sendMessage(chatId, `Invalid number. Please input correct number`);
          return;
        }
      })
    } else if (data === "command_BuyAmount") {
        bot.sendMessage(chatId, 'Please input buy amount in BNB');
        bot.once('message', async (newMsg) => {
          console.log(`${chatId}, buy BNB amount input: ${newMsg.text}`);
          try {
            const buyAmount = Number(newMsg.text);
            if (buyAmount < 0) {
              bot.sendMessage(chatId, 'Invalid value, Please input correct value');
              return;
            }
            const setting = await Setting.findOne({ chatId });
            if (!setting) {
              bot.sendMessage(chatId, 'No setting data, Please restart bot. /start');
              return;
            }
            setting.buyAmount = buyAmount;
            await setting.save();
            const ui = await getMainUI(setting, chatId);
            switchMenu(chatId, messageId, ui.title, ui.buttons);
          } catch (error) {
            console.log(`${chatId}, Invalid number`);
            bot.sendMessage(chatId, `Invalid number, Please input correct number`);
          }
        })
    } else if (data === "command_Fee") {
        const feeData = await bscProvider.getFeeData();
        const gasPrice = feeData.gasPrice;
        bot.sendMessage(chatId, `Please input fee in Gwei\nWe recommend to use ${Number(gasPrice?.toString()) / 10**9} Gwei`);
        bot.once('message', async (newMsg) => {
          console.log(`${chatId}, fee amount input: ${newMsg.text}`);
          try {
            const fee = Number(newMsg.text);
            if (fee < 0) {
              bot.sendMessage(chatId, 'Invalid value, Please input correct value');
              return;
            }
            const setting = await Setting.findOne({ chatId });
            if (!setting) {
              bot.sendMessage(chatId, 'No setting data, Please restart bot. /start');
              return;
            }
            setting.fee = fee;
            await setting.save();
            const ui = await getMainUI(setting, chatId);
            switchMenu(chatId, messageId, ui.title, ui.buttons);
          } catch (error) {
            console.log(`${chatId}, Invalid number`);
            bot.sendMessage(chatId, `Invalid number, Please input correct number`);
          }
        })
    } else if (data === "command_Slippage") {
        bot.sendMessage(chatId, 'Please input slippage %');
        bot.once('message', async (newMsg) => {
          console.log(`${chatId}, slippage input: ${newMsg.text}`);
          try {
            const slippage = Number(newMsg.text);
            if (slippage < 0 || slippage > 100) {
              bot.sendMessage(chatId, 'Invalid value, Please input correct value');
              return;
            }
            const setting = await Setting.findOne({ chatId });
            if (!setting) {
              bot.sendMessage(chatId, 'No setting data, Please restart bot. /start');
              return;
            }
            setting.slippage = slippage;
            await setting.save();
            const ui = await getMainUI(setting, chatId);
            switchMenu(chatId, messageId, ui.title, ui.buttons);
          } catch (error) {
            console.log(`${chatId}, Invalid number`);
            bot.sendMessage(chatId, `Invalid number, Please input correct number`);
          }
        })
    } else if (data === "command_SellTime") {
        bot.sendMessage(chatId, 'Please input sell time in seconds. (>1s)');
        bot.once('message', async (newMsg) => {
          console.log(`${chatId}, sell time input: ${newMsg.text}`);
          try {
            const sellTime = Number(newMsg.text);
            if (sellTime < 1) {
              bot.sendMessage(chatId, 'Invalid value, Please input sell time (>1s)');
              return;
            }
            const setting = await Setting.findOne({ chatId });
            if (!setting) {
              bot.sendMessage(chatId, 'No setting data, Please restart bot. /start');
              return;
            }
            setting.sellTime = sellTime;
            await setting.save();
            const ui = await getMainUI(setting, chatId);
            switchMenu(chatId, messageId, ui.title, ui.buttons);
          } catch (error) {
            console.log(`${chatId}, Invalid number`);
            bot.sendMessage(chatId, `Invalid number, Please input correct number`);
          }
        })
    } else if (data === "command_AutoSell") {
        const setting = await Setting.findOne({ chatId });
        if (!setting) {
          bot.sendMessage(chatId, 'No setting data, Please restart bot. /start');
          return;
        }
        setting.autoSell = !setting.autoSell
        await setting.save();
        const ui = await getMainUI(setting, chatId);
        switchMenu(chatId, messageId, ui.title, ui.buttons);
    }
  });
}

export default initializeTelegramBot;