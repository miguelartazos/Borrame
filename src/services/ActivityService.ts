import { getDatabase } from '../db';
import { logger } from '../lib/logger';

export interface ActivityEvent {
  timestamp: number;
  action: string;
}

export interface ActivityMetrics {
  events: ActivityEvent[];
  daysWithActivity: string[];
  percentReviewed: number;
}

const ACTIVITY_EVENTS_LIMIT = 1000;
const ACTIVITY_DAYS_LIMIT = 30;

export class ActivityService {
  /**
   * Load user activity events from database
   * @param limit Maximum number of events to load
   * @returns Array of activity events with timestamps
   */
  async loadActivityEvents(limit: number = ACTIVITY_EVENTS_LIMIT): Promise<ActivityEvent[]> {
    try {
      const db = await getDatabase();
      const result = await db.getAllAsync<{ created_at: number; action: string }>(
        'SELECT created_at, action FROM intents ORDER BY created_at DESC LIMIT ?',
        [limit]
      );

      return result.map((row) => ({
        timestamp: row.created_at,
        action: row.action,
      }));
    } catch (error) {
      logger.error('Failed to load activity events', error);
      return [];
    }
  }

  /**
   * Get days with activity from database intents
   * @param daysBack Number of days to look back
   * @returns Array of ISO date strings with activity
   */
  async getDaysWithActivity(daysBack: number = ACTIVITY_DAYS_LIMIT): Promise<string[]> {
    try {
      const db = await getDatabase();
      const cutoffTime = Date.now() - daysBack * 24 * 60 * 60 * 1000;

      // Get unique days with activity from intents table
      const result = await db.getAllAsync<{ date: string }>(
        `SELECT DISTINCT date(created_at / 1000, 'unixepoch', 'localtime') as date 
         FROM intents 
         WHERE created_at > ? 
         ORDER BY date DESC`,
        [cutoffTime]
      );

      return result.map((row) => row.date);
    } catch (error) {
      logger.error('Failed to get days with activity', error);
      return [];
    }
  }

  /**
   * Calculate percent of library reviewed
   * @returns Percentage as decimal (0-1)
   */
  async calculatePercentReviewed(): Promise<number> {
    try {
      const db = await getDatabase();

      // Get total assets and reviewed assets
      const [totalResult, reviewedResult] = await Promise.all([
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM assets'),
        db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(DISTINCT asset_id) as count FROM intents'
        ),
      ]);

      const total = totalResult?.count || 0;
      const reviewed = reviewedResult?.count || 0;

      if (total === 0) return 0;

      return reviewed / total;
    } catch (error) {
      logger.error('Failed to calculate percent reviewed', error);
      return 0;
    }
  }

  /**
   * Load all activity metrics in parallel
   * @returns Combined activity metrics
   */
  async loadActivityMetrics(): Promise<ActivityMetrics> {
    try {
      const [events, daysWithActivity, percentReviewed] = await Promise.all([
        this.loadActivityEvents(),
        this.getDaysWithActivity(),
        this.calculatePercentReviewed(),
      ]);

      return {
        events,
        daysWithActivity,
        percentReviewed,
      };
    } catch (error) {
      logger.error('Failed to load activity metrics', error);
      return {
        events: [],
        daysWithActivity: [],
        percentReviewed: 0,
      };
    }
  }
}

// Export singleton instance
export const activityService = new ActivityService();
