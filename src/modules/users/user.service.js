import User from './user.model.js';
import Debate from '../debates/debate.model.js';
import Argument from '../arguments/argument.model.js';
import Rating from '../ratings/rating.model.js';
import { ApiError } from '../../utils/ApiError.js';

export class UserService {
  static async getUserProfile(userId, requesterId = null) {
    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (!user.isActive) {
      throw ApiError.notFound('User account is deactivated');
    }

    // Return public profile information
    const profile = {
      _id: user._id,
      username: user.username,
      avatar_url: user.avatar_url,
      reputation: user.reputation,
      verified: user.verified,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };

    // Add email only if it's the user's own profile
    if (requesterId && requesterId.equals(userId)) {
      profile.email = user.email;
    }

    return profile;
  }

  static async updateUserProfile(userId, updateData, requesterId) {
    // Check if user is updating their own profile or is an admin
    const requester = await User.findById(requesterId);
    
    if (!userId.equals(requesterId) && requester.role !== 'admin') {
      throw ApiError.forbidden('Can only update your own profile');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Prevent non-admins from changing certain fields
    if (requester.role !== 'admin') {
      delete updateData.role;
      delete updateData.reputation;
      delete updateData.verified;
      delete updateData.isActive;
    }

    // Check for username uniqueness if being updated
    if (updateData.username && updateData.username !== user.username) {
      const existingUser = await User.findOne({ 
        username: updateData.username,
        _id: { $ne: userId }
      });
      
      if (existingUser) {
        throw ApiError.conflict('Username already taken');
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    return this.getUserProfile(userId, requesterId);
  }

  static async getUserDebates(userId, filters = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const query = { creator: userId };
    if (status) query.status = status;

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

  static async getUserStats(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const [
      debatesCreated,
      argumentsCreated,
      ratingsGiven,
      ratingsReceived,
      debateStats,
      argumentStats
    ] = await Promise.all([
      // Debates created by user
      Debate.countDocuments({ creator: userId }),
      
      // Arguments created by user
      Argument.countDocuments({ author: userId, isDeleted: false }),
      
      // Ratings given by user
      Rating.countDocuments({ rater: userId }),
      
      // Ratings received on user's arguments
      Rating.aggregate([
        {
          $lookup: {
            from: 'arguments',
            localField: 'argument',
            foreignField: '_id',
            as: 'argumentData'
          }
        },
        {
          $match: {
            'argumentData.author': userId,
            'argumentData.isDeleted': false
          }
        },
        {
          $count: 'total'
        }
      ]),
      
      // Debate statistics
      Debate.aggregate([
        { $match: { creator: userId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Argument statistics
      Argument.aggregate([
        { $match: { author: userId, isDeleted: false } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalUpvotes: { $sum: '$votes.upvotes' },
            totalDownvotes: { $sum: '$votes.downvotes' }
          }
        }
      ])
    ]);

    // Process debate stats
    const debatesByStatus = debateStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, { active: 0, closed: 0, archived: 0 });

    // Process argument stats
    const argumentsByType = argumentStats.reduce((acc, stat) => {
      acc[stat._id] = {
        count: stat.count,
        upvotes: stat.totalUpvotes,
        downvotes: stat.totalDownvotes,
        netVotes: stat.totalUpvotes - stat.totalDownvotes
      };
      return acc;
    }, {});

    // Calculate average rating received
    const avgRatingResult = await Rating.aggregate([
      {
        $lookup: {
          from: 'arguments',
          localField: 'argument',
          foreignField: '_id',
          as: 'argumentData'
        }
      },
      {
        $match: {
          'argumentData.author': userId,
          'argumentData.isDeleted': false
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$score' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    const averageRating = avgRatingResult.length > 0 ? avgRatingResult[0].averageRating : 0;

    return {
      user: {
        id: user._id,
        username: user.username,
        reputation: user.reputation,
        joinedAt: user.createdAt
      },
      debates: {
        created: debatesCreated,
        byStatus: debatesByStatus
      },
      arguments: {
        created: argumentsCreated,
        byType: argumentsByType
      },
      ratings: {
        given: ratingsGiven,
        received: ratingsReceived.length > 0 ? ratingsReceived[0].total : 0,
        averageReceived: Math.round(averageRating * 10) / 10
      },
      engagement: {
        totalVotesReceived: Object.values(argumentsByType).reduce(
          (sum, type) => sum + type.upvotes + type.downvotes, 0
        ),
        netVotesReceived: Object.values(argumentsByType).reduce(
          (sum, type) => sum + type.netVotes, 0
        )
      }
    };
  }

  static async searchUsers(query, filters = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'reputation',
      sortOrder = 'desc'
    } = filters;

    const searchQuery = {
      isActive: true,
      $or: [
        { username: { $regex: query, $options: 'i' } }
      ]
    };

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(searchQuery)
        .select('username avatar_url reputation verified role createdAt')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(searchQuery)
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}