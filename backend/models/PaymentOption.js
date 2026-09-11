const mongoose = require('mongoose');
const { PAYMENT_TYPES } = require('../utils/constants');

const paymentOptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    type: {
      type: String,
      enum: Object.values(PAYMENT_TYPES),
      required: true,
    },
    accountInfo: {
      type: String,
    },
    qrImage: {
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
  }
);

module.exports = mongoose.model('PaymentOption', paymentOptionSchema);
