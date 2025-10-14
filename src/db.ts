import mongoose from 'mongoose';
import { DATABASE_URL } from './config';
import { Subscription } from './schema/subscription';
import { SubscriptionsCache } from './context';

export const connect_database = async () => {
  try {
    await mongoose.connect(DATABASE_URL);
    console.info('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

export const sync_database = async () => {
  const subscriptions = await Subscription.find({});
  if (subscriptions.length > 0) {
    for (let i = 0; i < subscriptions.length; i++) {
      SubscriptionsCache.push({
        tokenAddress: subscriptions[i].tokenAddress,
        devAddress: subscriptions[i].devAddress
      });
    }
  }
}