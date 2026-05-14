import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '',
  timeout: 20000,
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Request failed';
    const normalized = new Error(message);
    normalized.status = error?.response?.status;
    normalized.data = error?.response?.data;
    throw normalized;
  }
);

