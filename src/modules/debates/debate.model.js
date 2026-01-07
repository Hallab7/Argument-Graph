import mongoose from 'mongoose';

const debateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Debate title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters'],
    maxlength: [200, 'Title must not exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Debate description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [2000, 'Description must not exceed 2000 characters']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Debate creator is required']
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'archived'],
    default: 'active'
  },
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category must not exceed 50 characters']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag must not exceed 30 characters']
  }],
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  argumentCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  closedAt: {
    type: Date
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
debateSchema.index({ creator: 1 });
debateSchema.index({ status: 1 });
debateSchema.index({ createdAt: -1 });
debateSchema.index({ title: 'text', description: 'text' });
debateSchema.index({ tags: 1 });
debateSchema.index({ category: 1 });

// Virtual for argument count
debateSchema.virtual('arguments', {
  ref: 'Argument',
  localField: '_id',
  foreignField: 'debate'
});

// Pre-save middleware
debateSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'closed' && !this.closedAt) {
    this.closedAt = new Date();
  }
  next();
});

export default mongoose.model('Debate', debateSchema);