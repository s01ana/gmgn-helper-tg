import { Schema, model, Document } from 'mongoose';

interface ITarget extends Document {
    chatId: number;
    target: string;
    subscriptionId: number;
}

const schema: Schema = new Schema({
    chatId: { type: Number },
    target: { type: String },
    subscriptionId: { type: Number }
});

export const Targets = model<ITarget>('Targets', schema);