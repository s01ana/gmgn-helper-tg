import { ethers } from "ethers";
import TelegramBot from "node-telegram-bot-api";
import * as dotenv from 'dotenv';

dotenv.config();

export const BSC_RPC_URL = process.env.BSC_RPC_URL as string;

export const bscProvider = new ethers.WebSocketProvider(BSC_RPC_URL);

export const DATABASE_URL = process.env.DATABASE_URL as string;

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN as string;

export const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

export const V3_CONTRACT_ADDRESS = "0xF251F83e40a78868FcfA3FA4599Dad6494E46034";
export const V2_CONTRACT_ADDRESS = "0x5c952063c7fc8610FFDB798152D69F0B9550762b";

export const V3_ABI = [
  "function getTokenInfo(address token) view returns (uint256 version, address tokenManager, address quote, uint256 lastPrice, uint256 tradingFeeRate, uint256 minTradingFee, uint256 launchTime, uint256 offers, uint256 maxOffers, uint256 funds, uint256 maxFunds, bool liquidityAdded)"
];

export const V2_ABI = [
  "function sellToken(address token, uint256 amount)",
  "function buyTokenAMAP(address token, uint256 funds, uint256 minAmount) payable",
  "function sellToken(address token, uint256 amount)"
]

export const v3Contract = new ethers.Contract(V3_CONTRACT_ADDRESS, V3_ABI, bscProvider);
export const v2Contract = new ethers.Contract(V2_CONTRACT_ADDRESS, V2_ABI, bscProvider);