import User from '../users/user.model.js';
import Debate from '../debates/debate.model.js';
import Argument from '../arguments/argument.model.js';
import Rating from '../ratings/rating.model.js';
import Connection from '../connections/connection.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { deleteFromCloudinary, isCloudinaryConfigured } from '../../config/cloudinary.js';

export class AdminService {
  // User Management
  static async getAllUsers(page = 1, limit = 20, search = '', sortBy = 'createdAt', sortOrder = 'desc') {
    try {
      const skip = (page - 1) * limit;
      const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
      
      // Build search query
      const searchQuery = search ? {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      } : {};

      // Get users with pagination
      const users = await User.find(searchQuery)
        .select('-password')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count for pagination
      const totalUsers = await User.countDocuments(searchQuery);
      const totalPages = Math.ceil(totalUsers / limit);

      return {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('Get all users error:', error);
      throw ApiError.internal('Failed to fetch users');
    }
  }

  static async getUserById(userId) {
    try {
      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Get user statistics
      const [debatesCount, argumentsCount, ratingsCount] = await Promise.all([
        Debate.countDocuments({ creator: userId }),
        Argument.countDocuments({ author: userId }),
        Rating.countDocuments({ rater: userId })
      ]);

      return {
        user,
        statistics: {
          debates: debatesCount,
          arguments: argumentsCount,
          ratings: ratingsCount
        }
      };
    } catch (error) {
      console.error('Get user by ID error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw ApiError.internal('Failed to fetch user details');
    }
  }

  static async updateUserRole(userId, role) {
    try {
      const validRoles = ['user', 'moderator', 'admin'];
      
      if (!validRoles.includes(role)) {
        throw ApiError.badRequest('Invalid role. Must be one of: user, moderator, admin');
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { role },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      return user;
    } catch (error) {
      console.error('Update user role error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw ApiError.internal('Failed to update user role');
    }
  }

  static async toggleUserStatus(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      user.isActive = !user.isActive;
      await user.save();

      return {
        user: user.toObject(),
        message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`
      };
    } catch (error) {
      console.error('Toggle user status error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw ApiError.internal('Failed to toggle user status');
    }
  }

  static async deleteUser(userId) {
    try {
      const user = await User.findById(userId).select('+avatar_public_id');
      
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Prevent deletion of other admins
      if (user.role === 'admin') {
        throw ApiError.forbidden('Cannot delete admin users');
      }

      // Start collecting deletion statistics
      const deletionStats = {
        user: false,
        debates: 0,
        arguments: 0,
        ratings: 0,
        connections: 0
      };

      // Delete user's ratings first
      const deletedRatings = await Rating.deleteMany({ rater: userId });
      deletionStats.ratings = deletedRatings.deletedCount;

      // Delete connections created by the user
      const deletedConnections = await Connection.deleteMany({ createdBy: userId });
      deletionStats.connections = deletedConnections.deletedCount;

      // Delete user's arguments and related data
      const userArguments = await Argument.find({ author: userId });
      const argumentIds = userArguments.map(arg => arg._id);
      
      if (argumentIds.length > 0) {
        // Delete connections referencing user's arguments
        const deletedArgumentConnections = await Connection.deleteMany({
          $or: [
            { sourceArgument: { $in: argumentIds } },
            { targetArgument: { $in: argumentIds } }
          ]
        });
        deletionStats.connections += deletedArgumentConnections.deletedCount;

        // Delete ratings for user's arguments
        const deletedArgumentRatings = await Rating.deleteMany({ 
          argument: { $in: argumentIds } 
        });
        deletionStats.ratings += deletedArgumentRatings.deletedCount;
      }

      // Delete user's arguments
      const deletedArguments = await Argument.deleteMany({ author: userId });
      deletionStats.arguments = deletedArguments.deletedCount;

      // Delete user's debates
      const deletedDebates = await Debate.deleteMany({ creator: userId });
      deletionStats.debates = deletedDebates.deletedCount;

      // Clean up avatar from Cloudinary
      if (user.avatar_public_id && isCloudinaryConfigured()) {
        try {
          await deleteFromCloudinary(user.avatar_public_id);
        } catch (error) {
          console.warn('Failed to delete avatar from Cloudinary:', error.message);
        }
      }

      // Delete the user
      await User.findByIdAndDelete(userId);
      deletionStats.user = true;

      return {
        message: 'User deleted successfully',
        deletedAt: new Date(),
        deletedData: deletionStats
      };
    } catch (error) {
      console.error('Delete user error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw ApiError.internal('Failed to delete user');
    }
  }

  // Content Management
  static async getAllDebates(page = 1, limit = 20, status = '', search = '') {
    try {
      const skip = (page - 1) * limit;
      
      // Build query
      const query = {};
      if (status) query.status = status;
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const debates = await Debate.find(query)
        .populate('creator', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalDebates = await Debate.countDocuments(query);
      const totalPages = Math.ceil(totalDebates / limit);

      return {
        debates,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalDebates,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('Get all debates error:', error);
      throw ApiError.internal('Failed to fetch debates');
    }
  }

  static async updateDebateStatus(debateId, status, adminId) {
    try {
      const validStatuses = ['active', 'closed', 'archived'];
      
      if (!validStatuses.includes(status)) {
        throw ApiError.badRequest('Invalid status. Must be one of: active, closed, archived');
      }

      const updateData = { status };
      if (status === 'closed') {
        updateData.closedAt = new Date();
        updateData.closedBy = adminId;
      }

      const debate = await Debate.findByIdAndUpdate(
        debateId,
        updateData,
        { new: true, runValidators: true }
      ).populate('creator', 'username email');

      if (!debate) {
        throw ApiError.notFound('Debate not found');
      }

      return debate;
    } catch (error) {
      console.error('Update debate status error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw ApiError.internal('Failed to update debate status');
    }
  }

  static async deleteDebate(debateId) {
    try {
      const debate = await Debate.findById(debateId);
      
      if (!debate) {
        throw ApiError.notFound('Debate not found');
      }

      // Delete all arguments in this debate
      const deletedArguments = await Argument.deleteMany({ debate: debateId });
      
      // Delete all connections in this debate
      const deletedConnections = await Connection.deleteMany({ debate: debateId });
      
      // Delete all ratings for arguments in this debate
      const argumentIds = await Argument.find({ debate: debateId }).distinct('_id');
      const deletedRatings = await Rating.deleteMany({ argument: { $in: argumentIds } });

      // Delete the debate
      await Debate.findByIdAndDelete(debateId);

      return {
        message: 'Debate deleted successfully',
        deletedData: {
          debate: true,
          arguments: deletedArguments.deletedCount,
          connections: deletedConnections.deletedCount,
          ratings: deletedRatings.deletedCount
        }
      };
    } catch (error) {
      console.error('Delete debate error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw ApiError.internal('Failed to delete debate');
    }
  }

  // System Statistics
  static async getSystemStats() {
    try {
      const [
        totalUsers,
        activeUsers,
        totalDebates,
        activeDebates,
        totalArguments,
        totalRatings,
        totalConnections,
        recentUsers,
        recentDebates
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        Debate.countDocuments(),
        Debate.countDocuments({ status: 'active' }),
        Argument.countDocuments(),
        Rating.countDocuments(),
        Connection.countDocuments(),
        User.find().sort({ createdAt: -1 }).limit(5).select('username email createdAt'),
        Debate.find().sort({ createdAt: -1 }).limit(5).populate('creator', 'username')
      ]);

      // User role distribution
      const userRoles = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);

      // Debate status distribution
      const debateStatuses = await Debate.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      return {
        overview: {
          totalUsers,
          activeUsers,
          totalDebates,
          activeDebates,
          totalArguments,
          totalRatings,
          totalConnections
        },
        distributions: {
          userRoles: userRoles.reduce((acc, role) => {
            acc[role._id] = role.count;
            return acc;
          }, {}),
          debateStatuses: debateStatuses.reduce((acc, status) => {
            acc[status._id] = status.count;
            return acc;
          }, {})
        },
        recent: {
          users: recentUsers,
          debates: recentDebates
        }
      };
    } catch (error) {
      console.error('Get system stats error:', error);
      throw ApiError.internal('Failed to fetch system statistics');
    }
  }

  // Bulk Operations
  static async bulkUpdateUsers(userIds, updateData) {
    try {
      const allowedFields = ['role', 'isActive'];
      const filteredUpdate = {};
      
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredUpdate[key] = updateData[key];
        }
      });

      if (Object.keys(filteredUpdate).length === 0) {
        throw ApiError.badRequest('No valid fields to update');
      }

      const result = await User.updateMany(
        { _id: { $in: userIds } },
        filteredUpdate
      );

      return {
        message: `Updated ${result.modifiedCount} users successfully`,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      console.error('Bulk update users error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw ApiError.internal('Failed to bulk update users');
    }
  }
}