import type { UserDto } from 'src/contracts/user_contracts';
import type { ChannelType, UserRole } from 'src/enums/global_enums';

// Context for command filtering
export interface CommandContext {
  channelType: ChannelType;
  userRole: UserRole;
}

// Base suggestion interface
export interface Suggestion {
  type: 'command' | 'mention';
  value: string;
  label: string;
  description?: string;
  usage?: string;
}

// Command specific types
export interface Command {
  name: string;
  description: string;
  usage: string;
  handler: (args: string[]) => Promise<void> | void;
  requiredChannelType?: ChannelType[];
  requiredUserRole?: UserRole[];
}

export interface CommandSuggestion extends Suggestion {
  type: 'command';
  command: Command;
}

export interface MentionSuggestion extends Suggestion {
  type: 'mention';
  user: UserDto;
}

// Handler interfaces
export interface SuggestionHandler {
  trigger: string;
  getSuggestions: (query: string, context?: CommandContext) => Suggestion[];
  onSelect: (suggestion: Suggestion) => string;
}
