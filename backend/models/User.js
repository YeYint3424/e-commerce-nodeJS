const mongoose = require('mongoose');
const { ROLES, ACCOUNT_SPACES } = require('../utils/constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CUSTOMER,
    },
    accountSpace: {
      type: String,
      enum: Object.values(ACCOUNT_SPACES),
    },
    phone: {
      type: String,
    },
    address: {
      type: String,
    },
    avatar: {
      type: String,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ email: 1, accountSpace: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
