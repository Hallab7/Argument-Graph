import mongoose from 'mongoose';

const connectionSchema = new mongoose.Schema({
  sourceArgument: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Argument',
    required: [true, 'Source argument is required']
  },
  targetArgument: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Argument',
    required: [true, 'Target argument is required']
  },
  connectionType: {
    type: String,
    enum: ['supports', 'opposes', 'clarifies', 'builds_on', 'questions', 'refutes'],
    required: [true, 'Connection type is required']
  },
  strength: {
    type: Number,
    min: [1, 'Strength must be at least 1'],
    max: [5, 'Strength must not exceed 5'],
    default: 3
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description must not exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  debate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Debate',
    required: [true, 'Debate reference is required']
  },
  votes: {
    helpful: {
      type: Number,
      default: 0
    },
    unhelpful: {
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
        enum: ['helpful', 'unhelpful']
      },
      votedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate connections
connectionSchema.index({ 
  sourceArgument: 1, 
  targetArgument: 1, 
  connectionType: 1 
}, { unique: true });

// Indexes for performance
connectionSchema.index({ sourceArgument: 1 });
connectionSchema.index({ targetArgument: 1 });
connectionSchema.index({ debate: 1 });
connectionSchema.index({ createdBy: 1 });
connectionSchema.index({ connectionType: 1 });
connectionSchema.index({ createdAt: -1 });

// Validation to prevent self-connections
connectionSchema.pre('save', function(next) {
  if (this.sourceArgument.equals(this.targetArgument)) {
    next(new Error('An argument cannot connect to itself'));
  } else {
    next();
  }
});

// Method to add vote
connectionSchema.methods.addVote = function(userId, voteType) {
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
  const helpful = this.votes.voters.filter(v => v.vote === 'helpful').length;
  const unhelpful = this.votes.voters.filter(v => v.vote === 'unhelpful').length;
  
  this.votes.helpful = helpful;
  this.votes.unhelpful = unhelpful;
  
  return this.save();
};

export default mongoose.model('Connection', connectionSchema);