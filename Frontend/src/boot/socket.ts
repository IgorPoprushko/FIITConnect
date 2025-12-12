import { boot } from 'quasar/wrappers';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { useAuthStore } from 'src/stores/auth';
import { useApi } from 'src/composables/server/useApi';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $socket: Socket;
  }
}

export default boot(({ app }) => {
  const api = useApi();
  const auth = useAuthStore();

  const socket: Socket = io('http://localhost:3333', {
    transports: ['websocket'],
    autoConnect: true,
  });

  socket.on('connect', async () => {
    console.log('WS connected:', socket.id);

    if (!auth.isLoggedIn) return;

    try {
      const channels = await api.getChannels();
      const channelIds = channels.map((c) => c.id);

      socket.emit('user:joinChannels', auth.user?.id, channelIds);

      console.log('Joined rooms:', channelIds);
    } catch (err) {
      console.error('Failed to join channels', err);
    }
  });

  socket.on('disconnect', () => {
    console.warn('WS disconnected');
  });

  socket.on('channel:deleted', (data) => {
    console.log('CHANNEL DELETED', data);
  });

  socket.on('channel:memberJoined', (data) => {
    console.log('MEMBER JOINED', data);
  });

  socket.on('channel:memberLeft', (data) => {
    console.log('MEMBER LEFT', data);
  });

  socket.on('channel:messageSent', (data) => {
    console.log('NEW MESSAGE', data);
  });

  app.config.globalProperties.$socket = socket;
});
