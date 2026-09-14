import mongoose, { Schema, Document } from 'mongoose';

export interface IVisit extends Document {
  userId: mongoose.Types.ObjectId;
  customerName: string;
  purpose: string;
  outcome: string;
  locationAddress: string;
  visitDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VisitSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    outcome: {
      type: String,
      required: true,
      trim: true,
    },
    locationAddress: {
      type: String,
      required: true,
      trim: true,
    },
    visitDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Visit = mongoose.model<IVisit>('Visit', VisitSchema);
