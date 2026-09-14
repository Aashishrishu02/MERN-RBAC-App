import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  userId: mongoose.Types.ObjectId;
  clockIn: Date;
  clockOut?: Date;
  status: 'CLOCKED_IN' | 'CLOCKED_OUT';
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    clockIn: {
      type: Date,
      required: true,
      default: Date.now,
    },
    clockOut: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['CLOCKED_IN', 'CLOCKED_OUT'],
      default: 'CLOCKED_IN',
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
