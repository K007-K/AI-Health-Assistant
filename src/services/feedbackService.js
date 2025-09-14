const { supabase } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class FeedbackService {
  // Save user feedback
  async saveFeedback(userId, conversationId, rating, comment = null, featureUsed = null) {
    try {
      const feedback = {
        id: uuidv4(),
        user_id: userId,
        conversation_id: conversationId,
        rating: rating, // 1 for thumbs down, 5 for thumbs up
        comment: comment,
        feature_used: featureUsed,
        accuracy_category: this.categorizeRating(rating),
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('feedback')
        .insert([feedback])
        .select()
        .single();

      if (error) {
        console.error('Error saving feedback:', error);
        throw error;
      }

      console.log(`📊 Feedback saved: ${userId} - Rating: ${rating}`);
      return data;
    } catch (error) {
      console.error('Error in saveFeedback:', error);
      throw error;
    }
  }

  // Categorize rating for analytics
  categorizeRating(rating) {
    if (rating >= 4) return 'helpful';
    if (rating >= 3) return 'partially_helpful';
    return 'not_helpful';
  }

  // Get feedback statistics
  async getFeedbackStats(days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('feedback')
        .select('rating, accuracy_category, feature_used, created_at')
        .gte('created_at', startDate);

      if (error) {
        console.error('Error fetching feedback stats:', error);
        throw error;
      }

      // Calculate statistics
      const stats = {
        totalFeedback: data.length,
        averageRating: 0,
        accuracyBreakdown: {
          helpful: 0,
          partially_helpful: 0,
          not_helpful: 0
        },
        featureBreakdown: {},
        dailyTrends: {}
      };

      if (data.length > 0) {
        // Calculate average rating
        const totalRating = data.reduce((sum, feedback) => sum + feedback.rating, 0);
        stats.averageRating = (totalRating / data.length).toFixed(2);

        // Count accuracy categories
        data.forEach(feedback => {
          if (feedback.accuracy_category) {
            stats.accuracyBreakdown[feedback.accuracy_category]++;
          }

          // Count feature usage
          if (feedback.feature_used) {
            stats.featureBreakdown[feedback.feature_used] = 
              (stats.featureBreakdown[feedback.feature_used] || 0) + 1;
          }

          // Daily trends
          const date = new Date(feedback.created_at).toISOString().split('T')[0];
          if (!stats.dailyTrends[date]) {
            stats.dailyTrends[date] = { count: 0, totalRating: 0 };
          }
          stats.dailyTrends[date].count++;
          stats.dailyTrends[date].totalRating += feedback.rating;
        });

        // Calculate daily averages
        Object.keys(stats.dailyTrends).forEach(date => {
          const day = stats.dailyTrends[date];
          day.averageRating = (day.totalRating / day.count).toFixed(2);
        });
      }

      return stats;
    } catch (error) {
      console.error('Error in getFeedbackStats:', error);
      throw error;
    }
  }

  // Get user's feedback history
  async getUserFeedbackHistory(userId, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching user feedback history:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserFeedbackHistory:', error);
      throw error;
    }
  }

  // Calculate accuracy percentage (helpful feedback)
  async getAccuracyPercentage(days = 30) {
    try {
      const stats = await this.getFeedbackStats(days);
      
      if (stats.totalFeedback === 0) {
        return 0;
      }

      const helpfulFeedback = stats.accuracyBreakdown.helpful + 
                             (stats.accuracyBreakdown.partially_helpful * 0.5);
      
      return ((helpfulFeedback / stats.totalFeedback) * 100).toFixed(1);
    } catch (error) {
      console.error('Error calculating accuracy percentage:', error);
      return 0;
    }
  }

  // Get feedback trends for improvement
  async getFeedbackTrends() {
    try {
      const thirtyDayStats = await this.getFeedbackStats(30);
      const sevenDayStats = await this.getFeedbackStats(7);

      return {
        thirtyDay: {
          accuracy: await this.getAccuracyPercentage(30),
          totalFeedback: thirtyDayStats.totalFeedback,
          averageRating: thirtyDayStats.averageRating
        },
        sevenDay: {
          accuracy: await this.getAccuracyPercentage(7),
          totalFeedback: sevenDayStats.totalFeedback,
          averageRating: sevenDayStats.averageRating
        },
        improvement: {
          accuracyTrend: 'stable', // Would calculate based on comparison
          ratingTrend: 'stable'    // Would calculate based on comparison
        }
      };
    } catch (error) {
      console.error('Error in getFeedbackTrends:', error);
      throw error;
    }
  }

  // Clean up old feedback (maintenance)
  async cleanupOldFeedback(retentionDays = 365) {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('feedback')
        .delete()
        .lt('created_at', cutoffDate);

      if (error) {
        console.error('Error cleaning up old feedback:', error);
        throw error;
      }

      console.log(`🧹 Feedback older than ${retentionDays} days cleaned up`);
    } catch (error) {
      console.error('Error in cleanupOldFeedback:', error);
      throw error;
    }
  }
}

module.exports = FeedbackService;