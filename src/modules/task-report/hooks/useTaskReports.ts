import { useEffect, useState, useCallback } from 'react';
import { taskReportApi } from '../api/taskReportApi';
import type { TaskReport, TaskReportFilterParams } from '../taskReport';

export const useTaskReports = (params: TaskReportFilterParams, refreshKey = 0) => {
  const [data, setData] = useState<TaskReport[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await taskReportApi.getAll(params);
      setData(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } catch (err) {
      console.error('fetch task-reports error:', err);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    refetch();
  }, [refetch, refreshKey]);

  return { data, totalItems, loading, refetch };
};
