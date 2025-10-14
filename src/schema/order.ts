import { Schema, model, Document } from 'mongoose';

interface IOrder extends Document {
    chatId: number;
    tokenAddress: string;
    devAddress: string;
    orderType: string;
    tokenName: string;
    tokenSymbol: string;
    creatorAmount: number;
}

const schema: Schema = new Schema({
    chatId: { type: Number },
    tokenAddress: { type: String },
    devAddress: { type: String },
    orderType: { type: String },
    tokenName: { type: String },
    tokenSymbol: { type: String },
    creatorAmount: { type: Number },
});

export const Order = model<IOrder>('Order', schema);