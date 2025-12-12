import { ref } from 'vue';
import type { MentionSuggestion, Suggestion, SuggestionHandler } from 'src/types/suggestions';
import type { UserInfo } from 'src/types/user';

// Mock users for the current chat
// TODO: Replace with actual user data from store/API
const mockUsers = ref<UserInfo[]>([
  {
    id: '1',
    email: '',
    firstName: '',
    lastName: '',
    nickname: 'alice',
    lastSeenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isOnline: true,
  },
  {
    id: '2',
    email: '',
    firstName: '',
    lastName: '',
    nickname: 'bob',
    lastSeenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isOnline: true,
  },
  {
    id: '3',
    email: '',
    firstName: '',
    lastName: '',
    nickname: 'charlie',
    lastSeenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isOnline: false,
  },
  {
    id: '4',
    email: '',
    firstName: '',
    lastName: '',
    nickname: 'david',
    lastSeenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isOnline: true,
  },
  {
    id: '5',
    email: '',
    firstName: '',
    lastName: '',
    nickname: 'john',
    lastSeenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isOnline: false,
  },
]);

export function useMentionHandler(): SuggestionHandler {
  const trigger = '@';

  // ФІКС: Ми просто видалили _context, бо він нам тут не потрібен
  const getSuggestions = (query: string): Suggestion[] => {
    // Remove the trigger character and normalize
    const searchQuery = query.startsWith(trigger) ? query.slice(1) : query;
    const normalizedQuery = searchQuery.toLowerCase().trim();

    return mockUsers.value
      .filter((user) => {
        // If query is empty, show all users
        if (normalizedQuery === '') return true;
        // Otherwise filter by nickname starting with query
        return user.nickname.toLowerCase().startsWith(normalizedQuery);
      })
      .sort((a, b) => {
        // Sort online users first
        if (a.isOnline === b.isOnline) {
          return a.nickname.localeCompare(b.nickname);
        }
        return a.isOnline ? -1 : 1;
      })
      .map(
        (user): MentionSuggestion => ({
          type: 'mention',
          value: `@${user.nickname}`,
          label: user.nickname,
          description: user.isOnline ? 'Online' : 'Offline',
          user,
        }),
      );
  };

  const onSelect = (suggestion: Suggestion): string => {
    if (suggestion.type === 'mention') {
      return `${suggestion.value} `;
    }
    return suggestion.value;
  };

  // Method to update users list
  const setUsers = (users: UserInfo[]): void => {
    mockUsers.value = users;
  };

  // Method to add a user to the list
  const addUser = (user: UserInfo): void => {
    if (!mockUsers.value.find((u) => u.id === user.id)) {
      mockUsers.value.push(user);
    }
  };

  // Method to remove a user from the list
  const removeUser = (userId: string): void => {
    const index = mockUsers.value.findIndex((u) => u.id === userId);
    if (index !== -1) {
      mockUsers.value.splice(index, 1);
    }
  };

  // Method to update user online status
  const updateUserStatus = (userId: string, isOnline: boolean): void => {
    const user = mockUsers.value.find((u) => u.id === userId);
    if (user) {
      user.isOnline = isOnline;
    }
  };

  return {
    trigger,
    getSuggestions,
    onSelect,
    setUsers,
    addUser,
    removeUser,
    updateUserStatus,
  } as SuggestionHandler & {
    setUsers: (users: UserInfo[]) => void;
    addUser: (user: UserInfo) => void;
    removeUser: (userId: string) => void;
    updateUserStatus: (userId: string, isOnline: boolean) => void;
  };
}
