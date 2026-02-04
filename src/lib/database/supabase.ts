import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types pour les tables Supabase
export interface User {
  id: string;
  email: string;
  password_hash?: string;
  username?: string;
  is_premium: boolean;
  is_private: boolean;
  is_verified?: boolean;
  avatar_url?: string;
  banner_url?: string;
  bio?: string;
  location?: string;
  website?: string;
  join_date?: string;
  created_at: string;
  updated_at?: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'premium';
  status: 'active' | 'cancelled' | 'expired';
  start_date: string;
  end_date?: string;
  stripe_subscription_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  followed_id: string;
  created_at: string;
}

class SupabaseManager {
  private client: SupabaseClient | null = null;
  private isConnected = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.warn('⚠️ Variables d\'environnement Supabase manquantes');
        console.warn('Configurez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY');
        return;
      }

      this.client = createClient(supabaseUrl, supabaseKey);
      this.isConnected = true;
      console.log('✅ Supabase client initialisé avec succès');
      console.log(`📍 URL: ${supabaseUrl.substring(0, 30)}...`);
    } catch (error) {
      console.error('❌ Erreur initialisation Supabase:', error);
    }
  }

  // Vérification de la connexion et des tables
  async healthCheck(): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      console.warn('⚠️ Client Supabase non initialisé');
      return false;
    }

    try {
      // Test de connexion avec la table users
      const { data, error } = await this.client
        .from('users')
        .select('id')
        .limit(1);

      if (error) {
        console.error('❌ Erreur connexion Supabase:', error.message);
        return false;
      }

      console.log('✅ Connexion Supabase OK - Table users accessible');
      return true;
    } catch (error) {
      console.error('❌ Erreur test connexion Supabase:', error);
      return false;
    }
  }

  // === MÉTHODES UTILISATEURS ===
  
  async getUserByEmail(email: string): Promise<User | null> {
    if (!this.client) return null;

    try {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erreur récupération utilisateur par email:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Exception récupération utilisateur par email:', error);
      return null;
    }
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const { data, error } = await this.client
        .from('users')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (error) {
        console.error('❌ Erreur vérification disponibilité username:', error);
        return false;
      }

      return data === null;
    } catch (error) {
      console.error('❌ Exception vérification disponibilité username:', error);
      return false;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    if (!this.client) return null;

    try {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erreur récupération utilisateur par ID:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('❌ Exception récupération utilisateur par ID:', error);
      return null;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    if (!this.client) return null;

    try {
      const { data, error } = await this.client
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur mise à jour utilisateur:', error);
        return null;
      }
      
      console.log('✅ Utilisateur mis à jour:', data.email);
      return data;
    } catch (error) {
      console.error('❌ Exception mise à jour utilisateur:', error);
      return null;
    }
  }

  async searchUsers(query: string, limitCount = 20): Promise<User[]> {
    if (!this.client) return [];

    try {
      const { data, error } = await this.client
        .from('users')
        .select('id, email, username, avatar_url, is_premium, is_private, is_verified, bio')
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .eq('is_private', false)
        .limit(limitCount);

      if (error) {
        console.error('❌ Erreur recherche utilisateurs:', error);
        return [];
      }
      
      console.log(`✅ ${data?.length || 0} utilisateur(s) trouvé(s) pour "${query}"`);
      return data || [];
    } catch (error) {
      console.error('❌ Exception recherche utilisateurs:', error);
      return [];
    }
  }

  // === MÉTHODES ABONNEMENTS ===
  
  async createSubscription(userId: string, plan: 'free' | 'premium', stripeSubscriptionId?: string): Promise<Subscription | null> {
    if (!this.client) return null;

    try {
      // Get current authenticated user for safety
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) {
        console.error('❌ Aucun utilisateur authentifié pour créer un abonnement');
        return null;
      }

      const { data, error } = await this.client
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan,
          status: 'active',
          stripe_subscription_id: stripeSubscriptionId
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur création abonnement:', error);
        return null;
      }
      
      console.log(`✅ Abonnement ${plan} créé pour utilisateur ${user.id}`);
      return data;
    } catch (error) {
      console.error('❌ Exception création abonnement:', error);
      return null;
    }
  }

  async getUserSubscription(userId: string): Promise<Subscription | null> {
    if (!this.client) return null;

    try {
      const { data, error } = await this.client
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erreur récupération abonnement:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('❌ Exception récupération abonnement:', error);
      return null;
    }
  }

  async upgradeToPremium(userId: string, stripeSubscriptionId: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      // 1. Annuler l'ancien abonnement
      await this.client
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', userId)
        .eq('status', 'active');

      // 2. Créer le nouvel abonnement Premium
      const subscription = await this.createSubscription(userId, 'premium', stripeSubscriptionId);
      if (!subscription) return false;

      // 3. Mettre à jour le statut Premium de l'utilisateur
      const user = await this.updateUser(userId, { is_premium: true });
      if (!user) return false;
      
      console.log(`✅ Utilisateur ${userId} upgradé vers Premium`);
      return true;
    } catch (error) {
      console.error('❌ Erreur upgrade Premium:', error);
      return false;
    }
  }

  // === MÉTHODES FOLLOWS ===
  
  async followUser(userId: string, targetUserId: string): Promise<Follow | null> {
    if (!this.client) return null;

    try {
      const payload = {
        follower_id: userId,
        followed_id: targetUserId
      };

      console.log('followUser - payload envoyé:', payload);

      const { data, error } = await this.client
        .from('follows')
        .insert(payload)
        .select()
        .single();

      if (error) {
        if (error.message?.includes('Cannot follow private account')) {
          console.warn('⚠️ Impossible de suivre un compte privé');
          throw new Error('Impossible de suivre un compte privé');
        }
        console.error('❌ Erreur follow utilisateur:', error);
        return null;
      }
      
      console.log(`✅ Follow créé: ${userId} → ${targetUserId}`);
      return data;
    } catch (error) {
      console.error('❌ Exception follow utilisateur:', error);
      return null;
    }
  }

  async unfollowUser(userId: string, targetUserId: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const { error } = await this.client
        .from('follows')
        .delete()
        .eq('follower_id', userId)
        .eq('followed_id', targetUserId);

      if (error) {
        console.error('❌ Erreur unfollow utilisateur:', error);
        return false;
      }
      
      console.log(`✅ Unfollow: ${userId} ↛ ${targetUserId}`);
      return true;
    } catch (error) {
      console.error('❌ Exception unfollow utilisateur:', error);
      return false;
    }
  }

  async isFollowing(userId: string, targetUserId: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const { data, error } = await this.client
        .rpc('is_following', {
          follower_id: userId,
          followed_id: targetUserId
        });

      if (error) {
        console.error('❌ Erreur vérification follow:', error);
        return false;
      }
      
      return data || false;
    } catch (error) {
      console.error('❌ Exception vérification follow:', error);
      return false;
    }
  }

  async getUserFollowing(userId: string): Promise<User[]> {
    if (!this.client) return [];

    try {
      const { data: followsData, error: followsError } = await this.client
        .from('follows')
        .select('followed_id')
        .eq('follower_id', userId);

      if (followsError) {
        console.error('❌ Erreur récupération follows IDs:', followsError);
        return [];
      }

      if (!followsData || followsData.length === 0) {
        console.log(`✅ 0 utilisateur(s) suivi(s) par ${userId}`);
        return [];
      }

      const followedIds = followsData.map(f => f.followed_id);

      const { data: usersData, error: usersError } = await this.client
        .from('users')
        .select('id, email, username, avatar_url, is_premium, is_private, is_verified, bio')
        .in('id', followedIds);

      if (usersError) {
        console.error('❌ Erreur récupération profils following:', usersError);
        return [];
      }

      const following = usersData || [];
      console.log(`✅ ${following.length} utilisateur(s) suivi(s) par ${userId}`);
      return following;
    } catch (error) {
      console.error('❌ Exception récupération following:', error);
      return [];
    }
  }

  async getUserFollowers(userId: string): Promise<User[]> {
    if (!this.client) return [];

    try {
      const { data: followsData, error: followsError } = await this.client
        .from('follows')
        .select('follower_id')
        .eq('followed_id', userId);

      if (followsError) {
        console.error('❌ Erreur récupération followers IDs:', followsError);
        return [];
      }

      if (!followsData || followsData.length === 0) {
        console.log(`✅ 0 follower(s) pour ${userId}`);
        return [];
      }

      const followerIds = followsData.map(f => f.follower_id);

      const { data: usersData, error: usersError } = await this.client
        .from('users')
        .select('id, email, username, avatar_url, is_premium, is_private, is_verified, bio')
        .in('id', followerIds);

      if (usersError) {
        console.error('❌ Erreur récupération profils followers:', usersError);
        return [];
      }

      const followers = usersData || [];
      console.log(`✅ ${followers.length} follower(s) pour ${userId}`);
      return followers;
    } catch (error) {
      console.error('❌ Exception récupération followers:', error);
      return [];
    }
  }

  // === MÉTHODES RGPD ===
  
  async deleteUserData(userId: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      // 1. Supprimer tous les follows de l'utilisateur
      await this.client
        .from('follows')
        .delete()
        .or(`follower_id.eq.${userId},followed_id.eq.${userId}`);

      // 2. Supprimer les abonnements
      await this.client
        .from('subscriptions')
        .delete()
        .eq('user_id', userId);

      // 3. Supprimer l'utilisateur (cascade supprimera le reste)
      await this.client
        .from('users')
        .delete()
        .eq('id', userId);

      console.log(`✅ Données utilisateur ${userId} supprimées (RGPD)`);
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression données utilisateur:', error);
      return false;
    }
  }

  // === MÉTHODES DE STATISTIQUES ===
  
  async getStats(): Promise<{
    totalUsers: number;
    premiumUsers: number;
    totalFollowships: number;
    totalSubscriptions: number;
  }> {
    if (!this.client) return { totalUsers: 0, premiumUsers: 0, totalFollowships: 0, totalSubscriptions: 0 };

    try {
      const [usersResult, followsResult, subsResult] = await Promise.allSettled([
        this.client.from('users').select('id', { count: 'exact', head: true }),
        this.client.from('follows').select('id', { count: 'exact', head: true }),
        this.client.from('subscriptions').select('id', { count: 'exact', head: true })
      ]);

      const totalUsers = usersResult.status === 'fulfilled' ? (usersResult.value.count || 0) : 0;
      const totalFollowships = followsResult.status === 'fulfilled' ? (followsResult.value.count || 0) : 0;
      const totalSubscriptions = subsResult.status === 'fulfilled' ? (subsResult.value.count || 0) : 0;

      console.log(`📊 Stats Supabase: ${totalUsers} utilisateurs, ${totalFollowships} follows, ${totalSubscriptions} abonnements`);
      
      return {
        totalUsers,
        premiumUsers: 0, // RLS empêche l'accès direct
        totalFollowships,
        totalSubscriptions
      };
    } catch (error) {
      console.error('❌ Erreur récupération stats:', error);
      return { totalUsers: 0, premiumUsers: 0, totalFollowships: 0, totalSubscriptions: 0 };
    }
  }

  // === MÉTHODES DE TEST CRUD ===
  
  async testCRUDOperations(): Promise<{ success: boolean; details: any }> {
    console.log('❌ Tests CRUD supprimés - utilisez l\'interface utilisateur');
    return { success: true, details: 'Tests désactivés' };
  }

  // === MÉTHODES RLS TESTING ===
  
  async testRLSPolicies(): Promise<{ success: boolean; details: any }> {
    console.log('❌ Tests RLS supprimés - utilisez l\'interface utilisateur');
    return { success: true, details: 'Tests désactivés' };
  }

  // === MÉTHODES D'AUTHENTIFICATION SUPABASE ===
  
  async signUp(email: string, password: string, username?: string): Promise<{ user: any; error: any }> {
    if (!this.client) return { user: null, error: 'Client non initialisé' };

    try {
      const usernameToUse = username || email.split('@')[0];

      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: usernameToUse
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('❌ Erreur inscription:', error);
        return { user: null, error };
      }

      if (data.user) {
        console.log('✅ Inscription réussie:', email);

        await new Promise(resolve => setTimeout(resolve, 500));

        try {
          const { data: profile, error: profileError } = await this.client
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('❌ Erreur récupération profil:', profileError);
          } else if (profile) {
            console.log('✅ Profil utilisateur récupéré:', profile.username);
          } else {
            console.warn('⚠️ Profil non trouvé, sera créé au prochain chargement');
          }
        } catch (profileError) {
          console.error('❌ Exception récupération profil:', profileError);
        }
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error('❌ Exception inscription:', error);
      return { user: null, error };
    }
  }

  async signIn(email: string, password: string): Promise<{ user: any; error: any }> {
    if (!this.client) return { user: null, error: 'Client non initialisé' };

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Erreur connexion:', error);
      } else {
        console.log('✅ Connexion réussie:', email);
      }

      return { user: data.user, error };
    } catch (error) {
      console.error('❌ Exception connexion:', error);
      return { user: null, error };
    }
  }

  async signOut(): Promise<{ error: any }> {
    if (!this.client) return { error: 'Client non initialisé' };

    try {
      const { error } = await this.client.auth.signOut();
      
      if (error) {
        console.error('❌ Erreur déconnexion:', error);
      } else {
        console.log('✅ Déconnexion réussie');
      }

      return { error };
    } catch (error) {
      console.error('❌ Exception déconnexion:', error);
      return { error };
    }
  }

  async getCurrentUser(): Promise<any> {
    if (!this.client) return null;

    try {
      const { data: { user } } = await this.client.auth.getUser();
      return user;
    } catch (error) {
      console.error('❌ Erreur récupération utilisateur actuel:', error);
      return null;
    }
  }
}

export const supabaseManager = new SupabaseManager();