import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton, Image } from 'antd';
import { Hash, X, FileText, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';
import type { TransactionListItem } from '../transaction';
import { TRANSACTION_TYPE, TRANSACTION_TYPE_LABEL, getTransactionTypeInfo } from '@/constants/status';

function formatTransactionAmountDisplay(amount: number | undefined, transactionType: number) {
  const abs = Math.abs(amount ?? 0);
  if (transactionType === TRANSACTION_TYPE.EXPENSE) {
    return { className: 'font-semibold text-red-600', text: `- ${abs.toLocaleString('vi-VN')} đ` };
  }
  const a = amount ?? 0;
  return {
    className: `font-semibold ${a >= 0 ? 'text-green-600' : 'text-red-600'}`,
    text: `${a >= 0 ? '+ ' : '- '}${abs.toLocaleString('vi-VN')} đ`,
  };
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="  pt-4 pb-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5 text-[#0078D4]" strokeWidth={1.5} aria-hidden />
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      </div>
      <div>{children}</div>
    </section>
  );
}

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="py-2">
      <div className="text-xs text-slate-600 mb-1">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
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
        'fixed right-0 top-0 z-50 h-full w-[680px] max-w-[96vw]',
        'bg-white shadow-xl',
        'translate-x-0 transition-transform duration-200 ease-out',
      )}>
        <div className="flex h-full flex-col overflow-hidden">
          {/* HEADER */}
          <header className="shrink-0 bg-white px-8 pt-6 pb-5 border-b border-slate-200">
            {loading && !item ? (
              <div className="pr-10">
                <Skeleton active title={{ width: '55%' }} paragraph={{ rows: 1 }} />
              </div>
            ) : item ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-2xl font-semibold text-slate-900">Giao dịch #{item.transactionId}</h2>
                      {typeInfo && (
                        <Badge className={cn('rounded-md px-2 py-0.5 text-xs font-medium border-0', typeInfo.className)}>
                          {typeLabel}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{item.walletName || '—'}</p>
                  </div>
                  <button type="button" onClick={onClose} className="shrink-0 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors" aria-label="Đóng">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {/* Meta bar */}
                <div className="grid grid-cols-3 gap-6 mt-6">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Số tiền</p>
                    <p className={cn('text-lg font-semibold', amountFmt?.className)}>{amountFmt?.text ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Loại</p>
                    <p className="text-sm font-medium text-slate-900">{typeLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Ngày giao dịch</p>
                    <p className="text-sm font-medium text-slate-900">
                      {item.transactionDate ? new Date(item.transactionDate).toLocaleDateString('vi-VN') : '—'}
                    </p>
                  </div>
                </div>
              </>
            ) : null}
          </header>

          {/* BODY */}
          <div className="relative min-h-0 flex-1 overflow-y-auto bg-white px-8 py-2">
            {loading && item && <div className="pointer-events-none absolute inset-0 z-10 bg-white/60" aria-hidden />}
            {loading && !item ? (
              <div className="py-6"><Skeleton active paragraph={{ rows: 5 }} /></div>
            ) : item ? (
              <>
                <Section icon={Hash} title="Thông tin giao dịch">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                    <MetaRow label="Mã giao dịch" value={`#${item.transactionId}`} />
                    <MetaRow label="Quỹ" value={item.walletName || '—'} />
                    <MetaRow label="Loại" value={
                      typeInfo ? <Badge className={cn('border-0 text-xs', typeInfo.className)}>{typeLabel}</Badge> : typeLabel
                    } />
                    <MetaRow label="Số tiền" value={
                      amountFmt ? <span className={amountFmt.className}>{amountFmt.text}</span> : '—'
                    } />
                  </div>
                  {item.description && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <MetaRow label="Mô tả" value={item.description} />
                    </div>
                  )}
                </Section>

                {item.createdByName && (
                  <div className="border-t border-slate-200 pt-6 pb-4">
                    <h3 className="text-base font-semibold text-slate-900 mb-4">Người tạo</h3>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
                        {item.createdByAvatar ? (
                          <img
                            src={item.createdByAvatar}
                            alt={item.createdByName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-base font-medium text-slate-600">
                            {item.createdByName.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900">{item.createdByName}</div>
                        {item.createdByEmail && <div className="text-sm text-slate-600">{item.createdByEmail}</div>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                      <MetaRow label="Ngày giao dịch" value={item.transactionDate ? new Date(item.transactionDate).toLocaleString('vi-VN') : '—'} />
                      {item.createdAt && (
                        <MetaRow label="Ngày tạo" value={new Date(item.createdAt).toLocaleString('vi-VN')} />
                      )}
                    </div>
                  </div>
                )}

                {/* Expenses Section */}
                {item.transactionType === TRANSACTION_TYPE.EXPENSE && item.expenses && item.expenses.length > 0 && (
                  <Section icon={FileText} title="Chi tiết khoản chi">
                    <div className="space-y-6">
                      {item.expenses.map((expense) => (
                        <div key={expense.expenseId} className="pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-semibold text-[#0078D4]">Khoản chi #{expense.expenseId}</span>
                            {expense.approvedAt && (
                              <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                Đã duyệt
                              </Badge>
                            )}
                          </div>

                          {expense.taskReport && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-slate-600 mb-3">Báo cáo công việc</div>
                              <div className="space-y-2">
                                <MetaRow label="Tiêu đề" value={expense.taskReport.title} />
                                {expense.taskReport.description && (
                                  <MetaRow label="Mô tả" value={expense.taskReport.description} />
                                )}
                                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                                  {expense.taskReport.requestCode && (
                                    <MetaRow label="Mã yêu cầu" value={<span className="font-mono">{expense.taskReport.requestCode}</span>} />
                                  )}
                                  {expense.taskReport.sessionNo != null && (
                                    <MetaRow label="Buổi học" value={`Buổi ${expense.taskReport.sessionNo}`} />
                                  )}
                                </div>
                                {expense.taskReport.startAt && expense.taskReport.endAt && (
                                  <MetaRow 
                                    label="Thời gian" 
                                    value={`${new Date(expense.taskReport.startAt).toLocaleString('vi-VN')} - ${new Date(expense.taskReport.endAt).toLocaleTimeString('vi-VN')}`} 
                                  />
                                )}
                              </div>
                            </div>
                          )}

                          {expense.paymentImg && (
                            <div className="mb-4">
                              <div className="text-xs font-medium text-slate-600 mb-2">Chứng từ thanh toán</div>
                              <Image
                                src={expense.paymentImg}
                                alt="Chứng từ"
                                className="rounded-lg object-cover"
                                width={140}
                                height={140}
                                preview
                              />
                            </div>
                          )}

                          {expense.approvedByMemberFullName && (
                            <div>
                              <MetaRow 
                                label="Người phê duyệt" 
                                value={
                                  <div>
                                    <div className="font-medium">{expense.approvedByMemberFullName}</div>
                                    {expense.approvedAt && (
                                      <div className="text-xs text-slate-600 mt-0.5">
                                        {new Date(expense.approvedAt).toLocaleString('vi-VN')}
                                      </div>
                                    )}
                                  </div>
                                } 
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
