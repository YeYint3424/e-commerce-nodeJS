const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    recipientRole: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    entityType: {
      type: String,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipientUser: 1, createdAt: -1 });
notificationSchema.index({ recipientRole: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
