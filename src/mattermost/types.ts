import type { Client4 } from '@mattermost/client';

export type {
  Channel,
  ChannelMembership,
  ServerChannel,
} from '@mattermost/types/channels';
export type { FileInfo } from '@mattermost/types/files';
export type { Post, PostList, PostSearchResults } from '@mattermost/types/posts';
export type { Team, TeamMembership } from '@mattermost/types/teams';
export type { UserProfile } from '@mattermost/types/users';

export type MattermostApi = Pick<
  Client4,
  | 'getMe'
  | 'getMyTeamMembers'
  | 'getMyChannels'
  | 'getChannel'
  | 'getChannelMembers'
  | 'getTeam'
  | 'getTeamMembers'
  | 'getPosts'
  | 'getPostThread'
  | 'getFileRoute'
  | 'searchUsers'
  | 'searchPostsWithParams'
  | 'createChannel'
  | 'addToChannel'
  | 'createPost'
  | 'createDirectChannel'
  | 'createGroupChannel'
>;

export interface MattermostClientOptions {
  url: string;
  token: string;
}

export interface DownloadedFile {
  bytes: Uint8Array;
  contentLength?: number;
  contentType?: string;
  fileName?: string;
  truncated?: boolean;
}
