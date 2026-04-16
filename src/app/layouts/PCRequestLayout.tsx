import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import type { RequestLayoutOutletContext } from '@/modules/request/requestDetail.types';

export default function PCRequestLayout() {
  const [, setRefreshKey] = useState(0);
  const viewMode: RequestLayoutOutletContext['viewMode'] = 'request';

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.add('scrollbar-hide', 'no-scrollbar');
    body.classList.add('scrollbar-hide', 'no-scrollbar');
    return () => {
      root.classList.remove('scrollbar-hide', 'no-scrollbar');
      body.classList.remove('scrollbar-hide', 'no-scrollbar');
    };
  }, []);

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <Outlet
        context={
          {
            refreshRequestSidebar: () => setRefreshKey((k) => k + 1),
            viewMode,
          } satisfies RequestLayoutOutletContext
        }
      />
    </div>
  );
}

