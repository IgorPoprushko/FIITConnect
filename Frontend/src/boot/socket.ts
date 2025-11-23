import { boot } from 'quasar/wrappers';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $socket: Socket;
  }
}

export default boot(({ app }) => {
  const socket: Socket = io('http://localhost:3333');

  socket.on('server', (data) => {
    console.log('Message from server:', data);
  });

  app.config.globalProperties.$socket = socket;
});
