import { Skeleton, Image } from 'antd';
import { X, Calendar, FileText, CheckCircle2, Wallet } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';
import type { TransactionListItem } from '../transaction';
import { TRANSACTION_TYPE, TRANSACTION_TYPE_LABEL, getTransactionTypeInfo } from '@/constants/status';

function formatTransactionAmountDisplay(amount: number | undefined, transactionType: number) {
  const abs = Math.abs(amount ?? 0);
  if (transactionType === TRANSACTION_TYPE.EXPENSE) {
    return { className: 'text-red-600', text: `- ${abs.toLocaleString('vi-VN')} đ` };
  }
  const a = amount ?? 0;
  return {
    className: a >= 0 ? 'text-green-600' : 'text-red-600',
    text: `${a >= 0 ? '+ ' : '- '}${abs.toLocaleString('vi-VN')} đ`,
  };
}

interface TransactionDetailPanelProps {
  item: TransactionListItem | null;
  loading: boolean;
  onClose: () => void;
}

export default function TransactionDetailPanel({ item, loading, onClose }: TransactionDetailPanelProps) {
  const typeInfo = item ? getTransactionTypeInfo(item.transactionType) : null;
  const typeLabel = item ? (TRANSACTION_TYPE_LABEL[item.transactionType] ?? String(item.transactionType)) : '—';
  const amountFmt = item ? formatTransactionAmountDisplay(item.amount, item.transactionType) : null;

  return (
    <>
      <div className="fixed inset-0 z-40 h-full bg-black/20" onClick={onClose} aria-hidden />
      <div className={cn(
        'fixed right-0 top-0 z-50 h-full w-[720px] max-w-[96vw]',
        'bg-white shadow-2xl',
        'translate-x-0 transition-transform duration-200 ease-out',
      )}>
        <div className="flex h-full flex-col overflow-hidden">
          {/* HEADER */}
          <header className="shrink-0 bg-white border-b border-slate-200 px-8 py-5">
            {loading && !item ? (
              <div className="pr-10">
                <Skeleton active title={{ width: '55%' }} paragraph={{ rows: 1 }} />
              </div>
            ) : item ? (
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-slate-900">#{item.transactionId}</h2>
                    {typeInfo && (
                      <Badge className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', typeInfo.className)}>
                        {typeLabel}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="h-4 w-4" />
                      <span>{item.walletName || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>{item.transactionDate ? new Date(item.transactionDate).toLocaleDateString('vi-VN') : '—'}</span>
                    </div>
                  </div>
                  <div className={cn('text-3xl font-bold mt-3', amountFmt?.className)}>{amountFmt?.text ?? '—'}</div>
                </div>
                <button type="button" onClick={onClose} className="shrink-0 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all" aria-label="Đóng">
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : null}
          </header>

          {/* BODY */}
          <div className="relative min-h-0 flex-1 overflow-y-auto px-8 py-5">
            {loading && item && <div className="pointer-events-none absolute inset-0 z-10 bg-white/60" aria-hidden />}
            {loading && !item ? (
              <div className="py-4"><Skeleton active paragraph={{ rows: 5 }} /></div>
            ) : item ? (
              <div className="space-y-5">
                {/* Description */}
                {item.description && (
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Mô tả</div>
                    <p className="text-sm text-slate-700 leading-relaxed">{item.description}</p>
                  </div>
                )}

                {/* Creator Info */}
                {item.createdByName && (
                  <div className="pt-5 border-t border-slate-200">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Người tạo</div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
                        {item.createdByAvatar ? (
                          <img
                            src={item.createdByAvatar}
                            alt={item.createdByName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-base font-bold text-slate-600">
                            {item.createdByName.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{item.createdByName}</div>
                        {item.createdByEmail && <div className="text-sm text-slate-500">{item.createdByEmail}</div>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Ngày giao dịch</div>
                        <div className="text-slate-900">{item.transactionDate ? new Date(item.transactionDate).toLocaleString('vi-VN') : '—'}</div>
                      </div>
                      {item.createdAt && (
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Ngày tạo</div>
                          <div className="text-slate-900">{new Date(item.createdAt).toLocaleString('vi-VN')}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Expenses Section */}
                {item.transactionType === TRANSACTION_TYPE.EXPENSE && item.expenses && item.expenses.length > 0 && (
                  <div className="pt-5 border-t border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="h-5 w-5 text-[#2197C0]" />
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chi tiết khoản chi</div>
                    </div>
                    <div className="space-y-5">
                      {item.expenses.map((expense, idx) => (
                        <div key={expense.expenseId} className={cn(
                          idx < item.expenses!.length - 1 && 'pb-5 border-b border-slate-100'
                        )}>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold text-[#2197C0]">Khoản chi #{expense.expenseId}</span>
                            {expense.approvedAt && (
                              <Badge className="bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full px-2.5 py-1">
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                Đã duyệt
                              </Badge>
                            )}
                          </div>

                          {expense.taskReport && (
                            <div className="bg-slate-50 rounded-lg p-4 mb-3">
                              <div className="text-xs font-semibold text-slate-700 mb-3">Báo cáo công việc</div>
                              <div className="space-y-2.5">
                                <div>
                                  <div className="text-xs text-slate-500 mb-1">Tiêu đề</div>
                                  <div className="text-sm font-medium text-slate-900">{expense.taskReport.title}</div>
                                </div>
                                {expense.taskReport.description && (
                                  <div>
                                    <div className="text-xs text-slate-500 mb-1">Mô tả</div>
                                    <div className="text-sm text-slate-700">{expense.taskReport.description}</div>
                                  </div>
                                )}
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  {expense.taskReport.requestCode && (
                                    <div>
                                      <div className="text-xs text-slate-500 mb-1">Mã yêu cầu</div>
                                      <div className="font-mono text-xs text-slate-900">{expense.taskReport.requestCode}</div>
                                    </div>
                                  )}
                                  {expense.taskReport.sessionNo != null && (
                                    <div>
                                      <div className="text-xs text-slate-500 mb-1">Buổi học</div>
                                      <div className="text-slate-900">Buổi {expense.taskReport.sessionNo}</div>
                                    </div>
                                  )}
                                </div>
                                {expense.taskReport.startAt && expense.taskReport.endAt && (
                                  <div>
                                    <div className="text-xs text-slate-500 mb-1">Thời gian</div>
                                    <div className="text-sm text-slate-900">
                                      {new Date(expense.taskReport.startAt).toLocaleString('vi-VN')} - {new Date(expense.taskReport.endAt).toLocaleTimeString('vi-VN')}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {expense.paymentImg && (
                            <div className="mb-3">
                              <div className="text-xs font-semibold text-slate-500 mb-2">Chứng từ thanh toán</div>
                              <Image
                                src={expense.paymentImg}
                                alt="Chứng từ"
                                className="rounded-lg object-cover border border-slate-200"
                                width={140}
                                height={140}
                                preview
                              />
                            </div>
                          )}

                          {expense.approvedByMemberFullName && (
                            <div className="bg-emerald-50 rounded-lg p-3">
                              <div className="text-xs font-semibold text-emerald-700 mb-1.5">Người phê duyệt</div>
                              <div className="font-semibold text-slate-900">{expense.approvedByMemberFullName}</div>
                              {expense.approvedAt && (
                                <div className="text-xs text-slate-600 mt-1">
                                  {new Date(expense.approvedAt).toLocaleString('vi-VN')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
