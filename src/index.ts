import { connect_database, sync_database } from "./db";
import initializeTelegramBot from "./telegram";
import initServer from "./server";
import startListener from "./listener";
import handleSellCron from "./sell";
import cleanDB from "./cleanDB";

const main = async () => {
  await connect_database();
  await sync_database();
  initializeTelegramBot();
  initServer();
  startListener();
  handleSellCron();
  cleanDB();
}

main();