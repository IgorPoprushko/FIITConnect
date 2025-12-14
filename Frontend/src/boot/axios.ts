import { boot } from 'quasar/wrappers';
import axios from 'axios';
type AxiosInstance = ReturnType<typeof axios.create>;

declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

const api = axios.create({ baseURL: import.meta.env.VITE_HTTP_URL });

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axios;

  app.config.globalProperties.$api = api;
});

export { api };
