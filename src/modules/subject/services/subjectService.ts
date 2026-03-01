import subjectApi from '../api/subjectApi'

type FilterParams = {
  pageNumber: number
  pageSize: number
  search?: string
}

const subjectService = {
  filterSubjects: async (params: FilterParams) => {
    const res = await subjectApi.getSubjects(params)

    return {
      items: res.items ?? [],
      totalItems: res.totalItems ?? 0,
    }
  },
}

export default subjectService