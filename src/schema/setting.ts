import { Schema, model, Document } from 'mongoose';

export interface ISetting extends Document {
    chatId: number;
    userName: string;
    devSellRate: number;
    buyAmount: number;
    fee: number;
    autoSell: boolean;
    sellTime: number;
    key: string;
    slippage: number;
}

const schema: Schema = new Schema({
    chatId: { type: Number },
    userName: { type: String },
    devSellRate: { type: Number },
    buyAmount: { type: Number },
    fee: { type: Number },
    autoSell: { type: Boolean },
    sellTime: { type: Number },
    key: { type: String },
    slippage: { type: Number },
});

export const Setting = model<ISetting>('Setting', schema);