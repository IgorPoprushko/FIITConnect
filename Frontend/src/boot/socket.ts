import { boot } from 'quasar/wrappers';
import { socketService } from 'src/services/socketService';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $socketService: typeof socketService;
  }
}

export default boot(({ app }) => {
  app.config.globalProperties.$socketService = socketService;
});
