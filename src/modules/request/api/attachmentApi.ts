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

  create: (payload: AttachmentCreatePayload): Promise<unknown> => {
    return axiosClient.post('/attachments', {
      RequestId: payload.requestId,
      UploadedByMemberId: payload.uploadedByMemberId,
      FileName: payload.fileName,
      FileUrl: payload.fileUrl,
    })
  },

  getByRequestId: async (requestId: number): Promise<unknown> => {
    return axiosClient.get(`/attachments/requests/${requestId}`)
  },
}

export default attachmentApi

