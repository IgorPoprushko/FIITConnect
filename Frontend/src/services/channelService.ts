// frontend/src/services/channelService.ts

import type { AxiosResponse } from 'axios';
import { httpClient } from './httpClient';

// === ІМПОРТИ КОНТРАКТІВ ===
import type { ChannelDto, JoinChannelPayload, MemberDto } from 'src/contracts/channel_contracts';

// Явно визначаємо, як виглядає повна відповідь від бекенда для DTO
// Примітка: Якщо ChannelFullResponse містить більше полів, ніж ChannelDto,
// тобі потрібно створити окремий ChannelFullDto у контрактах.
// Тут я припускаю, що DTO вже містить достатньо інформації.
type ChannelFullDto = ChannelDto;

class ChannelService {
  /**
   * Отримує список каналів.
   * Очікує: { channels: ChannelDto[] }
   * @returns Promise<ChannelDto[]>
   */
  async list(): Promise<ChannelDto[]> {
    const res: AxiosResponse<{ channels: ChannelDto[] }> = await httpClient.get('/channels');
    // Використовуємо ChannelDto замість ChannelVisual
    return res.data.channels ?? [];
  }

  /**
   * Створює або приєднує до каналу.
   * Очікує: JoinChannelPayload (на відміну від старої CreateChannelPayload)
   * @returns Promise<ChannelDto>
   */
  async create(payload: JoinChannelPayload): Promise<ChannelDto> {
    // Використовуємо JoinChannelPayload замість CreateChannelPayload
    const res: AxiosResponse<ChannelDto> = await httpClient.post('/channels', payload);
    // Очікуємо ChannelDto замість ChannelVisual
    return res.data;
  }

  /**
   * Отримує список учасників каналу.
   * Очікує: { members: MemberDto[] }
   * @returns Promise<MemberDto[]>
   */
  async getMembers(channelId: string): Promise<MemberDto[]> {
    // Використовуємо MemberDto замість MemberInfo
    const res: AxiosResponse<{ members: MemberDto[] }> = await httpClient.get(
      `/channels/${channelId}/members`,
    );
    return res.data.members ?? [];
  }

  /**
   * Отримує повну інформацію про один канал.
   * Очікує: { channel: ChannelFullDto }
   * @returns Promise<ChannelFullDto>
   */
  async getChannel(channelId: string): Promise<ChannelFullDto> {
    // Використовуємо ChannelFullDto замість ChannelFullResponse
    const res: AxiosResponse<{ channel: ChannelFullDto }> = await httpClient.get(
      `/channels/${channelId}`,
    );
    return res.data.channel;
  }
}

export const channelService = new ChannelService();
