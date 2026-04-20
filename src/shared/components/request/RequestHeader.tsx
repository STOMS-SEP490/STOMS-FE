import { getRequestStatusInfo } from '@/constants/status';

type Props = {
  title: string;
  status: string | number;
};

export default function RequestHeader({ title, status }: Props) {
  const info = getRequestStatusInfo(status);

  return (
    <div className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-slate-200 mb-2">
      <div className="flex justify-between">
        <h5 className="text-xl font-semibold text-[#1a7a99]">{title}</h5>
        <span
          className={`inline-flex items-center whitespace-nowrap shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium ${info.className}`}
        >
          {info.label}
        </span>
      </div>
    </div>
  );
}
