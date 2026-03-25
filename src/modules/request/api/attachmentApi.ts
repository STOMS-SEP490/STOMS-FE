import axiosClient from '@/shared/lib/axios'

export type AttachmentCreatePayload = {
  requestId: number
  uploadedByMemberId: number
  fileName: string
  fileUrl: string
}

export type AttachmentListItem = {
  attachmentId?: number | null;
  fileName?: string | null;
  fileUrl?: string | null;
};

const attachmentApi = {
  /**
   * POST /api/attachments/requests/{id} (multipart/form-data)
   * BE: [FromForm] List<IFormFile> files => FE cần append với key `files`.
   */
  uploadAttachmentsForRequest: async (
    requestId: number,
    files: File[],
  ): Promise<unknown> => {
    const fd = new FormData()
    files.forEach((file) => fd.append('files', file))

    return axiosClient.post(
      `/attachments/requests/${requestId}`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },

  /**
   * POST /api/attachments (JSON)
   * Dùng khi FE có sẵn `fileUrl` (không upload multipart).
   */
  create: (payload: AttachmentCreatePayload): Promise<unknown> => {
    return axiosClient.post('/attachments', {
      RequestId: payload.requestId,
      UploadedByMemberId: payload.uploadedByMemberId,
      FileName: payload.fileName,
      FileUrl: payload.fileUrl,
    })
  },

  /**
   * GET /api/attachments/requests/{id}
   * BE có thể trả dạng mảng hoặc object chứa danh sách.
   */
  getByRequestId: async (requestId: number): Promise<unknown> => {
    return axiosClient.get(`/attachments/requests/${requestId}`)
  },
}

export default attachmentApi

