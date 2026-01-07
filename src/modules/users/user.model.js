import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    unique: true, 
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  username: { 
    type: String, 
    unique: true, 
    required: [true, 'Username is required'],
    lowercase: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username must not exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include password in queries by default
  },
  avatar_url: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        // If avatar_url is provided, it should be a valid URL
        if (!v) return true; // Allow null/empty
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Avatar URL must be a valid HTTP/HTTPS URL'
    }
  },
  avatar_public_id: {
    type: String,
    default: null,
    select: false // Don't include in queries by default (internal use only)
  },
  reputation: { 
    type: Number, 
    default: 100,
    min: [0, 'Reputation cannot be negative']
  },
  verified: { 
    type: Boolean, 
    default: false 
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockedUntil: {
    type: Date
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.avatar_public_id;
      delete ret.__v;
      return ret;
    }
  }
});

// Remove duplicate indexes - only use schema.index() method
// userSchema.index({ email: 1 }); // Removed - using unique: true in field definition
// userSchema.index({ username: 1 }); // Removed - using unique: true in field definition
userSchema.index({ createdAt: -1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockedUntil && this.lockedUntil > Date.now());
});

// Pre-save middleware to handle login attempts
userSchema.pre('save', function(next) {
  // Only increment login attempts if it's being modified
  if (!this.isModified('loginAttempts') && !this.isModified('lockedUntil')) {
    return next();
  }

  // If we have a previous lock that has expired, restart at 1
  if (this.lockedUntil && this.lockedUntil < Date.now()) {
    return this.updateOne({
      $unset: {
        lockedUntil: 1,
      },
      $set: {
        loginAttempts: 1,
      }
    }, next);
  }

  next();
});

export default mongoose.model('User', userSchema);