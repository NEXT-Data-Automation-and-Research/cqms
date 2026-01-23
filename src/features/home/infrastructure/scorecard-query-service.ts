/**
 * Unified Scorecard Query Service
 * Batches and optimizes queries across all scorecard tables
 */

interface Scorecard {
  id: string;
  name: string;
  table_name: string;
  scoring_type?: string;
}

interface QueryOptions {
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  dateFilter?: {
    field: string;
    start: Date;
    end: Date;
  };
  emailFilter?: {
    field: string;
    email: string;
  };
}

interface QueryResult<T> {
  data: T[];
  error: any;
  scorecard: Scorecard;
}

/**
 * Unified service for querying scorecard tables
 * Reduces redundant queries by batching and caching
 */
export class ScorecardQueryService {
  private scorecardsCache: Scorecard[] | null = null;
  private cacheTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all active scorecards (cached)
   */
  async getScorecards(supabase: any, forceRefresh = false): Promise<Scorecard[]> {
    const now = Date.now();
    
    if (!forceRefresh && this.scorecardsCache && (now - this.cacheTime) < this.CACHE_TTL) {
      return this.scorecardsCache;
    }

    const { data, error } = await supabase
      .from('scorecards')
      .select('id, name, table_name, scoring_type')
      .eq('is_active', true);

    if (error) {
      console.error('Error loading scorecards:', error);
      return this.scorecardsCache || [];
    }

    this.scorecardsCache = data || [];
    this.cacheTime = now;
    return this.scorecardsCache || [];
  }

  /**
   * Query multiple scorecard tables in parallel with consistent options
   * Returns results grouped by scorecard
   */
  async queryMultipleScorecards<T = any>(
    supabase: any,
    scorecards: Scorecard[],
    options: QueryOptions = {}
  ): Promise<QueryResult<T>[]> {
    const {
      limit = 50,
      orderBy = 'submitted_at',
      orderDirection = 'desc',
      dateFilter,
      emailFilter
    } = options;

    // Build queries for all scorecards in parallel
    const queries = scorecards.map(async (scorecard): Promise<QueryResult<T>> => {
      try {
        let query = supabase
          .from(scorecard.table_name)
          .select('*')
          .order(orderBy, { ascending: orderDirection === 'asc' })
          .limit(limit);

        // Apply email filter if provided
        if (emailFilter) {
          query = query.eq(emailFilter.field, emailFilter.email);
        }

        // Apply date filter if provided
        if (dateFilter) {
          const startISO = dateFilter.start.toISOString();
          const endISO = new Date(dateFilter.end.getTime() + 24 * 60 * 60 * 1000).toISOString();
          query = query
            .gte(dateFilter.field, startISO)
            .lte(dateFilter.field, endISO);
        }

        const { data, error } = await query;

        return {
          data: data || [],
          error: error || null,
          scorecard
        };
      } catch (err) {
        console.warn(`Error querying ${scorecard.table_name}:`, err);
        return {
          data: [],
          error: err,
          scorecard
        };
      }
    });

    // Execute all queries in parallel
    return Promise.all(queries);
  }

  /**
   * Query scorecard tables with reversal filters
   */
  async queryReversals(
    supabase: any,
    scorecards: Scorecard[],
    options: QueryOptions & {
      reversalFilterField: string;
      onlyUnprocessed?: boolean;
    }
  ): Promise<QueryResult<any>[]> {
    const {
      limit = 30,
      orderBy = 'reversal_requested_at',
      orderDirection = 'desc',
      emailFilter,
      reversalFilterField,
      onlyUnprocessed = false
    } = options;

    const queries = scorecards.map(async (scorecard): Promise<QueryResult<any>> => {
      try {
        let query = supabase
          .from(scorecard.table_name)
          .select('id, employee_email, auditor_email, reversal_requested_at, reversal_responded_at, reversal_approved, acknowledgement_status, interaction_id, submitted_at')
          .not('reversal_requested_at', 'is', null);

        // Apply email filter
        if (emailFilter) {
          query = query.eq(emailFilter.field, emailFilter.email);
        }

        // Filter for unprocessed reversals if requested
        if (onlyUnprocessed) {
          query = query.is('reversal_approved', null);
        }

        // Apply date filter for recent reversals (last 30 days for performance)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('reversal_requested_at', thirtyDaysAgo.toISOString());

        query = query
          .order(orderBy, { ascending: orderDirection === 'asc' })
          .limit(limit);

        const { data, error } = await query;

        // If error, table might not have reversal columns - skip silently
        if (error) {
          return {
            data: [],
            error: null, // Don't treat as error - some tables don't have reversals
            scorecard
          };
        }

        return {
          data: data || [],
          error: null,
          scorecard
        };
      } catch (err) {
        console.warn(`Error querying reversals from ${scorecard.table_name}:`, err);
        return {
          data: [],
          error: null,
          scorecard
        };
      }
    });

    return Promise.all(queries);
  }

  /**
   * Clear scorecards cache
   */
  clearCache(): void {
    this.scorecardsCache = null;
    this.cacheTime = 0;
  }
}

// Export singleton instance
export const scorecardQueryService = new ScorecardQueryService();
