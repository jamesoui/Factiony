import { supabase } from '../supabaseClient';

export interface ForumCategory {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

export interface ForumThread {
  id: string;
  game_id: string;
  category_id: string;
  author_id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  is_locked: boolean;
  view_count: number;
  reply_count: number;
  like_count: number;
  last_activity_at: string;
  contains_spoilers: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    username: string;
    avatar_url: string | null;
    is_premium: boolean;
  };
  category?: ForumCategory;
  is_liked?: boolean;
  last_post_author?: {
    username: string;
    avatar_url: string | null;
  };
  last_post_at?: string;
}

export interface ForumPost {
  id: string;
  thread_id: string;
  author_id: string;
  parent_post_id: string | null;
  body: string;
  like_count: number;
  contains_spoilers: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    username: string;
    avatar_url: string | null;
    is_premium: boolean;
  };
  is_liked?: boolean;
  replies?: ForumPost[];
}

export async function getCategories(): Promise<ForumCategory[]> {
  const { data, error } = await supabase
    .from('forum_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getThreads(params: {
  gameId: string;
  categoryId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'activity' | 'replies' | 'likes';
}): Promise<ForumThread[]> {
  const { gameId, categoryId, limit = 50, offset = 0, sortBy = 'activity' } = params;

  let query = supabase
    .from('forum_threads')
    .select(`
      *,
      author:users!forum_threads_author_id_fkey(username, avatar_url, is_premium),
      category:forum_categories(id, key, name, icon)
    `)
    .eq('game_id', gameId);

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  switch (sortBy) {
    case 'replies':
      query = query.order('reply_count', { ascending: false });
      break;
    case 'likes':
      query = query.order('like_count', { ascending: false });
      break;
    case 'activity':
    default:
      query = query.order('is_pinned', { ascending: false }).order('last_activity_at', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();

  if (user && data && data.length > 0) {
    const threadIds = data.map(t => t.id);
    const { data: likesData } = await supabase
      .from('forum_thread_likes')
      .select('thread_id')
      .in('thread_id', threadIds)
      .eq('user_id', user.id);

    const likedSet = new Set(likesData?.map(l => l.thread_id) || []);

    return data.map(thread => ({
      ...thread,
      is_liked: likedSet.has(thread.id)
    }));
  }

  return data || [];
}

export async function searchThreads(params: {
  gameId: string;
  searchQuery: string;
  categoryId?: string;
  sortBy?: 'relevance' | 'activity' | 'replies' | 'likes';
  limit?: number;
  offset?: number;
}): Promise<ForumThread[]> {
  const { gameId, searchQuery, categoryId, sortBy = 'relevance', limit = 50, offset = 0 } = params;

  let query = supabase
    .from('forum_threads')
    .select(`
      *,
      author:users!forum_threads_author_id_fkey(username, avatar_url, is_premium),
      category:forum_categories(id, key, name, icon)
    `)
    .eq('game_id', gameId)
    .textSearch('title', searchQuery, {
      type: 'websearch',
      config: 'english'
    });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  switch (sortBy) {
    case 'replies':
      query = query.order('reply_count', { ascending: false });
      break;
    case 'likes':
      query = query.order('like_count', { ascending: false });
      break;
    case 'activity':
      query = query.order('last_activity_at', { ascending: false });
      break;
    case 'relevance':
    default:
      query = query.order('last_activity_at', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();

  if (user && data && data.length > 0) {
    const threadIds = data.map(t => t.id);
    const { data: likesData } = await supabase
      .from('forum_thread_likes')
      .select('thread_id')
      .in('thread_id', threadIds)
      .eq('user_id', user.id);

    const likedSet = new Set(likesData?.map(l => l.thread_id) || []);

    return data.map(thread => ({
      ...thread,
      is_liked: likedSet.has(thread.id)
    }));
  }

  return data || [];
}

export async function getThreadById(threadId: string): Promise<ForumThread | null> {
  const { data, error } = await supabase
    .from('forum_threads')
    .select(`
      *,
      author:users!forum_threads_author_id_fkey(username, avatar_url, is_premium),
      category:forum_categories(id, key, name, icon)
    `)
    .eq('id', threadId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { data: { user } } = await supabase.auth.getUser();
  let isLiked = false;

  if (user) {
    const { data: userLike } = await supabase
      .from('forum_thread_likes')
      .select('thread_id')
      .eq('thread_id', threadId)
      .eq('user_id', user.id)
      .maybeSingle();
    isLiked = !!userLike;
  }

  return {
    ...data,
    is_liked: isLiked,
  };
}

export async function createThread(params: {
  gameId: string;
  categoryId: string;
  title: string;
  body: string;
  containsSpoilers?: boolean;
}): Promise<ForumThread> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: thread, error: threadError } = await supabase
    .from('forum_threads')
    .insert({
      game_id: params.gameId,
      category_id: params.categoryId,
      author_id: user.id,
      title: params.title,
      body: params.body,
      contains_spoilers: params.containsSpoilers || false,
    })
    .select()
    .single();

  if (threadError) throw threadError;

  const fullThread = await getThreadById(thread.id);
  if (!fullThread) throw new Error('Failed to fetch created thread');

  return fullThread;
}

export async function updateThread(
  threadId: string,
  updates: {
    title?: string;
    body?: string;
    containsSpoilers?: boolean;
  }
): Promise<void> {
  const updateData: any = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.body !== undefined) updateData.body = updates.body;
  if (updates.containsSpoilers !== undefined)
    updateData.contains_spoilers = updates.containsSpoilers;

  updateData.updated_at = new Date().toISOString();

  if (Object.keys(updateData).length > 1) {
    const { error } = await supabase
      .from('forum_threads')
      .update(updateData)
      .eq('id', threadId);

    if (error) throw error;
  }
}

export async function deleteThread(threadId: string): Promise<void> {
  const { error } = await supabase
    .from('forum_threads')
    .delete()
    .eq('id', threadId);

  if (error) throw error;
}

export async function incrementThreadViews(threadId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_thread_views', {
    thread_id: threadId
  });

  if (error) {
    const { data: thread } = await supabase
      .from('forum_threads')
      .select('view_count')
      .eq('id', threadId)
      .single();

    if (thread) {
      await supabase
        .from('forum_threads')
        .update({ view_count: thread.view_count + 1 })
        .eq('id', threadId);
    }
  }
}

export async function getThreadPosts(threadId: string, limit = 1000, offset = 0): Promise<ForumPost[]> {
  const { data, error } = await supabase
    .from('forum_posts')
    .select(`
      *,
      author:users!forum_posts_author_id_fkey(username, avatar_url, is_premium)
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const { data: { user } } = await supabase.auth.getUser();

  let postsWithLikes = data;
  if (user) {
    const postIds = data.map(p => p.id);
    const { data: likesData } = await supabase
      .from('forum_post_likes')
      .select('post_id')
      .in('post_id', postIds)
      .eq('user_id', user.id);

    const likedSet = new Set(likesData?.map(l => l.post_id) || []);

    postsWithLikes = data.map(post => ({
      ...post,
      is_liked: likedSet.has(post.id)
    }));
  }

  // Organize posts into a tree structure
  const postsMap = new Map<string, ForumPost>();
  const rootPosts: ForumPost[] = [];

  // First pass: create map of all posts
  postsWithLikes.forEach(post => {
    postsMap.set(post.id, { ...post, replies: [] });
  });

  // Second pass: build tree structure
  postsWithLikes.forEach(post => {
    const postWithReplies = postsMap.get(post.id)!;
    if (post.parent_post_id) {
      const parent = postsMap.get(post.parent_post_id);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(postWithReplies);
      } else {
        // Parent not found, treat as root
        rootPosts.push(postWithReplies);
      }
    } else {
      rootPosts.push(postWithReplies);
    }
  });

  return rootPosts;
}

export async function createPost(
  threadId: string,
  body: string,
  containsSpoilers: boolean = false,
  parentPostId: string | null = null
): Promise<ForumPost> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('forum_posts')
    .insert({
      thread_id: threadId,
      author_id: user.id,
      body,
      contains_spoilers: containsSpoilers,
      parent_post_id: parentPostId,
    })
    .select(`
      *,
      author:users!forum_posts_author_id_fkey(username, avatar_url, is_premium)
    `)
    .single();

  if (error) throw error;
  return { ...data, is_liked: false, replies: [] };
}

export async function updatePost(
  postId: string,
  body: string,
  containsSpoilers: boolean = false
): Promise<void> {
  const { error } = await supabase
    .from('forum_posts')
    .update({
      body,
      contains_spoilers: containsSpoilers,
      updated_at: new Date().toISOString()
    })
    .eq('id', postId);

  if (error) throw error;
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from('forum_posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function toggleThreadLike(threadId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: existing } = await supabase
    .from('forum_thread_likes')
    .select('thread_id')
    .eq('thread_id', threadId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('forum_thread_likes')
      .delete()
      .eq('thread_id', threadId)
      .eq('user_id', user.id);
    return false;
  } else {
    await supabase
      .from('forum_thread_likes')
      .insert({ thread_id: threadId, user_id: user.id });
    return true;
  }
}

export async function togglePostLike(postId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: existing } = await supabase
    .from('forum_post_likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('forum_post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);
    return false;
  } else {
    await supabase.from('forum_post_likes').insert({ post_id: postId, user_id: user.id });
    return true;
  }
}
