import { Schema, model, Document } from 'mongoose';

interface ISellOrder extends Document {
    chatId: number;
    tokenAddress: string;
    sellSeconds: number;
    tokenName: string;
    tokenSymbol: string;
}

const schema: Schema = new Schema({
    chatId: { type: Number },
    tokenAddress: { type: String },
    sellSeconds: { type: Number },
    tokenName: { type: String },
    tokenSymbol: { type: String },
});

export const SellOrder = model<ISellOrder>('SellOrder', schema);