import Argument from './argument.model.js';
import Debate from '../debates/debate.model.js';
import Rating from '../ratings/rating.model.js';
import Connection from '../connections/connection.model.js';
import { ApiError } from '../../utils/ApiError.js';

export class ArgumentService {
  static async createArgument(debateId, argumentData, authorId) {
    // Check if debate exists and is active
    const debate = await Debate.findById(debateId);
    if (!debate) {
      throw ApiError.notFound('Debate not found');
    }

    if (debate.status !== 'active') {
      throw ApiError.badRequest('Cannot add arguments to a closed or archived debate');
    }

    // If parentArgument is specified, validate it exists and belongs to this debate
    if (argumentData.parentArgument) {
      const parentArg = await Argument.findOne({
        _id: argumentData.parentArgument,
        debate: debateId,
        isDeleted: false
      });

      if (!parentArg) {
        throw ApiError.badRequest('Parent argument not found or does not belong to this debate');
      }
    }

    const argument = await Argument.create({
      ...argumentData,
      debate: debateId,
      author: authorId
    });

    // Update debate argument count
    await Debate.findByIdAndUpdate(debateId, { $inc: { argumentCount: 1 } });

    // Add user to debate participants if not already
    await Debate.findByIdAndUpdate(debateId, {
      $addToSet: { participants: { user: authorId } }
    });

    await argument.populate('author', 'username avatar_url reputation');
    return argument;
  }

  static async getArgument(argumentId, userId = null) {
    const argument = await Argument.findOne({
      _id: argumentId,
      isDeleted: false
    })
      .populate('author', 'username avatar_url reputation')
      .populate('debate', 'title status creator');

    if (!argument) {
      throw ApiError.notFound('Argument not found');
    }

    // Check if user has access to the debate
    const debate = argument.debate;
    if (!debate.isPublic && (!userId || !debate.creator.equals(userId))) {
      throw ApiError.forbidden('Access denied to this argument');
    }

    return argument;
  }

  static async updateArgument(argumentId, updateData, userId) {
    const argument = await Argument.findOne({
      _id: argumentId,
      isDeleted: false
    });

    if (!argument) {
      throw ApiError.notFound('Argument not found');
    }

    // Check if user is the author
    if (!argument.author.equals(userId)) {
      throw ApiError.forbidden('Only the argument author can update this argument');
    }

    // Check if debate is still active
    const debate = await Debate.findById(argument.debate);
    if (debate.status !== 'active') {
      throw ApiError.badRequest('Cannot edit arguments in a closed or archived debate');
    }

    // Store edit history if content is being changed
    if (updateData.content && updateData.content !== argument.content) {
      argument.editHistory.push({
        content: argument.content,
        editedAt: new Date(),
        reason: updateData.reason || 'No reason provided'
      });
      argument.isEdited = true;
    }

    // Update the argument
    Object.assign(argument, updateData);
    await argument.save();

    await argument.populate('author', 'username avatar_url reputation');
    return argument;
  }

  static async deleteArgument(argumentId, userId) {
    const argument = await Argument.findOne({
      _id: argumentId,
      isDeleted: false
    });

    if (!argument) {
      throw ApiError.notFound('Argument not found');
    }

    // Check if user is the author
    if (!argument.author.equals(userId)) {
      throw ApiError.forbidden('Only the argument author can delete this argument');
    }

    // Soft delete the argument
    argument.isDeleted = true;
    argument.deletedAt = new Date();
    argument.deletedBy = userId;
    await argument.save();

    // Update debate argument count
    await Debate.findByIdAndUpdate(argument.debate, { $inc: { argumentCount: -1 } });

    // Deactivate related connections
    await Connection.updateMany(
      {
        $or: [
          { sourceArgument: argumentId },
          { targetArgument: argumentId }
        ]
      },
      { isActive: false }
    );

    return { message: 'Argument deleted successfully' };
  }

  static async voteOnArgument(argumentId, voteData, userId) {
    const argument = await Argument.findOne({
      _id: argumentId,
      isDeleted: false
    });

    if (!argument) {
      throw ApiError.notFound('Argument not found');
    }

    // Check if user is trying to vote on their own argument
    if (argument.author.equals(userId)) {
      throw ApiError.badRequest('Cannot vote on your own argument');
    }

    if (voteData.vote === 'remove') {
      await argument.removeVote(userId);
    } else {
      await argument.addVote(userId, voteData.vote);
    }

    return {
      votes: argument.votes,
      message: voteData.vote === 'remove' ? 'Vote removed' : 'Vote recorded'
    };
  }

  static async createConnection(sourceArgumentId, connectionData, userId) {
    const { targetArgumentId, connectionType, strength, description } = connectionData;

    // Validate both arguments exist and belong to the same debate
    const [sourceArg, targetArg] = await Promise.all([
      Argument.findOne({ _id: sourceArgumentId, isDeleted: false }),
      Argument.findOne({ _id: targetArgumentId, isDeleted: false })
    ]);

    if (!sourceArg || !targetArg) {
      throw ApiError.notFound('One or both arguments not found');
    }

    if (!sourceArg.debate.equals(targetArg.debate)) {
      throw ApiError.badRequest('Arguments must belong to the same debate');
    }

    // Check if debate is active
    const debate = await Debate.findById(sourceArg.debate);
    if (debate.status !== 'active') {
      throw ApiError.badRequest('Cannot create connections in a closed or archived debate');
    }

    const connection = await Connection.create({
      sourceArgument: sourceArgumentId,
      targetArgument: targetArgumentId,
      connectionType,
      strength: strength || 3,
      description,
      createdBy: userId,
      debate: sourceArg.debate
    });

    await connection.populate([
      { path: 'sourceArgument', select: 'content author' },
      { path: 'targetArgument', select: 'content author' },
      { path: 'createdBy', select: 'username avatar_url' }
    ]);

    return connection;
  }

  static async rateArgument(argumentId, ratingData, userId) {
    const argument = await Argument.findOne({
      _id: argumentId,
      isDeleted: false
    });

    if (!argument) {
      throw ApiError.notFound('Argument not found');
    }

    // Check if user is trying to rate their own argument
    if (argument.author.equals(userId)) {
      throw ApiError.badRequest('Cannot rate your own argument');
    }

    // Check if user has already rated this argument
    const existingRating = await Rating.findOne({
      argument: argumentId,
      rater: userId
    });

    if (existingRating) {
      // Update existing rating
      Object.assign(existingRating, ratingData);
      await existingRating.save();
      return existingRating;
    } else {
      // Create new rating
      const rating = await Rating.create({
        ...ratingData,
        argument: argumentId,
        rater: userId
      });

      await rating.populate('rater', 'username avatar_url');
      return rating;
    }
  }

  static async getArgumentRatings(argumentId, userId = null) {
    const argument = await Argument.findOne({
      _id: argumentId,
      isDeleted: false
    });

    if (!argument) {
      throw ApiError.notFound('Argument not found');
    }

    const ratings = await Rating.find({ argument: argumentId })
      .populate('rater', 'username avatar_url')
      .sort({ createdAt: -1 });

    // Filter out anonymous ratings for non-authors
    const filteredRatings = ratings.map(rating => {
      if (rating.isAnonymous && (!userId || !rating.rater._id.equals(userId))) {
        return {
          ...rating.toObject(),
          rater: { username: 'Anonymous', avatar_url: null }
        };
      }
      return rating;
    });

    return {
      ratings: filteredRatings,
      summary: {
        average: argument.rating.average,
        count: argument.rating.count,
        distribution: await this.getRatingDistribution(argumentId)
      }
    };
  }

  static async getRatingDistribution(argumentId) {
    const distribution = await Rating.aggregate([
      { $match: { argument: argumentId } },
      { $group: { _id: '$score', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const result = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach(item => {
      result[item._id] = item.count;
    });

    return result;
  }

  static async getArgumentAnalysis(argumentId, userId) {
    const argument = await this.getArgument(argumentId, userId);

    // This would integrate with AI services
    // For now, return a placeholder analysis
    return {
      argument: {
        id: argument._id,
        content: argument.content,
        type: argument.type,
        author: argument.author
      },
      analysis: {
        fallacies: [],
        strength: {
          score: 0.7,
          reasoning: 'Analysis not yet implemented'
        },
        suggestions: [
          'Consider adding more evidence to support your claim',
          'Address potential counterarguments'
        ]
      },
      metadata: {
        analyzedAt: new Date(),
        version: '1.0'
      }
    };
  }
}