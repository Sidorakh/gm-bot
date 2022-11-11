import { tomorrow } from '@/misc/node-utils.js';
import { Snowflake } from 'discord.js';
import { Sequelize } from 'sequelize';
import { Birthday, createBirthdayModel } from './models/birthday.js';
import { RoleDistributorReactMessage, createRoleDistributorReactMessageModel } from './models/role-distributor-react.js';
import { HelpChannelData, createHelpChannelModel } from './models/help-channel.js';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'gmbot-db.sqlite',
  logging: false
});

export async function auth() {
  await sequelize.authenticate().catch(() => process.exit(1));
  await createBirthdayModel(sequelize);
  await createRoleDistributorReactMessageModel(sequelize);
  await createHelpChannelModel(sequelize);
  await sequelize.sync();
}

export const db = {
  roleDistributorReactMessage: {
    create: async (messageId: string) => {
      const [ message, created ] = await RoleDistributorReactMessage.findOrCreate({
        where: { messageId },
        defaults: { messageId }
      });

      const savedMessage = await message.save();

      return {
        message: savedMessage,
        created
      };
    },

    exists: async (messageId: string) => {
      const message = await RoleDistributorReactMessage.findOne({ where: { messageId } });
      return !!message;
    }
  },
  birthday: {
    create: async (userId: Snowflake) => {
      const [ birthday, created ] = await Birthday.findOrCreate({
        where: { userId },
        defaults: { userId }
      });

      birthday.set({
        removalTimestamp: tomorrow(),
        birthday: Date.now()
      });

      const savedBirthday = await birthday.save();

      return {
        birthday: savedBirthday,
        created
      };
    },

    getAllPendingRemoval: async () => {
      return await Birthday.findAll({ where: { needsRemoval: true } });
    },

    getAllNotPendingRemoval: async () => {
      return await Birthday.findAll({ where: { needsRemoval: false } });
    },

    markAsRemoved: async (userId: Snowflake) => {
      const birthday = await Birthday.findOne({ where: { userId } });
      if (birthday) {
        birthday.needsRemoval = false;
        await birthday.save();
      }
    }
  },
  helpChannel: {
    createOrUpdate: async (channelId: Snowflake, busyTimestamp: Date) => {
      const [ helpChannelData, created ] = await HelpChannelData.findOrCreate({
        where: { channelId },
        defaults: {
          channelId,
          busyTimestamp
        }
      });

      helpChannelData.set({ busyTimestamp });
      const savedHelpChannelData = await helpChannelData.save();

      return {
        helpChannelData: savedHelpChannelData,
        created
      };
    },

    getBusyTimestampForChannel: async (channelId: Snowflake) => {
      const result = await HelpChannelData.findOne({ where: { channelId } });
      if (result) {
        return new Date(result.busyTimestamp);
      } else {
        return new Date(0);
      }
    }
  }
};
