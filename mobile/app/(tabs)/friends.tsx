import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FriendRow } from '@/components/FriendRow';
import { Avatar } from '@/components/Avatar';
import { AppHeader } from '@/components/AppHeader';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useFriendStore } from '@/store/friendStore';
import { useTheme } from '@/context/ThemeContext';
import * as friendsApi from '@/api/friends';

type TabType = 'friends' | 'requests';

export default function FriendsScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; avatar_id: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { friends, pendingRequests, loadFriends, loadPendingRequests, sendRequest, acceptRequest, declineRequest } =
    useFriendStore();

  useEffect(() => {
    loadFriends().catch(console.error);
    loadPendingRequests().catch(console.error);
  }, [loadFriends, loadPendingRequests]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadFriends(), loadPendingRequests()]).catch(console.error);
    setRefreshing(false);
  }

  async function handleSearch(text: string) {
    setSearchQuery(text);
    if (text.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await friendsApi.searchUsers(text);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleSendRequest(userId: string, username: string) {
    try {
      await sendRequest(userId);
      Alert.alert('Gönderildi', `${username} kullanıcısına arkadaşlık isteği gönderildi`);
      setSearchQuery('');
      setSearchResults([]);
    } catch {
      Alert.alert('Hata', 'İstek gönderilemedi');
    }
  }

  async function handleAccept(requestId: string) {
    await acceptRequest(requestId).catch(() => Alert.alert('Hata', 'İşlem başarısız'));
  }

  async function handleDecline(requestId: string) {
    await declineRequest(requestId).catch(() => Alert.alert('Hata', 'İşlem başarısız'));
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        <AppHeader />

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Kullanıcı ara..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searching && <ActivityIndicator style={styles.searchIcon} color={colors.primary} size="small" />}
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={[styles.searchResults, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {searchResults.map((u) => (
              <View key={u.id} style={[styles.searchRow, { borderBottomColor: colors.border }]}>
                <Avatar avatarId={u.avatar_id} size={36} />
                <Text style={[styles.searchUsername, { color: colors.text }]}>{u.username}</Text>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => handleSendRequest(u.id, u.username)}
                >
                  <Text style={styles.addButtonText}>+ Ekle</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'friends' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'friends' ? '#FFFFFF' : colors.textMuted }]}>
              Arkadaşlar ({friends.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'requests' ? '#FFFFFF' : colors.textMuted }]}>
              İstekler {pendingRequests.length > 0 ? `(${pendingRequests.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'friends' ? (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <FriendRow
                id={item.id}
                username={item.username}
                avatarId={item.avatar_id}
                todaySteps={item.today_steps}
              />
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🤝</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Henüz arkadaşın yok.</Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Yukarıdan kullanıcı arayarak arkadaş ekle!</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={pendingRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <FriendRow
                id={item.id}
                username={item.from_user?.username ?? 'Bilinmiyor'}
                avatarId={item.from_user?.avatar_id ?? 1}
                rightAction={
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.acceptBtn, { backgroundColor: colors.success }]}
                      onPress={() => handleAccept(item.id)}
                      accessibilityLabel="Arkadaşlık isteğini kabul et"
                      accessibilityRole="button"
                    >
                      <Text style={styles.acceptText}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.declineBtn, { backgroundColor: colors.danger }]}
                      onPress={() => handleDecline(item.id)}
                      accessibilityLabel="Arkadaşlık isteğini reddet"
                      accessibilityRole="button"
                    >
                      <Text style={styles.declineText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>📭</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Bekleyen istek yok</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  searchIcon: {
    marginLeft: 8,
  },
  searchResults: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  searchUsername: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
  },
  addButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    borderRadius: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  declineBtn: {
    borderRadius: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 4,
  },
});
