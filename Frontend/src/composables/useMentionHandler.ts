import { ref } from 'vue';
import type { MentionSuggestion, Suggestion, SuggestionHandler } from 'src/types/suggestions';

// === ІМПОРТИ КОНТРАКТІВ ===
// Використовуємо типи, що ви надали раніше, та статус, який ви надали зараз
import type { UserDto } from 'src/contracts/user_contracts';
import { UserStatus } from 'src/enums/global_enums'; // <--- Використовуємо лише ці енуми
// ==========================

// Допоміжна функція для перевірки статусу (використовує ваші значення енуму)
const isOnline = (user: UserDto): boolean => {
  return user.status === UserStatus.ONLINE;
};

// Mock users for the current chat
// ВИПРАВЛЕНО: Використовуємо UserDto та числові значення UserStatus
const mockUsers = ref<UserDto[]>([
  {
    id: '1',
    nickname: 'alice',
    firstName: 'Alice',
    lastName: 'Smith',
    status: UserStatus.ONLINE, // 1
    lastSeenAt: '2025-12-13T10:00:00.000Z',
  },
  {
    id: '2',
    nickname: 'bob',
    firstName: 'Bob',
    lastName: 'Johnson',
    status: UserStatus.ONLINE, // 1
    lastSeenAt: '2025-12-13T10:01:00.000Z',
  },
  {
    id: '3',
    nickname: 'charlie',
    firstName: 'Charlie',
    lastName: 'Brown',
    status: UserStatus.DND, // 2
    lastSeenAt: '2025-12-13T09:00:00.000Z',
  },
  {
    id: '4',
    nickname: 'david',
    firstName: 'David',
    lastName: 'Lee',
    status: UserStatus.OFFLINE, // 0
    lastSeenAt: '2025-12-12T09:00:00.000Z',
  },
  {
    id: '5',
    nickname: 'john',
    firstName: 'John',
    lastName: 'Doe',
    status: UserStatus.ONLINE, // 1
    lastSeenAt: '2025-12-13T09:30:00.000Z',
  },
]);

export function useMentionHandler(): SuggestionHandler {
  const trigger = '@';

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
        // Сортування: ONLINE першим, потім за нікнеймом
        const aIsOnline = isOnline(a);
        const bIsOnline = isOnline(b);

        if (aIsOnline === bIsOnline) {
          return a.nickname.localeCompare(b.nickname);
        }
        return aIsOnline ? -1 : 1; // -1 = a перед b (ONLINE іде нагору)
      })
      .map(
        (user): MentionSuggestion => ({
          type: 'mention',
          value: `@${user.nickname}`,
          label: user.nickname,
          // Опис, що базується на UserStatus
          description: isOnline(user) ? 'Online' : user.status.toString(), // Показуємо статус
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
  const setUsers = (users: UserDto[]): void => {
    mockUsers.value = users;
  };

  // Method to add a user to the list
  const addUser = (user: UserDto): void => {
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
  const updateUserStatus = (userId: string, newStatus: UserStatus): void => {
    const user = mockUsers.value.find((u) => u.id === userId);
    if (user) {
      user.status = newStatus;
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
    setUsers: (users: UserDto[]) => void;
    addUser: (user: UserDto) => void;
    removeUser: (userId: string) => void;
    updateUserStatus: (userId: string, newStatus: UserStatus) => void;
  };
}
