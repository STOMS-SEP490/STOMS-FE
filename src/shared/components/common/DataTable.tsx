import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { cn } from '@/shared/lib/utils';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  pageNumber: number;
  pageSize: number;
  totalItems: number;

  onPageChange: (page: number) => void;
  /** Bấm vào hàng (không gồm control tương tác đã stopPropagation) */
  onRowClick?: (row: TData) => void;
  fillHeight?: boolean;
  /** Bảng full-width, padding rộng, kẻ ngang giữa các hàng — đồng bộ với trang thiết bị khả dụng */
  comfortable?: boolean;
  /** fillHeight: khoảng cách bảng ↔ phân trang (mặc định gap-4; tight = gap-2 cho trang cần vừa khung) */
  tableGap?: 'default' | 'tight';
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageNumber,
  pageSize,
  totalItems,
  onPageChange,
  onRowClick,
  fillHeight = false,
  comfortable = false,
  tableGap = 'default',
}: DataTableProps<TData, TValue>) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const fromItem = totalItems === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const toItem = totalItems === 0 ? 0 : Math.min(pageNumber * pageSize, totalItems);

  const table = useReactTable({
    data,
    columns,
    state: {
      pagination: {
        pageIndex: pageNumber - 1,
        pageSize,
      },
    },
    manualPagination: true,
    pageCount: totalPages,
    enableSorting: false,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div
      className={cn(
        'w-full min-w-0',
        fillHeight && tableGap === 'tight' ? 'space-y-2' : 'space-y-4',
      )}
    >
      {/* TABLE */}
      <div
        className={cn(
          'w-full min-w-0',
          'rounded-md bg-white overflow-x-auto',
        )}
      >
        <Table className={comfortable ? 'table-fixed' : undefined}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className={cn(comfortable && 'border-b border-slate-200 hover:bg-transparent')}
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(comfortable && 'h-auto min-h-11 px-4 py-3.5 align-middle')}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {data.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    comfortable && 'border-b border-slate-100 hover:bg-slate-50/60',
                    onRowClick && 'cursor-pointer hover:bg-slate-50/80',
                  )}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                  onClick={
                    onRowClick
                      ? () => {
                          onRowClick(row.original);
                        }
                      : undefined
                  }
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(row.original);
                          }
                        }
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn('text-gray-700', comfortable && 'px-4 py-4 align-middle')}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className={cn(
                    fillHeight ? 'h-40 text-center' : 'h-24 text-center',
                    comfortable && 'px-4 py-4',
                  )}
                >
                  Không có dữ liệu.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Hiển thị {fromItem}
          {' - '}
          {toItem} trên {totalItems} bản ghi
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(pageNumber - 1)}
            disabled={pageNumber <= 1}
          >
            Trước
          </Button>

          <div className="px-3 py-1 text-sm">
            {pageNumber} / {totalPages || 1}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(pageNumber + 1)}
            disabled={pageNumber >= totalPages}
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}
