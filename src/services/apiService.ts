import http from '../api/http';

export const exampleService = {
  async getItems() {
    const { data } = await http.get('/items');
    return data;
  },
  async getItem(id: string | number) {
    const { data } = await http.get(`/items/${id}`);
    return data;
  },
};

export default exampleService;
