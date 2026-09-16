import mongoose, { Schema, Document } from 'mongoose';
import { IRole } from './Role';
import { IUser } from './User';

export interface IPendingRoleAssignment extends Document {
  email: string;
  role: mongoose.Types.ObjectId | IRole;
  createdBy: mongoose.Types.ObjectId | IUser;
  tokenHash?: string;
  expiresAt?: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PendingRoleAssignmentSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenHash: {
      type: String,
      index: true,
      default: undefined,
    },
    expiresAt: {
      type: Date,
      default: undefined,
    },
    usedAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

export const PendingRoleAssignment = mongoose.model<IPendingRoleAssignment>(
  'PendingRoleAssignment',
  PendingRoleAssignmentSchema
);
