import courseService from '@/modules/course/api/courseApi';

export const useCourseContent = () => {
  const fetchList = async () => {
    const res: any = await courseService.getCourses({
      pageNumber: 1,
      pageSize: 100,
      IsActive: true,
    });

    return (res.items ?? []).map((x: any) => ({
      id: x.courseId,
      name: x.courseName,
    }));
  };

  return { fetchList };
};