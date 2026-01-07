import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['password_reset', 'email_verification'],
    default: 'password_reset'
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5 // Maximum 5 attempts
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index for automatic cleanup
  }
}, {
  timestamps: true
});

// Index for efficient queries
otpSchema.index({ email: 1, type: 1 });
otpSchema.index({ otp: 1 });

// Instance method to check if OTP is expired
otpSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Instance method to check if OTP is valid for use
otpSchema.methods.isValidForUse = function() {
  return !this.isUsed && !this.isExpired() && this.attempts < 5;
};

// Static method to clean up expired OTPs
otpSchema.statics.cleanupExpired = async function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// Static method to invalidate all OTPs for an email
otpSchema.statics.invalidateAllForEmail = async function(email, type = 'password_reset') {
  return this.updateMany(
    { email, type, isUsed: false },
    { isUsed: true }
  );
};

export default mongoose.model('OTP', otpSchema);