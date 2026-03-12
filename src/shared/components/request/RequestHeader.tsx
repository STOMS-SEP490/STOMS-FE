type Props = {
  title: string;
  status: string;
};

export default function RequestHeader({ title, status }: Props) {
  const s = String(status ?? '').toLowerCase();
  const statusConfig = (() => {
    if (s.includes('pending') || s.includes('chờ'))
      return { label: 'Chờ duyệt', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (s.includes('approved') || s.includes('đã duyệt'))
      return { label: 'Đã duyệt', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (s.includes('rejected') || s.includes('reject') || s.includes('từ chối'))
      return { label: 'Từ chối', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
    if (s.includes('processing') || s.includes('đang xử lý'))
      return { label: 'Đang xử lý', cls: 'bg-sky-50 text-sky-700 border-sky-200' };
    if (s.includes('draft') || s.includes('nháp'))
      return { label: 'Nháp', cls: 'bg-slate-50 text-slate-700 border-slate-200' };
    return { label: status || '—', cls: 'bg-slate-50 text-slate-700 border-slate-200' };
  })();

  return (
    <div className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-slate-200 mb-2">
      <div className="flex justify-between">
        <h5 className="text-xl font-semibold text-black">{title}</h5>
        <span
          className={`inline-flex items-center whitespace-nowrap shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium ${statusConfig.cls}`}
        >
          {statusConfig.label}
        </span>
      </div>
    </div>
  );
}
