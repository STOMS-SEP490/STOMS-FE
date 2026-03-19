import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';


interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  pageNumber: number;
  pageSize: number;
  totalItems: number;

  onPageChange: (page: number) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageNumber,
  pageSize,
  totalItems,
  onPageChange,
}: DataTableProps<TData, TValue>) {
  const totalPages = Math.ceil(totalItems / pageSize);

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
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* TABLE */}
      <div className="rounded-md bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {data.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-gray-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
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
          Hiển thị {(pageNumber - 1) * pageSize + 1}
          {' - '}
          {Math.min(pageNumber * pageSize, totalItems)} trên {totalItems} bản ghi
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
