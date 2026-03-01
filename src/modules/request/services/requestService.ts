import { requestApi } from '../api/requestApi';
import type {
  RequestFilterParams,
  RequestListItem,
  CreateRequestPayload,
} from '../request';
import type { PaginationResponse } from '@/shared/types/api';

const requestService = {
  async getRequests(
    params?: RequestFilterParams
  ): Promise<PaginationResponse<RequestListItem>> {
    return requestApi.getRequests(params);
  },

  async getRequestById(id: number): Promise<RequestListItem> {
    return requestApi.getById(id);
  },

  async createRequest(data: CreateRequestPayload) {
    return requestApi.create(data);
  },

  async updateRequest(
    id: number,
    data: Partial<CreateRequestPayload>
  ) {
    return requestApi.update(id, data);
  },

  async deleteRequest(id: number) {
    return requestApi.remove(id);
  },
};

export default requestService;