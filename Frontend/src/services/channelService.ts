import type {
  ChannelVisual,
  CreateChannelPayload,
  MemberInfo,
  ChannelFullResponse,
} from 'src/types/channels';
import type { AxiosResponse } from 'axios';
import { httpClient } from './httpClient';

class ChannelService {
  async list(): Promise<ChannelVisual[]> {
    const res: AxiosResponse<{ channels: ChannelVisual[] }> = await httpClient.get(
      '/channels'
    );
    return res.data.channels ?? [];
  }

  async create(payload: CreateChannelPayload): Promise<ChannelVisual> {
    const res: AxiosResponse<ChannelVisual> = await httpClient.post('/channels', payload);
    return res.data;
  }

  async getMembers(channelId: string): Promise<MemberInfo[]> {
    const res: AxiosResponse<{ members: MemberInfo[] }> = await httpClient.get(
      `/channels/${channelId}/members`
    );
    return res.data.members ?? [];
  }

  async getChannel(channelId: string): Promise<ChannelFullResponse> {
    const res: AxiosResponse<{ channel: ChannelFullResponse }> = await httpClient.get(
      `/channels/${channelId}`
    );
    return res.data.channel;
  }
}

export const channelService = new ChannelService();
