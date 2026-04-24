import { ImageOff } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { getEquipmentStatusColor, getEquipmentStatusDisplay } from '@/constants/status';
import { cn } from '@/shared/lib/utils';

type Props = {
  equipmentName: string;
  equipmentCode: string | number;
  status?: string | number | null;
  imgLink?: string | null;
  /** Hàng meta phía dưới (vd: Danh mục..., Ngày trả...) */
  bottomRow?: React.ReactNode;
};

export default function EquipmentInlineCard({
  equipmentName,
  equipmentCode,
  status,
  imgLink,
  bottomRow,
}: Props) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 flex items-center gap-3">
      <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-50 flex-shrink-0 flex items-center justify-center">
        {imgLink ? (
          <img
            src={imgLink}
            alt={equipmentName}
            className="w-full h-full object-cover"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <ImageOff className="w-5 h-5 text-gray-400" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-medium text-sm text-gray-900 truncate">
              {equipmentName}
            </div>
            <div className="text-xs text-gray-500">
              Mã: {equipmentCode}
            </div>
          </div>
          {status != null && status !== '' && (
            <Badge
              className={cn(
                'text-[11px] flex-shrink-0 px-2 py-0.5 rounded-full font-medium',
                getEquipmentStatusColor(status)
              )}
            >
              {getEquipmentStatusDisplay(status)}
            </Badge>
          )}
        </div>

        {bottomRow && <div className="mt-1 text-[11px] text-gray-500">{bottomRow}</div>}
      </div>
    </div>
  );
}

