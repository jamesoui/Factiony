import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CacheEntry {
  game_id: string;
  payload: any;
  expires_at: string;
}

function needsMediaEnrichment(payload: any): boolean {
  if (!payload) return true;

  const hasScreenshots = Array.isArray(payload.screenshots) && payload.screenshots.length > 0;
  const hasVideos = payload.videos &&
    (
      (Array.isArray(payload.videos.trailers) && payload.videos.trailers.length > 0) ||
      (Array.isArray(payload.videos.gameplay) && payload.videos.gameplay.length > 0)
    );

  const needsEnrichment = !hasScreenshots || !hasVideos;

  if (needsEnrichment && payload?.name) {
    console.log(`MEDIA_EMPTY_IN_CACHE, re-enriching: ${payload.name}`);
  }

  return needsEnrichment;
}

async function fetchYouTubeTrailers(gameName: string, youtubeApiKey: string): Promise<any[]> {
  try {
    const youtubeQuery = encodeURIComponent(`${gameName} official trailer`);
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${youtubeQuery}&type=video&videoEmbeddable=true&safeSearch=none&order=relevance&maxResults=10&key=${youtubeApiKey}`;

    console.log(`YT_SEARCH_DEBUG: Searching YouTube for "${gameName}"`);

    const searchRes = await fetch(searchUrl);

    if (!searchRes.ok) {
      console.log(`YT_SEARCH_DEBUG: { status: ${searchRes.status}, count: 0 }`);
      return [];
    }

    const searchData = await searchRes.json();
    const searchVideos = searchData.items || [];

    console.log(`YT_SEARCH_DEBUG: { status: ${searchRes.status}, count: ${searchVideos.length} }`);

    if (searchVideos.length === 0) {
      return [];
    }

    const videoIds = searchVideos.map((item: any) => item.id?.videoId).filter(Boolean);
    if (videoIds.length === 0) {
      return [];
    }

    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id=${videoIds.join(',')}&key=${youtubeApiKey}`;

    const videosRes = await fetch(videosUrl);

    if (!videosRes.ok) {
      console.log(`YT_VIDEOS_DEBUG: { status: ${videosRes.status}, embeddableCount: 0 }`);
      return [];
    }

    const videosData = await videosRes.json();
    const allVideos = videosData.items || [];

    const embeddableVideos = allVideos.filter((video: any) => video.status?.embeddable === true);

    const firstEmbeddableTitle = embeddableVideos.length > 0 ? embeddableVideos[0].snippet.title : null;
    console.log(`YT_VIDEOS_DEBUG: { status: ${videosRes.status}, embeddableCount: ${embeddableVideos.length}, firstEmbeddableTitle: "${firstEmbeddableTitle}" }`);

    const trailers: any[] = [];

    for (const video of embeddableVideos) {
      if (trailers.length >= 5) break;

      const videoId = video.id;
      if (!videoId) continue;

      trailers.push({
        title: video.snippet.title,
        provider: 'youtube',
        videoId: videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url || null,
        score: 0
      });
    }

    return trailers;
  } catch (err) {
    console.error('YT_DEBUG: YouTube API error:', err);
    return [];
  }
}

async function resolveRawgIdentifier(inputGameId: string, cachedPayload: any, rawgKey: string | undefined): Promise<{ id: string, source: string }> {
  if (cachedPayload?.id && typeof cachedPayload.id === 'number') {
    return { id: cachedPayload.id.toString(), source: 'payload.id' };
  }

  let cleaned = inputGameId;
  if (cleaned.includes(' (')) {
    cleaned = cleaned.split(' (')[0];
  }
  if (cleaned.includes('_')) {
    const parts = cleaned.split('_');
    if (parts.length > 1 && /^[a-z]{2}$/i.test(parts[parts.length - 1])) {
      cleaned = parts.slice(0, -1).join('_');
    }
  }
  cleaned = cleaned.trim();

  if (/^\d+$/.test(cleaned)) {
    return { id: cleaned, source: 'cleaned_numeric' };
  }

  if (!rawgKey) {
    return { id: cleaned, source: 'slug_fallback' };
  }

  try {
    const slugToResolve = cachedPayload?.slug || cleaned;
    console.log(`🔄 Resolving slug to ID: ${slugToResolve}`);
    const resolveRes = await fetch(`https://api.rawg.io/api/games/${slugToResolve}?key=${rawgKey}`);

    if (resolveRes.ok) {
      const resolveData = await resolveRes.json();
      if (resolveData?.id) {
        console.log(`✅ Resolved slug "${slugToResolve}" to ID: ${resolveData.id}`);
        return { id: resolveData.id.toString(), source: 'resolved_slug' };
      }
    } else {
      console.warn(`⚠️ Failed to resolve slug "${slugToResolve}": ${resolveRes.status}`);
    }
  } catch (err) {
    console.error(`❌ Error resolving slug:`, err);
  }

  return { id: cleaned, source: 'slug_fallback' };
}

function mapStoreIdToSlug(storeId: number): { slug: string; name: string } | null {
  const storeMap: { [key: number]: { slug: string; name: string } } = {
    1: { slug: 'steam', name: 'Steam' },
    2: { slug: 'xbox', name: 'Xbox Store' },
    3: { slug: 'playstation', name: 'PlayStation Store' },
    4: { slug: 'nintendo', name: 'Nintendo Store' },
    5: { slug: 'gog', name: 'GOG' },
    6: { slug: 'epic', name: 'Epic Games' },
  };
  return storeMap[storeId] || null;
}

async function fetchStoresWithLinks(rawgId: string, rawgKey: string): Promise<any[]> {
  if (!rawgKey) return [];

  try {
    const storesUrl = `https://api.rawg.io/api/games/${rawgId}/stores?key=${rawgKey}`;
    console.log(`🛒 Fetching store links: ${storesUrl.replace(/key=[^&]+/, 'key=***')}`);

    const storesRes = await fetch(storesUrl);
    if (!storesRes.ok) {
      console.warn(`⚠️ Stores endpoint returned ${storesRes.status}`);
      return [];
    }

    const storesData = await storesRes.json();
    const results = storesData.results || [];

    console.log(`✅ Found ${results.length} store entries from RAWG`);

    const buyLinks: any[] = [];

    for (const item of results) {
      const storeId = item.store_id || item.store?.id;
      const url = item.url;

      if (!storeId || !url) continue;

      const storeInfo = mapStoreIdToSlug(storeId);
      if (!storeInfo) continue;

      buyLinks.push({
        store: storeInfo.slug,
        name: storeInfo.name,
        url: url
      });
    }

    console.log(`✅ Mapped ${buyLinks.length} store links:`, buyLinks.map(l => l.store));
    return buyLinks;
  } catch (err) {
    console.error('❌ Error fetching store links:', err);
    return [];
  }
}

function needsBuyLinksEnrichment(payload: any): boolean {
  if (!payload) return true;

  const hasBuyLinks = Array.isArray(payload.buy_links) && payload.buy_links.length > 0;

  if (!hasBuyLinks && payload?.name) {
    console.log(`BUY_LINKS_EMPTY_IN_CACHE, re-enriching: ${payload.name}`);
  }

  return !hasBuyLinks;
}

async function enrichCacheWithBuyLinks(
  payload: any,
  gameId: string,
  rawgKey: string | undefined,
  supabase: any,
  cacheKey: string
): Promise<any | null> {
  if (!rawgKey) {
    console.warn(`⚠️ No RAWG key available for buy links enrichment`);
    return null;
  }

  const { id: ident, source: identSource } = await resolveRawgIdentifier(gameId, payload, rawgKey);
  console.log(`BUY_LINKS_ENRICH: { incomingId: ${gameId}, resolvedRawgId: ${ident}, source: ${identSource} }`);

  try {
    const buyLinks = await fetchStoresWithLinks(ident, rawgKey);

    if (buyLinks.length === 0) {
      console.log(`⚠️ No buy links found for game ${gameId}`);
      return null;
    }

    const storesList = buyLinks.map(bl => ({
      name: bl.name,
      url: bl.url
    }));

    const enrichedPayload = {
      ...payload,
      buy_links: buyLinks,
      stores: storesList.length > 0 ? storesList : payload.stores
    };

    console.log(`💾 Updating cache with ${buyLinks.length} buy links for game ${gameId}`);

    const { error: updateError } = await supabase
      .from("api_cache_rawg_igdb")
      .update({
        payload: enrichedPayload,
      })
      .eq("game_id", cacheKey);

    if (updateError) {
      console.error("Cache update error during buy links enrichment:", updateError);
      return null;
    }

    console.log(`✅ Cache enriched with buy links for game ${gameId}`);
    return enrichedPayload;
  } catch (err) {
    console.error("Error during buy links enrichment:", err);
    return null;
  }
}

async function enrichCacheWithMedia(
  payload: any,
  gameId: string,
  rawgKey: string | undefined,
  supabase: any,
  cacheKey: string,
  locale: string
): Promise<any | null> {
  if (!rawgKey) {
    console.warn(`⚠️ No RAWG key available for enrichment`);
    return null;
  }

  const { id: ident, source: identSource } = await resolveRawgIdentifier(gameId, payload, rawgKey);
  console.log(`ID_DEBUG: { incomingId: ${gameId}, resolvedRawgId: ${ident}, source: ${identSource} }`);

  try {
    let rawgScreenshots: any[] = [];
    let rawgVideos: any[] = [];
    let screenshotsStatus = 0;
    let moviesStatus = 0;

    try {
      const screenshotsUrl = `https://api.rawg.io/api/games/${ident}/screenshots?key=${rawgKey}`;
      const screenshotsRes = await fetch(screenshotsUrl);
      screenshotsStatus = screenshotsRes.status;

      if (screenshotsRes.ok) {
        const screenshotsData = await screenshotsRes.json();
        rawgScreenshots = screenshotsData.results?.slice(3, 9).map((s: any) => s.image) || [];
      } else {
        const maskedUrl = screenshotsUrl.replace(/key=[^&]+/, 'key=***');
        console.warn(`⚠️ Screenshots ${screenshotsStatus}: ${maskedUrl}`);
      }
    } catch (err) {
      console.error("Enrichment screenshots error:", err);
    }

    try {
      const moviesUrl = `https://api.rawg.io/api/games/${ident}/movies?key=${rawgKey}`;
      console.log(`MOVIES_URL_DEBUG: ${moviesUrl.replace(/key=[^&]+/, 'key=***')}`);

      const videosRes = await fetch(moviesUrl);
      moviesStatus = videosRes.status;

      if (videosRes.ok) {
        const videosData = await videosRes.json();
        rawgVideos = videosData.results || [];

        const sample = rawgVideos.length > 0 ? {
          name: rawgVideos[0].name,
          preview: rawgVideos[0].preview,
          dataKeys: Object.keys(rawgVideos[0].data || {})
        } : null;

        console.log(`MOVIES_DEBUG: { rawgId: ${ident}, moviesStatus: ${moviesStatus}, moviesCount: ${rawgVideos.length}, sample: ${JSON.stringify(sample)} }`);
      } else {
        const maskedUrl = moviesUrl.replace(/key=[^&]+/, 'key=***');
        console.warn(`⚠️ Movies ${moviesStatus}: ${maskedUrl}`);
        console.log(`MOVIES_DEBUG: { rawgId: ${ident}, moviesStatus: ${moviesStatus}, moviesCount: 0, sample: null }`);
      }
    } catch (err) {
      console.error("Enrichment videos error:", err);
      console.log(`MOVIES_DEBUG: { rawgId: ${ident}, moviesStatus: 'ERROR', moviesCount: 0, sample: null }`);
    }

    const pickMp4Url = (movie: any): string | null => {
      if (!movie?.data) return null;
      return movie.data.max ||
             movie.data['720'] ||
             movie.data['480'] ||
             movie.data['360'] ||
             movie.data['240'] ||
             null;
    };

    const scoreVideo = (title: string): number => {
      const lower = title.toLowerCase();
      let score = 0;

      if (lower.includes('official')) score += 5;
      if (lower.includes('trailer') || lower.includes('reveal') ||
          lower.includes('announcement') || lower.includes('launch')) score += 4;
      if (lower.includes('online') || lower.includes('gta online')) score -= 5;
      if (lower.includes('update') || lower.includes('dlc')) score -= 2;

      return score;
    };

    const playableMovies: any[] = [];

    for (const video of rawgVideos) {
      let videoUrl = pickMp4Url(video);
      let provider = 'rawg_mp4';

      if (!videoUrl) continue;

      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        provider = 'youtube';
      }

      const videoItem = {
        title: video.name || 'Video',
        provider,
        url: videoUrl,
        thumbnail: video.preview || null,
        score: scoreVideo(video.name || '')
      };

      playableMovies.push(videoItem);
    }

    playableMovies.sort((a, b) => b.score - a.score);

    const firstPlayable = playableMovies.length > 0 ? playableMovies[0].url : null;
    console.log(`MOVIES_PLAYABLE_DEBUG: { rawgId: ${ident}, playableCount: ${playableMovies.length}, firstPlayable: ${firstPlayable ? firstPlayable.substring(0, 50) + '...' : null}, topScore: ${playableMovies[0]?.score || 0} }`);

    const trailers: any[] = [];
    const gameplay: any[] = [];

    for (const video of playableMovies) {
      const name = video.title.toLowerCase();
      if (name.includes('trailer') || name.includes('teaser') ||
          name.includes('reveal') || name.includes('launch') ||
          name.includes('announcement')) {
        if (trailers.length < 5) {
          trailers.push(video);
        }
      } else if (name.includes('gameplay') || name.includes('playthrough')) {
        if (gameplay.length < 2) {
          gameplay.push(video);
        }
      }
    }

    if (playableMovies.length === 0) {
      const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
      console.log('YT_KEY_PRESENT:', Boolean(YOUTUBE_API_KEY));

      if (YOUTUBE_API_KEY && payload?.name) {
        console.log(`YT_DEBUG: Attempting YouTube fallback for "${payload.name}"`);
        const ytTrailers = await fetchYouTubeTrailers(payload.name, YOUTUBE_API_KEY);
        trailers.push(...ytTrailers);
      } else {
        console.log('YT_DEBUG: Skipped (no API key or game name)');
      }
    }

    const enrichedPayload = {
      ...payload,
      screenshots: rawgScreenshots.length > 0 ? rawgScreenshots : (payload.screenshots || []),
      videos: {
        trailers: trailers.length > 0 ? trailers : (payload.videos?.trailers || []),
        gameplay: gameplay.length > 0 ? gameplay : (payload.videos?.gameplay || [])
      }
    };

    console.log(`MEDIA_FINAL_DEBUG: { screenshots: ${enrichedPayload.screenshots.length}, trailers: ${enrichedPayload.videos.trailers.length}, gameplay: ${enrichedPayload.videos.gameplay.length} }`);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { error: updateError } = await supabase
      .from("api_cache_rawg_igdb")
      .update({
        payload: enrichedPayload,
        expires_at: expiresAt.toISOString(),
      })
      .eq("game_id", cacheKey);

    if (updateError) {
      console.error("Cache update error during enrichment:", updateError);
      return null;
    }

    console.log(`💾 Cache enriched and updated for game ${gameId}`);
    return enrichedPayload;
  } catch (err) {
    console.error("Error during media enrichment:", err);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const startTime = Date.now();

  try {
    const url = new URL(req.url);
    const gameId = url.searchParams.get("gameId");
    const locale = url.searchParams.get("locale") || "en";

    if (!gameId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing gameId query param" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`📝 [PERF] Fetching game data for: ${gameId} (locale: ${locale})`);
    const isNumericId = /^\d+$/.test(gameId);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RAWG_KEY = Deno.env.get("VITE_RAWG_API_KEY");
    const IGDB_CLIENT_ID = Deno.env.get("VITE_IGDB_CLIENT_ID");
    const IGDB_ACCESS_TOKEN = Deno.env.get("VITE_IGDB_ACCESS_TOKEN");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const dbLookupStart = Date.now();
    console.log(`🔍 Checking games table for: ${gameId}`);
    const { data: gameFromDb, error: gameDbError } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId.toString())
      .maybeSingle();

    const dbLookupMs = Date.now() - dbLookupStart;

    if (gameFromDb && !gameDbError) {
      console.log(`✅ Game found in database: ${gameFromDb.name}`);

      const dataAge = new Date().getTime() - new Date(gameFromDb.updated_at).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      if (dataAge < sevenDays) {
        const daysOld = Math.floor(dataAge / (24 * 60 * 60 * 1000));
        const totalMs = Date.now() - startTime;
        console.log(`✅ [PERF] Using database data (${daysOld} days old) - db_lookup_ms: ${dbLookupMs}, total_ms: ${totalMs}, cache_hit: true, source: db_cache`);

        let currentGameData = gameFromDb;

        if (needsMediaEnrichment(currentGameData)) {
          console.log(`🔄 Database entry missing media, enriching...`);
          const cacheKey = `${gameId}_${locale}`;
          const enrichedPayload = await enrichCacheWithMedia(currentGameData, gameId, RAWG_KEY, supabase, cacheKey, locale);

          if (enrichedPayload) {
            await supabase
              .from("games")
              .update({
                screenshots: enrichedPayload.screenshots,
                videos: enrichedPayload.videos
              })
              .eq("id", gameId.toString());

            currentGameData = enrichedPayload;
          }
        }

        if (needsBuyLinksEnrichment(currentGameData)) {
          console.log(`🔄 Database entry missing buy links, enriching...`);
          const cacheKey = `${gameId}_${locale}`;
          const enrichedPayload = await enrichCacheWithBuyLinks(currentGameData, gameId, RAWG_KEY, supabase, cacheKey);

          if (enrichedPayload) {
            await supabase
              .from("games")
              .update({
                buy_links: enrichedPayload.buy_links,
                stores: enrichedPayload.stores
              })
              .eq("id", gameId.toString());

            currentGameData = enrichedPayload;
          }
        }

        const { data: statsData } = await supabase
          .from('game_stats')
          .select('average_rating')
          .eq('game_id', gameId.toString())
          .maybeSingle();

        currentGameData = {
          ...currentGameData,
          factiony_rating: statsData?.average_rating || null
        };

        return new Response(
          JSON.stringify({ ok: true, game: currentGameData }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=604800"
            },
          }
        );
      } else {
        console.log(`⚠️ Database data is old (${Math.floor(dataAge / (24 * 60 * 60 * 1000))} days), refreshing...`);
      }
    }

    const cacheKey = `${gameId}_${locale}`;
    const { data: cacheEntry, error: cacheError } = await supabase
      .from("api_cache_rawg_igdb")
      .select("*")
      .eq("game_id", cacheKey)
      .maybeSingle();

    if (cacheEntry && new Date(cacheEntry.expires_at) > new Date()) {
      const totalMs = Date.now() - startTime;
      console.log(`✅ [PERF] Cache HIT for game ${gameId} (${locale}) - db_lookup_ms: ${dbLookupMs}, total_ms: ${totalMs}, cache_hit: true, source: api_cache`);

      let currentCacheData = cacheEntry.payload;

      if (needsMediaEnrichment(currentCacheData)) {
        console.log(`🔄 Cache entry missing media, enriching...`);
        const enrichedPayload = await enrichCacheWithMedia(currentCacheData, gameId, RAWG_KEY, supabase, cacheKey, locale);

        if (enrichedPayload) {
          currentCacheData = enrichedPayload;
        } else {
          console.log(`⚠️ Media enrichment failed`);
        }
      }

      if (needsBuyLinksEnrichment(currentCacheData)) {
        console.log(`🔄 Cache entry missing buy links, enriching...`);
        const enrichedPayload = await enrichCacheWithBuyLinks(currentCacheData, gameId, RAWG_KEY, supabase, cacheKey);

        if (enrichedPayload) {
          currentCacheData = enrichedPayload;
        } else {
          console.log(`⚠️ Buy links enrichment failed`);
        }
      }

      const gameIdForStats = currentCacheData?.id?.toString() || gameId.toString();
      const { data: statsData } = await supabase
        .from('game_stats')
        .select('average_rating')
        .eq('game_id', gameIdForStats)
        .maybeSingle();

      currentCacheData = {
        ...currentCacheData,
        factiony_rating: statsData?.average_rating || null
      };

      return new Response(
        JSON.stringify({ ok: true, game: currentCacheData }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=604800"
          },
        }
      );
    }

    const externalFetchStart = Date.now();
    console.log(`🔄 No valid cache found for game ${gameId}, fetching from APIs...`);

    let rawgData: any = null;
    let rawgDataFr: any = null;
    let rawgScreenshots: any[] = [];
    let rawgVideos: any[] = [];
    if (RAWG_KEY) {
      try {
        const rawgEndpoint = isNumericId
          ? `https://api.rawg.io/api/games/${gameId}?key=${RAWG_KEY}`
          : `https://api.rawg.io/api/games/${gameId}?key=${RAWG_KEY}`;

        console.log(`🎮 Fetching from RAWG: ${rawgEndpoint}`);
        const rawgRes = await fetch(rawgEndpoint);
        if (rawgRes.ok) {
          rawgData = await rawgRes.json();
          console.log(`✅ RAWG data fetched successfully`);
          console.log(`PC_REQ_DEBUG: platforms count = ${rawgData?.platforms?.length || 0}`);
          if (rawgData?.platforms) {
            const pcPlatform = rawgData.platforms.find((p: any) => 
              p.platform?.name?.toLowerCase().includes('pc') || p.platform?.slug === 'pc'
            );
            console.log(`PC_REQ_DEBUG: PC platform found = ${!!pcPlatform}, has requirements = ${!!pcPlatform?.requirements}`);
            if (pcPlatform?.requirements) {
              console.log(`PC_REQ_DEBUG: minimum length = ${pcPlatform.requirements.minimum?.length || 0}, recommended length = ${pcPlatform.requirements.recommended?.length || 0}`);
            }
          }
        } else {
          console.warn(`⚠️ RAWG API returned ${rawgRes.status}`);
        }

        if (locale === "fr") {
          const rawgResFr = await fetch(`${rawgEndpoint}&locale=fr`);
          if (rawgResFr.ok) {
            rawgDataFr = await rawgResFr.json();
          }
        }

        const { id: mediaIdent, source: identSource } = await resolveRawgIdentifier(gameId, rawgData, RAWG_KEY);
        console.log(`ID_DEBUG: { incomingId: ${gameId}, resolvedRawgId: ${mediaIdent}, source: ${identSource} }`);

        let screenshotsStatus = 0;
        let moviesStatus = 0;

        try {
          const screenshotsUrl = `https://api.rawg.io/api/games/${mediaIdent}/screenshots?key=${RAWG_KEY}`;
          const screenshotsRes = await fetch(screenshotsUrl);
          screenshotsStatus = screenshotsRes.status;

          if (screenshotsRes.ok) {
            const screenshotsData = await screenshotsRes.json();
            rawgScreenshots = screenshotsData.results?.slice(3, 9).map((s: any) => s.image) || [];
          } else {
            const maskedUrl = screenshotsUrl.replace(/key=[^&]+/, 'key=***');
            console.warn(`⚠️ Screenshots ${screenshotsStatus}: ${maskedUrl}`);
          }
        } catch (err) {
          console.error("RAWG screenshots error:", err);
        }

        try {
          const moviesUrl = `https://api.rawg.io/api/games/${mediaIdent}/movies?key=${RAWG_KEY}`;
          console.log(`MOVIES_URL_DEBUG: ${moviesUrl.replace(/key=[^&]+/, 'key=***')}`);

          const videosRes = await fetch(moviesUrl);
          moviesStatus = videosRes.status;

          if (videosRes.ok) {
            const videosData = await videosRes.json();
            rawgVideos = videosData.results || [];

            const sample = rawgVideos.length > 0 ? {
              name: rawgVideos[0].name,
              preview: rawgVideos[0].preview,
              dataKeys: Object.keys(rawgVideos[0].data || {})
            } : null;

            console.log(`MOVIES_DEBUG: { rawgId: ${mediaIdent}, moviesStatus: ${moviesStatus}, moviesCount: ${rawgVideos.length}, sample: ${JSON.stringify(sample)} }`);
          } else {
            const maskedUrl = moviesUrl.replace(/key=[^&]+/, 'key=***');
            console.warn(`⚠️ Movies ${moviesStatus}: ${maskedUrl}`);
            console.log(`MOVIES_DEBUG: { rawgId: ${mediaIdent}, moviesStatus: ${moviesStatus}, moviesCount: 0, sample: null }`);
          }
        } catch (err) {
          console.error("RAWG videos error:", err);
          console.log(`MOVIES_DEBUG: { rawgId: ${mediaIdent}, moviesStatus: 'ERROR', moviesCount: 0, sample: null }`);
        }
      } catch (err) {
        console.error("RAWG API error:", err);
      }
    }

    let igdbData: any = null;
    let frLocalization: any = null;
    if (IGDB_CLIENT_ID && IGDB_ACCESS_TOKEN && isNumericId) {
      try {
        console.log(`🎯 Fetching from IGDB for ID: ${gameId}`);
        const igdbRes = await fetch("https://api.igdb.com/v4/games", {
          method: "POST",
          headers: {
            "Client-ID": IGDB_CLIENT_ID,
            Authorization: `Bearer ${IGDB_ACCESS_TOKEN}`,
            "Accept": "application/json",
          },
          body: `fields name, total_rating, rating, involved_companies.company.name, involved_companies.publisher, first_release_date, summary, genres.name, platforms.name, cover.url, websites.url, websites.category, slug, themes.name, game_modes.name; where id = ${gameId};`,
        });

        if (igdbRes.ok) {
          const arr = await igdbRes.json();
          igdbData = arr?.[0] ?? null;
          if (igdbData) {
            console.log(`✅ IGDB data fetched successfully`);
          }
        } else {
          console.warn(`⚠️ IGDB API returned ${igdbRes.status}`);
        }

        if (igdbData && locale === "fr") {
          const igdbLocRes = await fetch("https://api.igdb.com/v4/game_localizations", {
            method: "POST",
            headers: {
              "Client-ID": IGDB_CLIENT_ID,
              Authorization: `Bearer ${IGDB_ACCESS_TOKEN}`,
              "Accept": "application/json",
            },
            body: `fields description, summary, locale; where game = ${gameId} & locale = "fr";`,
          });

          if (igdbLocRes.ok) {
            const locArr = await igdbLocRes.json();
            frLocalization = locArr?.[0] ?? null;
          }
        }
      } catch (err) {
        console.error("IGDB API error:", err);
      }
    } else if (IGDB_CLIENT_ID && IGDB_ACCESS_TOKEN && !isNumericId) {
      console.log(`⚠️ Skipping IGDB for slug-based query: ${gameId}`);
    }

    function sanitizeDescription(html: string) {
      if (!html) return html;
      return html
        .replace(/<\/?p>/g, "\n\n")
        .replace(/<\/?br\s*\/?>/g, "\n")
        .replace(/<[^>]+>/g, "")
        .trim();
    }

    async function translateToFrench(text: string) {
      if (!text) return text;
      try {
        const translateUrl = `${SUPABASE_URL}/functions/v1/translate?text=${encodeURIComponent(text)}&from=en&to=fr`;
        const res = await fetch(translateUrl, {
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          return data.translated || text;
        }
        return text;
      } catch (err) {
        console.error("Erreur traduction interne :", err);
        return text;
      }
    }

    const frenchDesc = frLocalization?.description || frLocalization?.summary;
    const englishDesc = rawgData?.description_raw || igdbData?.summary;

    let finalDescription = "";
    if (locale === "fr") {
      if (frenchDesc) {
        finalDescription = frenchDesc;
      } else if (englishDesc) {
        finalDescription = await translateToFrench(englishDesc);
      } else {
        finalDescription = "Description non disponible en français";
      }
    } else {
      finalDescription = englishDesc || "Description not available";
    }

    if (!rawgData && !igdbData) {
      console.error(`❌ No data found for game: ${gameId}`);
      return new Response(
        JSON.stringify({ ok: false, error: "Game not found in any API" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let buyLinks: any[] = [];
    let storesList: any[] = [];

    if (rawgData?.id && RAWG_KEY) {
      const { id: resolvedRawgId } = await resolveRawgIdentifier(gameId, rawgData, RAWG_KEY);
      buyLinks = await fetchStoresWithLinks(resolvedRawgId, RAWG_KEY);
    }

    if (buyLinks.length === 0 && rawgData?.stores && Array.isArray(rawgData.stores)) {
      console.log('⚠️ No direct store links found, using fallback generic links');
      storesList = rawgData.stores
        .filter((s: any) => {
          const name = s.store?.name?.toLowerCase() || "";
          return (
            name.includes("playstation") ||
            name.includes("xbox") ||
            name.includes("steam") ||
            name.includes("nintendo") ||
            name.includes("epic") ||
            name.includes("gog")
          );
        })
        .map((s: any) => ({
          name: s.store.name,
          url: s.url || `https://${s.store.domain}`,
        }));
    } else {
      storesList = buyLinks.map(bl => ({
        name: bl.name,
        url: bl.url
      }));
    }

    if (storesList.length === 0 && igdbData?.websites && Array.isArray(igdbData.websites)) {
      const websiteCategories: { [key: number]: string } = {
        1: "Official",
        13: "Steam",
        16: "Epic Games",
      };

      storesList = igdbData.websites
        .filter((w: any) => [13, 16].includes(w.category))
        .map((w: any) => ({
          name: websiteCategories[w.category] || "Store",
          url: w.url,
        }));
    }

    const pickMp4Url = (movie: any): string | null => {
      if (!movie?.data) return null;
      return movie.data.max ||
             movie.data['720'] ||
             movie.data['480'] ||
             movie.data['360'] ||
             movie.data['240'] ||
             null;
    };

    const scoreVideo = (title: string): number => {
      const lower = title.toLowerCase();
      let score = 0;

      if (lower.includes('official')) score += 5;
      if (lower.includes('trailer') || lower.includes('reveal') ||
          lower.includes('announcement') || lower.includes('launch')) score += 4;
      if (lower.includes('online') || lower.includes('gta online')) score -= 5;
      if (lower.includes('update') || lower.includes('dlc')) score -= 2;

      return score;
    };

    const playableMovies: any[] = [];

    for (const video of rawgVideos) {
      let videoUrl = pickMp4Url(video);
      let provider = 'rawg_mp4';

      if (!videoUrl) continue;

      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        provider = 'youtube';
      }

      const videoItem = {
        title: video.name || 'Video',
        provider,
        url: videoUrl,
        thumbnail: video.preview || null,
        score: scoreVideo(video.name || '')
      };

      playableMovies.push(videoItem);
    }

    playableMovies.sort((a, b) => b.score - a.score);

    const firstPlayable = playableMovies.length > 0 ? playableMovies[0].url : null;
    console.log(`MOVIES_PLAYABLE_DEBUG: { rawgId: ${rawgData?.id || gameId}, playableCount: ${playableMovies.length}, firstPlayable: ${firstPlayable ? firstPlayable.substring(0, 50) + '...' : null}, topScore: ${playableMovies[0]?.score || 0} }`);

    const trailers: any[] = [];
    const gameplay: any[] = [];

    for (const video of playableMovies) {
      const name = video.title.toLowerCase();
      if (name.includes('trailer') || name.includes('teaser') ||
          name.includes('reveal') || name.includes('launch') ||
          name.includes('announcement')) {
        if (trailers.length < 5) {
          trailers.push(video);
        }
      } else if (name.includes('gameplay') || name.includes('playthrough')) {
        if (gameplay.length < 2) {
          gameplay.push(video);
        }
      }
    }

    const gameName = igdbData?.name || rawgData?.name;
    if (playableMovies.length === 0 && gameName) {
      const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
      console.log('YT_KEY_PRESENT:', Boolean(YOUTUBE_API_KEY));

      if (YOUTUBE_API_KEY) {
        console.log(`YT_DEBUG: Attempting YouTube fallback for "${gameName}"`);
        const ytTrailers = await fetchYouTubeTrailers(gameName, YOUTUBE_API_KEY);
        trailers.push(...ytTrailers);
      } else {
        console.log('YT_DEBUG: Skipped (no API key)');
      }
    }

    const extractPCRequirements = async (): Promise<any> => {
      if (!rawgData?.platforms || !Array.isArray(rawgData.platforms)) {
        return {};
      }

      const pcPlatform = rawgData.platforms.find((p: any) =>
        p.platform?.name?.toLowerCase().includes('pc') ||
        p.platform?.slug === 'pc'
      );

      if (!pcPlatform?.requirements) {
        return {};
      }

      const cleanRequirements = (html: string): string => {
        if (!html) return '';
        return html
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<li>/gi, '\n• ')
          .replace(/<\/li>/gi, '')
          .replace(/<ul>/gi, '\n')
          .replace(/<\/ul>/gi, '')
          .replace(/<strong>(.*?)<\/strong>/gi, '$1')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
      };

      let minimumText = cleanRequirements(pcPlatform.requirements.minimum) || null;
      let recommendedText = cleanRequirements(pcPlatform.requirements.recommended) || null;

      if (locale === 'fr') {
        if (minimumText) {
          minimumText = await translateToFrench(minimumText);
        }
        if (recommendedText) {
          recommendedText = await translateToFrench(recommendedText);
        }
      }

      return {
        minimum: minimumText,
        recommended: recommendedText
      };
    };

    const pcRequirements = await extractPCRequirements();

    const gameIdForStats = isNumericId ? gameId : String(rawgData?.id || igdbData?.id || 0);
    const { data: statsData } = await supabase
      .from('game_stats')
      .select('average_rating')
      .eq('game_id', gameIdForStats)
      .maybeSingle();

    const factionyRating = statsData?.average_rating || null;

    const game = {
      id: isNumericId ? Number(gameId) : rawgData?.id || igdbData?.id || 0,
      slug: rawgData?.slug || igdbData?.slug || gameId,
      name: igdbData?.name || rawgData?.name || "Inconnu",
      description_raw: sanitizeDescription(finalDescription),
      metacritic: rawgData?.metacritic
        ? Number(rawgData.metacritic).toFixed(1)
        : igdbData?.rating
        ? Number(igdbData.rating).toFixed(1)
        : "Inconnue",
      factiony_rating: factionyRating,
      playtime: rawgData?.playtime || null,
      released: igdbData?.first_release_date
        ? new Date(igdbData.first_release_date * 1000).toISOString()
        : rawgData?.released || null,
      developers:
        igdbData?.involved_companies
          ?.filter((c: any) => !c.publisher)
          ?.map((c: any) => ({ name: c.company.name })) ||
        rawgData?.developers ||
        [],
      publishers:
        igdbData?.involved_companies
          ?.filter((c: any) => c.publisher)
          ?.map((c: any) => ({ name: c.company.name })) ||
        rawgData?.publishers ||
        [],
      genres:
        igdbData?.genres?.map((g: any) => ({ name: g.name })) ||
        rawgData?.genres ||
        [],
      platforms:
        igdbData?.platforms?.map((p: any) => ({ platform: { name: p.name } })) ||
        rawgData?.platforms ||
        [],
      tags:
        igdbData?.themes?.map((t: any) => ({ name: t.name })) ||
        rawgData?.tags ||
        [],
      pc_requirements: pcRequirements,
      background_image: rawgData?.background_image ||
        (igdbData?.cover?.url
          ? igdbData.cover.url.replace("t_thumb", "t_cover_big")
          : null),
      cover: igdbData?.cover?.url
        ? igdbData.cover.url.replace("t_thumb", "t_cover_big")
        : rawgData?.background_image || null,
      stores: storesList,
      buy_links: buyLinks.length > 0 ? buyLinks : null,
      screenshots: rawgScreenshots,
      videos: {
        trailers,
        gameplay
      }
    };

    console.log(`✨ Game data compiled successfully for: ${game.name}`);
    console.log(`📊 Stores found: ${game.stores.length}`, game.stores);
    console.log(`📝 Description length: ${game.description_raw?.length || 0}`);
    console.log(`MEDIA_FINAL_DEBUG: { screenshots: ${game.screenshots?.length || 0}, trailers: ${game.videos?.trailers?.length || 0}, gameplay: ${game.videos?.gameplay?.length || 0} }`);
    console.log(`PC_REQ_FINAL_DEBUG: { hasMinimum: ${!!game.pc_requirements?.minimum}, hasRecommended: ${!!game.pc_requirements?.recommended} }`);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: upsertError } = await supabase
      .from("api_cache_rawg_igdb")
      .upsert({
        game_id: cacheKey,
        payload: game,
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: "game_id",
      });

    if (upsertError) {
      console.error("Cache upsert error:", upsertError);
    } else {
      console.log(`💾 Cached game ${gameId} until ${expiresAt.toISOString()}`);
    }

    const { error: gamesError } = await supabase
      .from("games")
      .upsert({
        id: game.id.toString(),
        slug: game.slug,
        name: game.name,
        description_raw: game.description_raw,
        metacritic: game.metacritic,
        playtime: game.playtime,
        released: game.released,
        developers: game.developers,
        publishers: game.publishers,
        genres: game.genres,
        platforms: game.platforms,
        tags: game.tags,
        pc_requirements: game.pc_requirements,
        background_image: game.background_image,
        cover: game.cover,
        stores: game.stores,
        buy_links: game.buy_links,
        screenshots: game.screenshots,
        videos: game.videos,
        source: rawgData && igdbData ? 'both' : rawgData ? 'rawg' : 'igdb',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "id",
      });

    if (gamesError) {
      console.error("Games table upsert error:", gamesError);
    } else {
      console.log(`💾 Saved game ${game.name} to games table`);
    }

    const externalFetchMs = Date.now() - externalFetchStart;
    const totalMs = Date.now() - startTime;
    console.log(`✅ [PERF] External API fetch complete - db_lookup_ms: ${dbLookupMs}, external_fetch_ms: ${externalFetchMs}, total_ms: ${totalMs}, cache_hit: false, source: external_api`);

    return new Response(
      JSON.stringify({ ok: true, game }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=604800"
        },
      }
    );
  } catch (err: any) {
    console.error("❌ fetchGameData server error:", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Server error",
        details: err?.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});