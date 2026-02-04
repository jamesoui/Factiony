const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const USE_BATCH_FETCH = true;

interface CachedGame {
  data: any;
  timestamp: number;
}

interface InflightRequest {
  promise: Promise<any>;
  gameIds: string[];
}

class GameDataCache {
  private memoryCache: Map<string, CachedGame> = new Map();
  private inflightBatch: InflightRequest | null = null;
  private inflightSingle: Map<string, Promise<any>> = new Map();
  private batchQueue: Set<string> = new Set();
  private batchTimer: number | null = null;
  private readonly BATCH_DELAY_MS = 50;

  private getCacheKey(gameId: string, locale: string): string {
    return `${locale}:${gameId}`;
  }

  private getFromLocalStorage(key: string): any | null {
    try {
      const item = localStorage.getItem(`game_cache_${key}`);
      if (!item) return null;

      const cached: CachedGame = JSON.parse(item);
      const now = Date.now();

      if (now - cached.timestamp > CACHE_TTL) {
        localStorage.removeItem(`game_cache_${key}`);
        return null;
      }

      return cached.data;
    } catch (err) {
      console.error('LocalStorage read error:', err);
      return null;
    }
  }

  private saveToLocalStorage(key: string, data: any): void {
    try {
      const cached: CachedGame = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(`game_cache_${key}`, JSON.stringify(cached));
    } catch (err) {
      console.error('LocalStorage write error:', err);
    }
  }

  private getCached(cacheKey: string): any | null {
    const memCached = this.memoryCache.get(cacheKey);
    if (memCached) {
      const now = Date.now();
      if (now - memCached.timestamp <= CACHE_TTL) {
        return memCached.data;
      }
      this.memoryCache.delete(cacheKey);
    }

    return this.getFromLocalStorage(cacheKey);
  }

  private setCached(cacheKey: string, data: any): void {
    const cached: CachedGame = {
      data,
      timestamp: Date.now()
    };
    this.memoryCache.set(cacheKey, cached);
    this.saveToLocalStorage(cacheKey, data);
  }

  private async fetchBatchFromServer(gameIds: string[], locale: string): Promise<{ [key: string]: any }> {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-games-data`;
    const params = new URLSearchParams({
      ids: gameIds.join(','),
      locale
    });

    const headers = {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };

    console.log(`🚀 [CACHE] Batch fetch: ${gameIds.length} games`);
    const startTime = Date.now();

    const response = await fetch(`${url}?${params}`, { headers });

    if (!response.ok) {
      throw new Error(`Batch fetch failed: ${response.status}`);
    }

    const result = await response.json();
    const elapsed = Date.now() - startTime;

    console.log(`✅ [CACHE] Batch fetch completed in ${elapsed}ms (${(elapsed / gameIds.length).toFixed(1)}ms per game)`);

    return result.games || {};
  }

  private async fetchSingleFromServer(gameId: string, locale: string): Promise<any> {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-game-data`;
    const params = new URLSearchParams({
      gameId,
      locale
    });

    const headers = {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };

    console.log(`🚀 [CACHE] Single fetch: ${gameId}`);
    const startTime = Date.now();

    const response = await fetch(`${url}?${params}`, { headers });

    if (!response.ok) {
      throw new Error(`Single fetch failed: ${response.status}`);
    }

    const result = await response.json();
    const elapsed = Date.now() - startTime;

    console.log(`✅ [CACHE] Single fetch completed in ${elapsed}ms`);

    return result.game || null;
  }

  async getGame(gameId: string, locale: string = 'en'): Promise<any | null> {
    const cacheKey = this.getCacheKey(gameId, locale);

    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log(`💾 [CACHE] HIT: ${gameId}`);
      return cached;
    }

    if (this.inflightSingle.has(cacheKey)) {
      console.log(`⏳ [CACHE] Waiting for inflight single request: ${gameId}`);
      return this.inflightSingle.get(cacheKey)!;
    }

    if (this.inflightBatch && this.inflightBatch.gameIds.includes(gameId)) {
      console.log(`⏳ [CACHE] Waiting for inflight batch request: ${gameId}`);
      const result = await this.inflightBatch.promise;
      return result[gameId] || null;
    }

    const fetchPromise = (async () => {
      try {
        const game = await this.fetchSingleFromServer(gameId, locale);
        if (game) {
          this.setCached(cacheKey, game);
        }
        return game;
      } finally {
        this.inflightSingle.delete(cacheKey);
      }
    })();

    this.inflightSingle.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  async getGames(gameIds: string[], locale: string = 'en'): Promise<{ [key: string]: any }> {
    if (!USE_BATCH_FETCH) {
      const result: { [key: string]: any } = {};
      for (const gameId of gameIds) {
        result[gameId] = await this.getGame(gameId, locale);
      }
      return result;
    }

    const uniqueIds = [...new Set(gameIds)];
    const result: { [key: string]: any } = {};
    const toFetch: string[] = [];

    for (const gameId of uniqueIds) {
      const cacheKey = this.getCacheKey(gameId, locale);
      const cached = this.getCached(cacheKey);

      if (cached) {
        result[gameId] = cached;
      } else {
        toFetch.push(gameId);
      }
    }

    if (toFetch.length === 0) {
      console.log(`💾 [CACHE] All ${uniqueIds.length} games from cache`);
      return result;
    }

    console.log(`💾 [CACHE] ${uniqueIds.length - toFetch.length}/${uniqueIds.length} from cache, fetching ${toFetch.length}`);

    if (this.inflightBatch && this.inflightBatch.gameIds.some(id => toFetch.includes(id))) {
      console.log(`⏳ [CACHE] Waiting for existing batch request`);
      const batchResult = await this.inflightBatch.promise;

      for (const gameId of toFetch) {
        if (batchResult[gameId]) {
          result[gameId] = batchResult[gameId];
        }
      }

      return result;
    }

    const batchPromise = (async () => {
      try {
        const games = await this.fetchBatchFromServer(toFetch, locale);

        for (const [gameId, game] of Object.entries(games)) {
          if (game) {
            const cacheKey = this.getCacheKey(gameId, locale);
            this.setCached(cacheKey, game);
          }
        }

        return games;
      } finally {
        this.inflightBatch = null;
      }
    })();

    this.inflightBatch = {
      promise: batchPromise,
      gameIds: toFetch
    };

    const fetchedGames = await batchPromise;

    for (const gameId of toFetch) {
      if (fetchedGames[gameId]) {
        result[gameId] = fetchedGames[gameId];
      } else {
        result[gameId] = null;
      }
    }

    return result;
  }

  clearCache(): void {
    this.memoryCache.clear();

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('game_cache_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`🗑️ Cleared ${keysToRemove.length} items from cache`);
    } catch (err) {
      console.error('Error clearing localStorage:', err);
    }
  }

  getCacheStats(): { memorySize: number; localStorageKeys: number } {
    let localStorageKeys = 0;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('game_cache_')) {
          localStorageKeys++;
        }
      }
    } catch (err) {
      console.error('Error reading localStorage stats:', err);
    }

    return {
      memorySize: this.memoryCache.size,
      localStorageKeys
    };
  }
}

export const gameDataCache = new GameDataCache();
