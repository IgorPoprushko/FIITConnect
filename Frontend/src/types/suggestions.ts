// Channel and user type enums
export enum ChannelType {
    PRIVATE = 'private',
    PUBLIC = 'public',
}

export enum UserRole {
    ADMIN = 'admin',
    NORMAL = 'normal',
}

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

// Mention specific types
export interface User {
    id: string;
    username: string;
    avatar?: string;
    isOnline?: boolean;
}

export interface MentionSuggestion extends Suggestion {
    type: 'mention';
    user: User;
}

// Handler interfaces
export interface SuggestionHandler {
    trigger: string;
    getSuggestions: (query: string, context?: CommandContext) => Suggestion[];
    onSelect: (suggestion: Suggestion) => string;
}