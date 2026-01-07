import Debate from './debate.model.js';
import Argument from '../arguments/argument.model.js';
import Connection from '../connections/connection.model.js';
import { ApiError } from '../../utils/ApiError.js';

export class DebateService {
  static async createDebate(debateData, creatorId) {
    try {
      const debate = await Debate.create({
        ...debateData,
        creator: creatorId,
        participants: [{ user: creatorId }]
      });

      await debate.populate('creator', 'username email avatar_url reputation');
      return debate;
    } catch (error) {
      if (error.code === 11000) {
        throw ApiError.conflict('A debate with similar content already exists');
      }
      throw error;
    }
  }

  static async getDebates(filters = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    const query = {};
    
    // Add filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$text = { $search: search };
    }

    // Only show public debates or user's own debates
    query.isPublic = true;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [debates, total] = await Promise.all([
      Debate.find(query)
        .populate('creator', 'username avatar_url reputation')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Debate.countDocuments(query)
    ]);

    return {
      debates,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async getDebateById(debateId, userId = null) {
    const debate = await Debate.findById(debateId)
      .populate('creator', 'username avatar_url reputation')
      .populate('participants.user', 'username avatar_url reputation');

    if (!debate) {
      throw ApiError.notFound('Debate not found');
    }

    // Check if debate is public or user has access
    if (!debate.isPublic && (!userId || !debate.creator.equals(userId))) {
      throw ApiError.forbidden('Access denied to this debate');
    }

    // Increment view count
    await Debate.findByIdAndUpdate(debateId, { $inc: { viewCount: 1 } });

    return debate;
  }

  static async updateDebate(debateId, updateData, userId) {
    const debate = await Debate.findById(debateId);

    if (!debate) {
      throw ApiError.notFound('Debate not found');
    }

    // Check if user is the creator
    if (!debate.creator.equals(userId)) {
      throw ApiError.forbidden('Only the debate creator can update this debate');
    }

    // Don't allow status change to closed without proper handling
    if (updateData.status === 'closed') {
      updateData.closedAt = new Date();
      updateData.closedBy = userId;
    }

    const updatedDebate = await Debate.findByIdAndUpdate(
      debateId,
      updateData,
      { new: true, runValidators: true }
    ).populate('creator', 'username avatar_url reputation');

    return updatedDebate;
  }

  static async deleteDebate(debateId, userId) {
    const debate = await Debate.findById(debateId);

    if (!debate) {
      throw ApiError.notFound('Debate not found');
    }

    // Check if user is the creator
    if (!debate.creator.equals(userId)) {
      throw ApiError.forbidden('Only the debate creator can delete this debate');
    }

    // Delete all related arguments and connections
    await Promise.all([
      Argument.deleteMany({ debate: debateId }),
      Connection.deleteMany({ debate: debateId })
    ]);

    await Debate.findByIdAndDelete(debateId);

    return { message: 'Debate deleted successfully' };
  }

  static async getDebateGraph(debateId, userId = null) {
    const debate = await this.getDebateById(debateId, userId);

    // Get all arguments for this debate
    const debateArguments = await Argument.find({ 
      debate: debateId, 
      isDeleted: false 
    })
      .populate('author', 'username avatar_url reputation')
      .sort({ createdAt: 1 });

    // Get all connections for this debate
    const connections = await Connection.find({ 
      debate: debateId, 
      isActive: true 
    })
      .populate('createdBy', 'username avatar_url');

    // Format for graph visualization
    const nodes = debateArguments.map(arg => ({
      id: arg._id.toString(),
      content: arg.content,
      type: arg.type,
      author: arg.author,
      level: arg.level,
      position: arg.position,
      votes: arg.votes,
      rating: arg.rating,
      createdAt: arg.createdAt,
      parentArgument: arg.parentArgument?.toString() || null
    }));

    const edges = connections.map(conn => ({
      id: conn._id.toString(),
      source: conn.sourceArgument.toString(),
      target: conn.targetArgument.toString(),
      type: conn.connectionType,
      strength: conn.strength,
      description: conn.description,
      createdBy: conn.createdBy,
      votes: conn.votes
    }));

    return {
      debate: {
        id: debate._id,
        title: debate.title,
        description: debate.description,
        creator: debate.creator,
        status: debate.status,
        createdAt: debate.createdAt
      },
      graph: {
        nodes,
        edges
      },
      stats: {
        totalArguments: debateArguments.length,
        totalConnections: connections.length,
        argumentsByType: debateArguments.reduce((acc, arg) => {
          acc[arg.type] = (acc[arg.type] || 0) + 1;
          return acc;
        }, {})
      }
    };
  }

  static async joinDebate(debateId, userId) {
    const debate = await Debate.findById(debateId);

    if (!debate) {
      throw ApiError.notFound('Debate not found');
    }

    if (debate.status !== 'active') {
      throw ApiError.badRequest('Cannot join a closed or archived debate');
    }

    // Check if user is already a participant
    const isParticipant = debate.participants.some(p => p.user.equals(userId));
    
    if (isParticipant) {
      throw ApiError.badRequest('User is already a participant in this debate');
    }

    debate.participants.push({ user: userId });
    await debate.save();

    return { message: 'Successfully joined the debate' };
  }
}