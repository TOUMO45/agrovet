import { Inbox } from 'lucide-react'
import OrdersTable from './OrdersTable'
import OrderCard from './OrderCard'

function SkeletonRows() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-hi/50" />
      ))}
    </div>
  )
}

export default function OrdersList({
  orders,
  loading,
  mode = 'active',
  emptyText = 'لا توجد طلبات',
  emptyHint,
  ...handlers
}) {
  if (loading) return <SkeletonRows />

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-hi text-fg-mute">
          <Inbox className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-fg-dim">{emptyText}</p>
        {emptyHint && <p className="text-[12px] text-fg-mute">{emptyHint}</p>}
      </div>
    )
  }

  return (
    <>
      {/* Desktop / tablet: table */}
      <div className="scroll-thin hidden overflow-x-auto md:block">
        <div className="min-w-[760px]">
          <OrdersTable orders={orders} mode={mode} {...handlers} />
        </div>
      </div>

      {/* Mobile: card list */}
      <div className="space-y-2 p-3 md:hidden">
        {orders.map((o) => (
          <OrderCard
            key={o.id}
            order={o}
            mode={mode}
            selected={handlers.selectedIds?.includes(o.id)}
            onToggle={handlers.onToggle}
            onConfirm={handlers.onConfirm}
            onEdit={handlers.onEdit}
            onDelete={handlers.onDelete}
            onRestore={handlers.onRestore}
          />
        ))}
      </div>
    </>
  )
}
