import React, { useState } from 'react';
import { Camera, Save, X, Upload, Plus, Trash2, Crown, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { mockGames } from '../../data/mockData';
import { supabase } from '../../lib/supabaseClient';
import AvatarDisplay from '../AvatarDisplay';

interface ProfileEditViewProps {
  onViewChange?: (view: string) => void;
}

const ProfileEditView: React.FC<ProfileEditViewProps> = ({ onViewChange }) => {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    location: user?.location || '',
    avatar: user?.avatar || '',
    banner: user?.banner || '',
    customLists: user?.customLists || [],
    preferences: {
      privacy: user?.preferences?.privacy || 'public',
      notifications: user?.preferences?.notifications ?? true,
      language: user?.preferences?.language || 'fr'
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [newListName, setNewListName] = useState('');
  const [showAddList, setShowAddList] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [selectedGamesForList, setSelectedGamesForList] = useState<Record<string, string[]>>({});
  const [gameSearchQuery, setGameSearchQuery] = useState<Record<string, string>>({});

  const defaultBanners = [
    'https://images.pexels.com/photos/1174746/pexels-photo-1174746.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/3945313/pexels-photo-3945313.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1670977/pexels-photo-1670977.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=1200'
  ];

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value
        }
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value
      }));
    }
  };

  /**
   * ✅ Avatar upload (X-style)
   * - Uses Supabase session user as source of truth (auth.uid())
   * - Uploads to bucket: avatars/{uid}/profile.{ext}
   * - upsert=true to replace
   * - Updates public.users.avatar_url
   * - Updates AuthContext user.avatar for immediate UI refresh
   */
  const handleAvatarUpload = async () => {
    try {
      setUploadError(null);

      const {
        data: { user: sessionUser },
        error: sessionErr
      } = await supabase.auth.getUser();

      if (sessionErr) console.error('[AvatarUpload] auth.getUser error:', sessionErr);

      if (!sessionUser?.id) {
        setUploadError('Vous devez être connecté pour télécharger une photo');
        return;
      }

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/jpg,image/png,image/webp';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // Size: 2MB
        if (file.size > 2 * 1024 * 1024) {
          setUploadError('Le fichier est trop volumineux. Taille maximale : 2 MB');
          return;
        }

        // Type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          setUploadError('Format non supporté. Formats acceptés : JPG, PNG, WEBP');
          return;
        }

        try {
          setUploadLoading(true);
          setUploadError(null);

          const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
          const filePath = `${sessionUser.id}/profile.${fileExt}`;

          const { error: uploadErr } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, {
              upsert: true,
              contentType: file.type,
              cacheControl: '3600'
            });

          if (uploadErr) {
            console.error('[AvatarUpload] storage upload error:', uploadErr);
            throw uploadErr;
          }

          const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
          const avatarUrl = publicUrlData?.publicUrl;

          if (!avatarUrl) throw new Error("Impossible d'obtenir l'URL publique de l'avatar");

          // Update form state immediately
          handleInputChange('avatar', avatarUrl);

          // Persist to DB
          const { error: updateErr } = await supabase
            .from('users')
            .update({ avatar_url: avatarUrl })
            .eq('id', sessionUser.id);

          if (updateErr) {
            console.error('[AvatarUpload] users update error:', updateErr);
            throw updateErr;
          }

          // Update auth context for header etc.
          if (user) {
            updateUser({
              ...user,
              avatar: avatarUrl
            });
          }

          console.log('✅ Avatar upload OK:', avatarUrl);
        } catch (err: any) {
          console.error('❌ Erreur upload avatar:', err);
          setUploadError(err?.message || 'Erreur lors du téléchargement');
        } finally {
          setUploadLoading(false);
        }
      };

      input.click();
    } catch (err: any) {
      console.error('❌ Erreur handleAvatarUpload:', err);
      setUploadError(err?.message || 'Erreur lors du téléchargement');
      setUploadLoading(false);
    }
  };

  const handleFileUpload = (type: 'banner') => {
    if (!user?.isPremium) {
      alert('Cette fonctionnalité est réservée aux membres Premium !');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target?.result as string;
        handleInputChange(type, result);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const addCustomList = () => {
    if (!user?.isPremium) {
      alert('Les listes illimitées sont réservées aux membres Premium !');
      return;
    }

    if (newListName.trim()) {
      const newList = {
        id: Date.now().toString(),
        name: newListName.trim(),
        games: []
      };

      handleInputChange('customLists', [...formData.customLists, newList]);

      setSelectedGamesForList((prev) => ({
        ...prev,
        [newList.id]: []
      }));

      setGameSearchQuery((prev) => ({
        ...prev,
        [newList.id]: ''
      }));

      setNewListName('');
      setShowAddList(false);
    }
  };

  const removeCustomList = (listId: string) => {
    handleInputChange(
      'customLists',
      formData.customLists.filter((list: any) => list.id !== listId)
    );

    setSelectedGamesForList((prev) => {
      const next = { ...prev };
      delete next[listId];
      return next;
    });

    setGameSearchQuery((prev) => {
      const next = { ...prev };
      delete next[listId];
      return next;
    });
  };

  const addGameToList = (listId: string, gameId: string) => {
    const currentGames = selectedGamesForList[listId] || [];
    if (currentGames.length < 4 && !currentGames.includes(gameId)) {
      setSelectedGamesForList((prev) => ({
        ...prev,
        [listId]: [...currentGames, gameId]
      }));

      const updatedLists = formData.customLists.map((list: any) =>
        list.id === listId ? { ...list, games: [...currentGames, gameId] } : list
      );
      handleInputChange('customLists', updatedLists);
    }
  };

  const removeGameFromList = (listId: string, gameId: string) => {
    const currentGames = selectedGamesForList[listId] || [];
    const updatedGames = currentGames.filter((id) => id !== gameId);

    setSelectedGamesForList((prev) => ({
      ...prev,
      [listId]: updatedGames
    }));

    const updatedLists = formData.customLists.map((list: any) =>
      list.id === listId ? { ...list, games: updatedGames } : list
    );
    handleInputChange('customLists', updatedLists);
  };

  const getFilteredGamesForList = (listId: string) => {
    const query = gameSearchQuery[listId] || '';
    if (!query.trim()) return mockGames.slice(0, 20);

    return mockGames
      .filter(
        (game: any) =>
          game.title.toLowerCase().includes(query.toLowerCase()) ||
          game.developer.toLowerCase().includes(query.toLowerCase()) ||
          game.genres.some((genre: string) => genre.toLowerCase().includes(query.toLowerCase()))
      )
      .slice(0, 20);
  };

  const handleSave = async () => {
    if (!user?.id) {
      setSaveError('Utilisateur non connecté');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const { db } = await import('../../lib/database');

      const payload: any = {
        username: formData.username.trim(),
        bio: formData.bio.trim(),
        location: formData.location.trim(),
        avatar_url: formData.avatar,
        banner_url: formData.banner
      };

      console.log('💾 Sauvegarde du profil:', payload);

      const updatedProfile = await db.sql.updateUser(user.id, payload);

      if (!updatedProfile) {
        throw new Error('Erreur lors de la sauvegarde du profil');
      }

      console.log('✅ Profil sauvegardé avec succès:', updatedProfile);

      const updatedUser = {
        ...user,
        username: updatedProfile.username,
        bio: updatedProfile.bio || '',
        location: updatedProfile.location || '',
        avatar: updatedProfile.avatar_url || '',
        banner: updatedProfile.banner_url || '',
        customLists: formData.customLists,
        preferences: formData.preferences
      };

      updateUser(updatedUser);

      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
        onViewChange?.('profile');
      }, 1500);
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde profil:', error);
      setSaveError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">{t('profileEdit.title')}</h1>
        <p className="text-gray-400">{t('profileEdit.subtitle')}</p>
      </div>

      <div className="space-y-8">
        {/* Photo de profil */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">{t('profileEdit.profilePicture')}</h2>
          </div>

          <div className="flex items-center space-x-6 mb-6">
            <div className="relative">
              <AvatarDisplay
                avatarUrl={formData.avatar}
                username={user?.username || ''}
                size="xl"
                className="border-2 border-gray-600"
              />
              <button
                onClick={handleAvatarUpload}
                disabled={uploadLoading}
                className="absolute -bottom-2 -right-2 bg-orange-600 rounded-full p-2 hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadLoading ? (
                  <Loader className="h-4 w-4 text-white animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 text-white" />
                )}
              </button>
            </div>

            <div className="flex-1">
              <h3 className="font-medium text-white mb-2">Photo de profil</h3>
              <p className="text-sm text-gray-400 mb-3">JPG, PNG ou WEBP. Taille maximale : 2 MB</p>

              <button
                onClick={handleAvatarUpload}
                disabled={uploadLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
              >
                {uploadLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Téléchargement...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Télécharger une photo</span>
                  </>
                )}
              </button>

              {uploadError && <p className="text-sm text-red-400 mt-2">{uploadError}</p>}
            </div>
          </div>
        </div>

        {/* Photo de couverture - Premium */}
        {user?.isPremium && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Photo de couverture</h2>
              <div className="flex items-center space-x-2 text-yellow-400">
                <Crown className="h-4 w-4" />
                <span className="text-sm">Premium</span>
              </div>
            </div>

            <div className="mb-6">
              <div className="relative h-32 rounded-lg overflow-hidden mb-4">
                <img src={formData.banner || defaultBanners[0]} alt="Bannière" className="w-full h-full object-cover" />
                <button
                  onClick={() => handleFileUpload('banner')}
                  className="absolute top-2 right-2 bg-blue-600 rounded-full p-2 hover:bg-blue-700 transition-colors"
                >
                  <Upload className="h-4 w-4 text-white" />
                </button>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleFileUpload('banner')}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span>Importer une bannière</span>
                </button>
                <span className="text-sm text-gray-400">ou choisissez parmi nos modèles :</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {defaultBanners.map((banner, index) => (
                <button
                  key={index}
                  onClick={() => handleInputChange('banner', banner)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-video ${
                    formData.banner === banner
                      ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <img src={banner} alt={`Bannière ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Informations personnelles */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Informations personnelles</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nom d'utilisateur</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Biographie</label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Parlez-nous de vos jeux préférés..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Localisation</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Votre ville ou région"
              />
            </div>
          </div>
        </div>

        {/* Listes personnalisées - Premium */}
        {user?.isPremium && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Listes personnalisées</h2>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-yellow-400">
                  <Crown className="h-4 w-4" />
                  <span className="text-sm">Premium - Illimité</span>
                </div>
                <button
                  onClick={() => setShowAddList(true)}
                  className="flex items-center space-x-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nouvelle liste</span>
                </button>
              </div>
            </div>

            {showAddList && (
              <div className="mb-4 p-4 bg-gray-700 rounded-lg">
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Suggestions de noms :</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Mes favoris absolus',
                      'Jeux à terminer',
                      'Nostalgie',
                      'Découvertes récentes',
                      'Multijoueur entre amis',
                      'Jeux relaxants',
                      'Défis difficiles',
                      'Indie gems',
                      'Classiques incontournables',
                      "Jeux d'horreur",
                      'RPG épiques',
                      'Jeux de course'
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setNewListName(suggestion)}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-gray-300 rounded-full text-xs transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="Nom de la liste..."
                    className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={addCustomList}
                    disabled={!newListName.trim()}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Créer
                  </button>
                  <button
                    onClick={() => {
                      setShowAddList(false);
                      setNewListName('');
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {formData.customLists.length > 0 ? (
                formData.customLists.map((list: any) => (
                  <div key={list.id} className="p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-white">{list.name}</h3>
                        <p className="text-sm text-gray-400">
                          {selectedGamesForList[list.id]?.length || 0}/4 jeux
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingListId(editingListId === list.id ? null : list.id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                        >
                          {editingListId === list.id ? 'Fermer' : 'Modifier'}
                        </button>
                        <button
                          onClick={() => removeCustomList(list.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {selectedGamesForList[list.id] && selectedGamesForList[list.id].length > 0 && (
                      <div className="mb-3">
                        <div className="grid grid-cols-4 gap-2">
                          {selectedGamesForList[list.id].map((gameId) => {
                            const game = mockGames.find((g: any) => g.id === gameId);
                            return game ? (
                              <div key={gameId} className="relative group">
                                <img src={game.coverImage} alt={game.title} className="w-full h-12 object-cover rounded" />
                                <button
                                  onClick={() => removeGameFromList(list.id, gameId)}
                                  className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  ×
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 rounded-b truncate">
                                  {game.title}
                                </div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    {editingListId === list.id && (
                      <div className="border-t border-gray-600 pt-3">
                        <div className="mb-3">
                          <input
                            type="text"
                            value={gameSearchQuery[list.id] || ''}
                            onChange={(e) =>
                              setGameSearchQuery((prev) => ({
                                ...prev,
                                [list.id]: e.target.value
                              }))
                            }
                            placeholder="Rechercher un jeu..."
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <h4 className="text-sm font-medium text-gray-300 mb-2">
                          Ajouter des jeux ({selectedGamesForList[list.id]?.length || 0}/4) :
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                          {getFilteredGamesForList(list.id).map((game: any) => {
                            const isSelected = selectedGamesForList[list.id]?.includes(game.id);
                            const canAdd = (selectedGamesForList[list.id]?.length || 0) < 4;

                            return (
                              <button
                                key={game.id}
                                onClick={() => {
                                  if (isSelected) removeGameFromList(list.id, game.id);
                                  else if (canAdd) addGameToList(list.id, game.id);
                                }}
                                disabled={!isSelected && !canAdd}
                                className={`relative group transition-all ${
                                  isSelected
                                    ? 'ring-2 ring-green-500'
                                    : canAdd
                                    ? 'hover:ring-2 hover:ring-blue-500'
                                    : 'opacity-50 cursor-not-allowed'
                                }`}
                              >
                                <img src={game.coverImage} alt={game.title} className="w-full h-16 object-cover rounded" />
                                {isSelected && (
                                  <div className="absolute inset-0 bg-green-600 bg-opacity-20 rounded flex items-center justify-center">
                                    <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                                      ✓
                                    </div>
                                  </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 rounded-b truncate">
                                  {game.title}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-600 mb-2">
                    <Plus className="h-8 w-8 mx-auto" />
                  </div>
                  <p className="text-gray-400">Aucune liste personnalisée</p>
                  <p className="text-sm text-gray-500">Créez des listes pour organiser vos jeux</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Préférences */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Préférences</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Confidentialité du profil</label>
              <select
                value={formData.preferences.privacy}
                onChange={(e) => handleInputChange('preferences.privacy', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="public">Public</option>
                <option value="friends">Amis seulement</option>
                <option value="private">Privé</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Langue</label>
              <select
                value={formData.preferences.language}
                onChange={(e) => handleInputChange('preferences.language', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="notifications"
                checked={!!formData.preferences.notifications}
                onChange={(e) => handleInputChange('preferences.notifications', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="notifications" className="ml-2 text-sm text-gray-300">
                Recevoir les notifications par email
              </label>
            </div>
          </div>
        </div>

        {/* Messages de feedback */}
        {saveError && (
          <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
            <p className="font-medium">Erreur lors de la sauvegarde</p>
            <p className="text-sm">{saveError}</p>
          </div>
        )}

        {saveSuccess && (
          <div className="bg-green-900/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg">
            <p className="font-medium">Profil sauvegardé avec succès</p>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => onViewChange?.('profile')}
            disabled={isSaving}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center"
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center min-w-[200px] justify-center"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditView;
