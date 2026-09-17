import mongoose, { Schema, Document } from 'mongoose';

export enum Permission {
  READ_SELF_ATTENDANCE = 'READ_SELF_ATTENDANCE',
  READ_ALL_ATTENDANCE = 'READ_ALL_ATTENDANCE',
  CLOCK_IN_OUT = 'CLOCK_IN_OUT',
  READ_SELF_VISIT = 'READ_SELF_VISIT',
  READ_ALL_VISIT = 'READ_ALL_VISIT',
  SAVE_VISIT = 'SAVE_VISIT',
  MANAGE_ROLES = 'MANAGE_ROLES',
  MANAGE_USER_ACCOUNTS = 'MANAGE_USER_ACCOUNTS',
}

export interface IRole extends Document {
  name: string;
  description?: string;
  permissions: string[];
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    permissions: [
      {
        type: String,
        enum: Object.values(Permission),
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Role = mongoose.model<IRole>('Role', RoleSchema);
