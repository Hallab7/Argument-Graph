import mongoose from 'mongoose';

const argumentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Argument content is required'],
    trim: true,
    minlength: [10, 'Argument must be at least 10 characters'],
    maxlength: [5000, 'Argument must not exceed 5000 characters']
  },
  type: {
    type: String,
    enum: ['support', 'oppose', 'clarification', 'question'],
    required: [true, 'Argument type is required']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Argument author is required']
  },
  debate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Debate',
    required: [true, 'Debate reference is required']
  },
  parentArgument: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Argument',
    default: null
  },
  level: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  votes: {
    upvotes: {
      type: Number,
      default: 0
    },
    downvotes: {
      type: Number,
      default: 0
    },
    voters: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      vote: {
        type: String,
        enum: ['up', 'down']
      },
      votedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  sources: [{
    title: String,
    url: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Source URL must be a valid HTTP/HTTPS URL'
      }
    },
    description: String
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
argumentSchema.index({ debate: 1 });
argumentSchema.index({ author: 1 });
argumentSchema.index({ parentArgument: 1 });
argumentSchema.index({ createdAt: -1 });
argumentSchema.index({ 'votes.upvotes': -1 });
argumentSchema.index({ 'rating.average': -1 });
argumentSchema.index({ level: 1 });

// Virtual for net votes
argumentSchema.virtual('netVotes').get(function() {
  return this.votes.upvotes - this.votes.downvotes;
});

// Virtual for child arguments
argumentSchema.virtual('children', {
  ref: 'Argument',
  localField: '_id',
  foreignField: 'parentArgument'
});

// Pre-save middleware to calculate level
argumentSchema.pre('save', async function(next) {
  if (this.isNew && this.parentArgument) {
    try {
      const parent = await this.constructor.findById(this.parentArgument);
      if (parent) {
        this.level = parent.level + 1;
      }
    } catch (error) {
      console.error('Error calculating argument level:', error);
    }
  }
  next();
});

// Method to add vote
argumentSchema.methods.addVote = function(userId, voteType) {
  // Remove existing vote from this user
  this.votes.voters = this.votes.voters.filter(
    voter => !voter.user.equals(userId)
  );
  
  // Add new vote
  this.votes.voters.push({
    user: userId,
    vote: voteType,
    votedAt: new Date()
  });
  
  // Recalculate vote counts
  const upvotes = this.votes.voters.filter(v => v.vote === 'up').length;
  const downvotes = this.votes.voters.filter(v => v.vote === 'down').length;
  
  this.votes.upvotes = upvotes;
  this.votes.downvotes = downvotes;
  
  return this.save();
};

// Method to remove vote
argumentSchema.methods.removeVote = function(userId) {
  this.votes.voters = this.votes.voters.filter(
    voter => !voter.user.equals(userId)
  );
  
  // Recalculate vote counts
  const upvotes = this.votes.voters.filter(v => v.vote === 'up').length;
  const downvotes = this.votes.voters.filter(v => v.vote === 'down').length;
  
  this.votes.upvotes = upvotes;
  this.votes.downvotes = downvotes;
  
  return this.save();
};

export default mongoose.model('Argument', argumentSchema);