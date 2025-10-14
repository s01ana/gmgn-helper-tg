import { Schema, model, Document } from 'mongoose';

interface ISubscription extends Document {
    tokenAddress: string;
    devAddress: string;
}

const schema: Schema = new Schema({
    tokenAddress: { type: String },
    devAddress: { type: String }
});

export const Subscription = model<ISubscription>('Subscription', schema);