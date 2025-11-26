import { ChannelType } from 'src/types/channels';
import { UserRole } from 'src/types/user';
import type {
    Command,
    CommandSuggestion,
    Suggestion,
    SuggestionHandler,
    CommandContext
} from 'src/types/suggestions';

// Define all available commands with their access requirements
const commands: Command[] = [
    // JOIN commands
    {
        name: '/join',
        description: 'Join a public channel or Create new channel',
        usage: '/join [channel_name]',
        handler: async (args: string[]) => {
            // TODO: Implement join public channel logic
            const channelName = args[0];
            console.log('Joining public channel:', channelName);
        },
    },

    // INVITE commands - different for each context
    {
        name: '/invite',
        description: 'Invite a user to this channel',
        usage: '/invite [nickname]',
        requiredChannelType: [ChannelType.PRIVATE],
        requiredUserRole: [UserRole.ADMIN],
        handler: async (args: string[]) => {
            // TODO: Implement invite to private channel (admin only)
            const username = args[0];
            console.log('[Private/Admin] Inviting user to private channel:', username);
        },
    },
    {
        name: '/invite',
        description: 'Invite a user to this channel. Unban users.',
        usage: '/invite [nickname]',
        requiredChannelType: [ChannelType.PUBLIC],
        requiredUserRole: [UserRole.ADMIN],
        handler: async (args: string[]) => {
            // TODO: Implement invite/unban to public channel (admin only)
            const username = args[0];
            console.log('[Public/Admin] Inviting/unbanning user to public channel:', username);
        },
    },
    {
        name: '/invite',
        description: 'Invite a non-banned user to this channel',
        usage: '/invite [nickname]',
        requiredChannelType: [ChannelType.PUBLIC],
        requiredUserRole: [UserRole.MEMBER],
        handler: async (args: string[]) => {
            // TODO: Implement invite to public channel (normal user, non-banned only)
            const username = args[0];
            console.log('[Public/Normal] Inviting non-banned user to public channel:', username);
        },
    },

    // REVOKE commands
    {
        name: '/revoke',
        description: 'Kick a user from this channel',
        usage: '/revoke [nickname]',
        requiredChannelType: [ChannelType.PRIVATE],
        requiredUserRole: [UserRole.ADMIN],
        handler: async (args: string[]) => {
            // TODO: Implement revoke user logic (admin only)
            const username = args[0];
            console.log('Revoking user:', username);
        },
    },

    // KICK commands
    {
        name: '/kick',
        description: 'Ban a user from this channel',
        usage: '/kick [nickname]',
        requiredChannelType: [ChannelType.PUBLIC],
        requiredUserRole: [UserRole.ADMIN],
        handler: async (args: string[]) => {
            // TODO: Implement kick user logic (admin only)
            const username = args[0];
            console.log('Kicking user:', username);
        },
    },
    {
        name: '/kick',
        description: 'Vote to ban a user from this channel',
        usage: '/kick [nickname]',
        requiredChannelType: [ChannelType.PUBLIC],
        requiredUserRole: [UserRole.MEMBER],
        handler: async (args: string[]) => {
            // TODO: Implement kick user logic (admin only)
            const username = args[0];
            console.log('Kicking user:', username);
        },
    },

    // QUIT commands (available to all users in all channels)
    {
        name: '/quit',
        description: 'Permamently DELETE the channel',
        usage: '/quit',
        requiredChannelType: [ChannelType.PRIVATE, ChannelType.PUBLIC],
        requiredUserRole: [UserRole.ADMIN],
        handler: async () => {
            // TODO: Implement quit channel logic
            console.log('Deleting channel');
        },
    },

    // CANCEL commands (available to all users in all channels)
    {
        name: '/cancel',
        description: 'Leave and DELETE the channel',
        usage: '/cancel',
        requiredChannelType: [ChannelType.PRIVATE, ChannelType.PUBLIC],
        requiredUserRole: [UserRole.ADMIN],
        handler: async () => {
            // TODO: Implement quit channel logic
            console.log('Deleting channel');
        },
    },
    {
        name: '/cancel',
        description: 'Leave the channel',
        usage: '/cancel',
        requiredChannelType: [ChannelType.PRIVATE, ChannelType.PUBLIC],
        requiredUserRole: [UserRole.MEMBER],
        handler: async () => {
            // TODO: Implement cancel typing logic
            console.log('Canceling message');
        },
    },
];

// Helper function to check if command is available in current context
function isCommandAvailable(command: Command, context?: CommandContext): boolean {
    if (!context) return true; // If no context provided, show all commands

    // Check channel type requirement
    if (command.requiredChannelType && command.requiredChannelType.length > 0) {
        if (!command.requiredChannelType.includes(context.channelType)) {
            return false;
        }
    }

    // Check user role requirement
    if (command.requiredUserRole && command.requiredUserRole.length > 0) {
        if (!command.requiredUserRole.includes(context.userRole)) {
            return false;
        }
    }

    return true;
}

export function useCommandHandler(): SuggestionHandler {
    const trigger = '/';

    const getSuggestions = (query: string, context?: CommandContext): Suggestion[] => {
        // Remove the trigger character and normalize
        const searchQuery = query.startsWith(trigger) ? query.slice(1) : query;
        const normalizedQuery = searchQuery.toLowerCase().trim();

        // Filter commands based on:
        // 1. Query match (command name starts with query)
        // 2. Context availability (channel type and user role)
        const availableCommands = commands.filter((cmd) => {
            const commandName = cmd.name.slice(1); // Remove '/' from command name
            const matchesQuery = normalizedQuery === '' || commandName.startsWith(normalizedQuery);
            const isAvailable = isCommandAvailable(cmd, context);

            return matchesQuery && isAvailable;
        });

        // Remove duplicates (keep the most specific version for the context)
        const uniqueCommands = new Map<string, Command>();
        availableCommands.forEach((cmd) => {
            const existing = uniqueCommands.get(cmd.name);
            if (!existing) {
                uniqueCommands.set(cmd.name, cmd);
            } else {
                // Prefer more specific command (with more requirements)
                const existingSpecificity =
                    (existing.requiredChannelType?.length || 0) +
                    (existing.requiredUserRole?.length || 0);
                const currentSpecificity =
                    (cmd.requiredChannelType?.length || 0) +
                    (cmd.requiredUserRole?.length || 0);

                if (currentSpecificity > existingSpecificity) {
                    uniqueCommands.set(cmd.name, cmd);
                }
            }
        });

        return Array.from(uniqueCommands.values()).map((cmd): CommandSuggestion => ({
            type: 'command',
            value: cmd.name,
            label: cmd.name,
            description: cmd.description,
            usage: cmd.usage,
            command: cmd,
        }));
    };

    const onSelect = (suggestion: Suggestion): string => {
        if (suggestion.type === 'command') {
            return `${suggestion.value} `;
        }
        return suggestion.value;
    };

    const executeCommand = async (commandText: string, context?: CommandContext): Promise<boolean> => {
        const parts = commandText.trim().split(/\s+/);
        const commandName = parts[0];
        const args = parts.slice(1);

        // Find the appropriate command based on context
        const availableCommands = commands.filter((cmd) =>
            cmd.name === commandName && isCommandAvailable(cmd, context)
        );

        if (availableCommands.length === 0) {
            console.warn('Command not available in current context:', commandName);
            return false;
        }

        // Use the most specific command for the context
        const command = availableCommands.reduce((prev, curr) => {
            const prevSpecificity =
                (prev.requiredChannelType?.length || 0) +
                (prev.requiredUserRole?.length || 0);
            const currSpecificity =
                (curr.requiredChannelType?.length || 0) +
                (curr.requiredUserRole?.length || 0);

            return currSpecificity > prevSpecificity ? curr : prev;
        });

        try {
            await command.handler(args);
            return true;
        } catch (error) {
            console.error('Error executing command:', error);
            return false;
        }
    };

    return {
        trigger,
        getSuggestions,
        onSelect,
        executeCommand,
    } as SuggestionHandler & {
        executeCommand: (commandText: string, context?: CommandContext) => Promise<boolean>
    };
}