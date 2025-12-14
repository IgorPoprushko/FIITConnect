import { ChannelType, UserRole } from 'src/enums/global_enums';
import { useChatStore } from 'src/stores/chat';
import type { ChannelDto, JoinChannelPayload } from 'src/contracts/channel_contracts';
import type {
  Command,
  CommandContext,
  Suggestion,
  SuggestionHandler,
  CommandSuggestion,
} from 'src/types/suggestions';

type ChatStoreType = ReturnType<typeof useChatStore>;

const commands: Command[] = [
  {
    name: '/join',
    description: 'Join a public channel or Create new channel',
    usage: '/join [channel_name]',
    handler: async (args: string[]) => {
      const channelName = args[0];
      if (!channelName) {
        console.warn('Channel name is required');
        return;
      }

      const chat: ChatStoreType = useChatStore();
      await chat.loadChannels();

      const existing = chat.channels.find(
        (c: ChannelDto) => c.name.toLowerCase() === channelName.toLowerCase(),
      );

      if (existing) {
        await chat.setActiveChannel(existing.id);
        return;
      }

      const payload: JoinChannelPayload = { channelName };
      const channel = await chat.createChannel(payload);
      if (channel) {
        await chat.setActiveChannel(channel.id);
      }
    },
  },

  {
    name: '/invite',
    description: 'Invite a user to this channel',
    usage: '/invite [nickname]',
    requiredChannelType: [ChannelType.PRIVATE],
    requiredUserRole: [UserRole.ADMIN],
    handler: (args: string[]) => {
      const username = args[0];
      console.log('[Private/Admin] Inviting user to private channel:', username);
      return Promise.resolve();
    },
  },
  {
    name: '/invite',
    description: 'Invite a user to this channel. Unban users.',
    usage: '/invite [nickname]',
    requiredChannelType: [ChannelType.PUBLIC],
    requiredUserRole: [UserRole.ADMIN],
    handler: (args: string[]) => {
      const username = args[0];
      console.log('[Public/Admin] Inviting/unbanning user to public channel:', username);
      return Promise.resolve();
    },
  },
  {
    name: '/invite',
    description: 'Invite a non-banned user to this channel',
    usage: '/invite [nickname]',
    requiredChannelType: [ChannelType.PUBLIC],
    requiredUserRole: [UserRole.MEMBER],
    handler: (args: string[]) => {
      const username = args[0];
      console.log('[Public/Normal] Inviting non-banned user to public channel:', username);
      return Promise.resolve();
    },
  },

  {
    name: '/revoke',
    description: 'Kick a user from this channel',
    usage: '/revoke [nickname]',
    requiredChannelType: [ChannelType.PRIVATE],
    requiredUserRole: [UserRole.ADMIN],
    handler: (args: string[]) => {
      const username = args[0];
      console.log('Revoking user:', username);
      return Promise.resolve();
    },
  },

  {
    name: '/kick',
    description: 'Ban a user from this channel',
    usage: '/kick [nickname]',
    requiredChannelType: [ChannelType.PUBLIC],
    requiredUserRole: [UserRole.ADMIN],
    handler: (args: string[]) => {
      const username = args[0];
      console.log('Kicking user:', username);
      return Promise.resolve();
    },
  },
  {
    name: '/kick',
    description: 'Vote to ban a user from this channel',
    usage: '/kick [nickname]',
    requiredChannelType: [ChannelType.PUBLIC],
    requiredUserRole: [UserRole.MEMBER],
    handler: (args: string[]) => {
      const username = args[0];
      console.log('Voting to kick user:', username);
      return Promise.resolve();
    },
  },

  {
    name: '/quit',
    description: 'Permamently DELETE the channel',
    usage: '/quit',
    requiredChannelType: [ChannelType.PRIVATE, ChannelType.PUBLIC],
    requiredUserRole: [UserRole.ADMIN],
    handler: async () => {
      console.log('Deleting channel');
    },
  },

  {
    name: '/cancel',
    description: 'Leave and DELETE the channel',
    usage: '/cancel',
    requiredChannelType: [ChannelType.PRIVATE, ChannelType.PUBLIC],
    requiredUserRole: [UserRole.ADMIN],
    handler: async () => {
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
      console.log('Canceling message');
    },
  },
];

function isCommandAvailable(command: Command, context?: CommandContext): boolean {
  if (!context) return true;

  if (command.requiredChannelType?.length) {
    if (!command.requiredChannelType.includes(context.channelType)) return false;
  }
  if (command.requiredUserRole?.length) {
    if (!command.requiredUserRole.includes(context.userRole)) return false;
  }
  return true;
}

export function useCommandHandler(): SuggestionHandler {
  const trigger = '/';

  const getSuggestions = (query: string, context?: CommandContext): Suggestion[] => {
    const searchQuery = query.startsWith(trigger) ? query.slice(1) : query;
    const normalizedQuery = searchQuery.toLowerCase().trim();

    const availableCommands = commands.filter((cmd) => {
      const commandName = cmd.name.slice(1);
      const matchesQuery = normalizedQuery === '' || commandName.startsWith(normalizedQuery);
      const isAvailable = isCommandAvailable(cmd, context);
      return matchesQuery && isAvailable;
    });

    const uniqueCommands = new Map<string, Command>();
    availableCommands.forEach((cmd) => {
      const existing = uniqueCommands.get(cmd.name);
      if (!existing) {
        uniqueCommands.set(cmd.name, cmd);
      } else {
        const existingSpecificity =
          (existing.requiredChannelType?.length || 0) + (existing.requiredUserRole?.length || 0);
        const currentSpecificity =
          (cmd.requiredChannelType?.length || 0) + (cmd.requiredUserRole?.length || 0);
        if (currentSpecificity > existingSpecificity) {
          uniqueCommands.set(cmd.name, cmd);
        }
      }
    });

    return Array.from(uniqueCommands.values()).map(
      (cmd): CommandSuggestion =>
        ({
          type: 'command',
          value: cmd.name,
          label: cmd.name,
          description: cmd.description,
          usage: cmd.usage,
          command: cmd,
        }) as CommandSuggestion,
    );
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

    const availableCommands = commands.filter(
      (cmd) => cmd.name === commandName && isCommandAvailable(cmd, context),
    );

    if (!availableCommands.length) {
      console.warn('Command not available in current context:', commandName);
      return false;
    }

    const command = availableCommands.reduce((prev, curr) => {
      const prevSpecificity =
        (prev.requiredChannelType?.length || 0) + (prev.requiredUserRole?.length || 0);
      const currSpecificity =
        (curr.requiredChannelType?.length || 0) + (curr.requiredUserRole?.length || 0);

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
    executeCommand: (commandText: string, context?: CommandContext) => Promise<boolean>;
  };
}
