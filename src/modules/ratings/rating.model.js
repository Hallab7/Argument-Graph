import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
  argument: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Argument',
    required: [true, 'Argument reference is required']
  },
  rater: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Rater reference is required']
  },
  score: {
    type: Number,
    required: [true, 'Rating score is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating must not exceed 5']
  },
  criteria: {
    logic: {
      type: Number,
      min: 1,
      max: 5
    },
    evidence: {
      type: Number,
      min: 1,
      max: 5
    },
    relevance: {
      type: Number,
      min: 1,
      max: 5
    },
    clarity: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [1000, 'Comment must not exceed 1000 characters']
  },
  isAnonymous: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index to ensure one rating per user per argument
ratingSchema.index({ argument: 1, rater: 1 }, { unique: true });

// Indexes for performance
ratingSchema.index({ argument: 1 });
ratingSchema.index({ rater: 1 });
ratingSchema.index({ score: -1 });
ratingSchema.index({ createdAt: -1 });

// Post-save middleware to update argument rating
ratingSchema.post('save', async function() {
  try {
    const Argument = mongoose.model('Argument');
    const ratings = await this.constructor.find({ argument: this.argument });
    
    const average = ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length;
    
    await Argument.findByIdAndUpdate(this.argument, {
      'rating.average': Math.round(average * 10) / 10, // Round to 1 decimal
      'rating.count': ratings.length
    });
  } catch (error) {
    console.error('Error updating argument rating:', error);
  }
});

// Post-remove middleware to update argument rating
ratingSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    try {
      const Argument = mongoose.model('Argument');
      const ratings = await mongoose.model('Rating').find({ argument: doc.argument });
      
      if (ratings.length > 0) {
        const average = ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length;
        await Argument.findByIdAndUpdate(doc.argument, {
          'rating.average': Math.round(average * 10) / 10,
          'rating.count': ratings.length
        });
      } else {
        await Argument.findByIdAndUpdate(doc.argument, {
          'rating.average': 0,
          'rating.count': 0
        });
      }
    } catch (error) {
      console.error('Error updating argument rating after deletion:', error);
    }
  }
});

export default mongoose.model('Rating', ratingSchema);