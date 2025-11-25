import { ref } from 'vue';
import type { User, MentionSuggestion, Suggestion, SuggestionHandler, CommandContext } from 'src/types/suggestions';

// Mock users for the current chat
// TODO: Replace with actual user data from store/API
const mockUsers = ref<User[]>([
    { id: '1', username: 'alice', avatar: 'https://cdn.quasar.dev/img/avatar2.jpg', isOnline: true },
    { id: '2', username: 'bob', avatar: 'https://cdn.quasar.dev/img/avatar3.jpg', isOnline: true },
    { id: '3', username: 'charlie', avatar: 'https://cdn.quasar.dev/img/avatar4.jpg', isOnline: false },
    { id: '4', username: 'david', avatar: 'https://cdn.quasar.dev/img/avatar5.jpg', isOnline: true },
    { id: '5', username: 'john', avatar: 'https://cdn.quasar.dev/img/avatar1.jpg', isOnline: false },
]);

export function useMentionHandler(): SuggestionHandler {
    const trigger = '@';

    const getSuggestions = (query: string, _context?: CommandContext): Suggestion[] => {
        // Remove the trigger character and normalize
        const searchQuery = query.startsWith(trigger) ? query.slice(1) : query;
        const normalizedQuery = searchQuery.toLowerCase().trim();

        return mockUsers.value
            .filter((user) => {
                // If query is empty, show all users
                if (normalizedQuery === '') return true;
                // Otherwise filter by username starting with query
                return user.username.toLowerCase().startsWith(normalizedQuery);
            })
            .sort((a, b) => {
                // Sort online users first
                if (a.isOnline === b.isOnline) {
                    return a.username.localeCompare(b.username);
                }
                return a.isOnline ? -1 : 1;
            })
            .map((user): MentionSuggestion => ({
                type: 'mention',
                value: `@${user.username}`,
                label: user.username,
                description: user.isOnline ? 'Online' : 'Offline',
                user,
            }));
    };

    const onSelect = (suggestion: Suggestion): string => {
        if (suggestion.type === 'mention') {
            return `${suggestion.value} `;
        }
        return suggestion.value;
    };

    // Method to update users list (to be called when chat changes or users update)
    const setUsers = (users: User[]): void => {
        mockUsers.value = users;
    };

    // Method to add a user to the list
    const addUser = (user: User): void => {
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
        setUsers: (users: User[]) => void;
        addUser: (user: User) => void;
        removeUser: (userId: string) => void;
        updateUserStatus: (userId: string, isOnline: boolean) => void;
    };
}