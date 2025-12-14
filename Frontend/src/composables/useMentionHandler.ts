import { computed } from 'vue';
import type { MentionSuggestion, Suggestion, SuggestionHandler } from 'src/types/suggestions';

import type { UserDto } from 'src/contracts/user_contracts';
import { UserStatus } from 'src/enums/global_enums';
import { useChatStore } from 'src/stores/chat';

const isOnline = (user: UserDto): boolean => {
  return user.status === UserStatus.ONLINE;
};

export function useMentionHandler(): SuggestionHandler {
  const trigger = '@';
  const chatStore = useChatStore();

  // Use members from the active channel instead of mock data
  const activeMembers = computed(() => chatStore.activeMembers);

  const getSuggestions = (query: string): Suggestion[] => {
    // Remove the trigger character and normalize
    const searchQuery = query.startsWith(trigger) ? query.slice(1) : query;
    const normalizedQuery = searchQuery.toLowerCase().trim();

    return activeMembers.value
      .filter((user) => {
        // If query is empty, show all users
        if (normalizedQuery === '') return true;
        // Otherwise filter by nickname starting with query
        return user.nickname.toLowerCase().startsWith(normalizedQuery);
      })
      .sort((a, b) => {
        const aIsOnline = isOnline(a);
        const bIsOnline = isOnline(b);

        if (aIsOnline === bIsOnline) {
          return a.nickname.localeCompare(b.nickname);
        }
        return aIsOnline ? -1 : 1;
      })
      .map(
        (user): MentionSuggestion => ({
          type: 'mention',
          value: `@${user.nickname}`,
          label: user.nickname,
          description: isOnline(user) ? 'Online' : user.status.toString(),
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

  return {
    trigger,
    getSuggestions,
    onSelect,
  };
}
