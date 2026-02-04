import { supabase } from '../supabaseClient';

export interface UserSettings {
  user_id: string;
  show_activity: boolean;
  show_game_journal: boolean;
  notifications: {
    in_app: boolean;
    email: boolean;
    new_followers: boolean;
    replies: boolean;
    likes: boolean;
    game_updates: boolean;
  };
  deletion_requested_at: string | null;
  created_at: string;
  updated_at: string;
}

export const getUserSettings = async (userId?: string): Promise<UserSettings | null> => {
  try {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;

    if (!targetUserId) {
      console.error('No user ID provided');
      return null;
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user settings:', error);
      return null;
    }

    if (!data) {
      const defaultSettings = await createDefaultUserSettings(targetUserId);
      return defaultSettings;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserSettings:', error);
    return null;
  }
};

export const createDefaultUserSettings = async (userId: string): Promise<UserSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .insert({
        user_id: userId,
        show_activity: true,
        show_game_journal: true,
        notifications: {
          in_app: true,
          email: false,
          new_followers: true,
          replies: true,
          likes: true,
          game_updates: true
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating default user settings:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createDefaultUserSettings:', error);
    return null;
  }
};

export const updateUserSettings = async (
  userId: string,
  updates: Partial<Omit<UserSettings, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        ...updates
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error updating user settings:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateUserSettings:', error);
    return false;
  }
};

export const updatePrivacySettings = async (
  userId: string,
  settings: { show_activity?: boolean; show_game_journal?: boolean }
): Promise<boolean> => {
  return updateUserSettings(userId, settings);
};

export const updateNotificationSettings = async (
  userId: string,
  notifications: Partial<UserSettings['notifications']>
): Promise<boolean> => {
  try {
    const currentSettings = await getUserSettings(userId);
    if (!currentSettings) return false;

    const updatedNotifications = {
      ...currentSettings.notifications,
      ...notifications
    };

    return updateUserSettings(userId, { notifications: updatedNotifications });
  } catch (error) {
    console.error('Error in updateNotificationSettings:', error);
    return false;
  }
};

export const requestAccountDeletion = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        deletion_requested_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error requesting account deletion:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in requestAccountDeletion:', error);
    return false;
  }
};
