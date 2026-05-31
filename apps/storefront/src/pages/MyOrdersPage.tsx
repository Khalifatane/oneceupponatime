import { Link } from 'react-router'
import myOrdersData from '@/data/my-orders.json'
import Sidebar from '@/components/Sidebar'

export default function MyOrdersPage() {
  const { sidebar, pageContent } = myOrdersData

  const sidebarItems = sidebar.items.filter((item): item is { label: string; href: string; icon: string; active: boolean } => !('divider' in item))
  const hasDivider = sidebar.items.some(item => 'divider' in item)

  return (
    <main className="min-h-screen max-w-7xl mx-auto px-4 py-8">
      <div className="flex gap-12">
        {/* Sidebar */}
        <Sidebar title={sidebar.title} items={sidebarItems} hasDivider={hasDivider} />

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold">{pageContent.title}</h1>
            <span className="text-sm text-gray-500">{pageContent.orderCount} orders</span>
          </div>

          {/* Year Filter */}
          <div className="flex gap-2 mb-6">
            {pageContent.yearFilter.map((year) => (
              <button key={year} className="px-3 py-1 text-sm border rounded hover:bg-gray-50">
                {year}
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex border-b mb-6">
            {pageContent.tabs.map((tab) => (
              <button
                key={tab.id}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                  tab.active ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Orders */}
          <div className="space-y-6">
            {pageContent.orders.map((order) => (
              <div key={order.id} className="border rounded-lg p-6">
                {/* Order Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg font-medium">{order.number}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        order.statusColor === 'green' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{order.date}</p>
                  </div>
                  <span className="text-lg font-medium">{order.total} FCFA</span>
                </div>

                {/* Timeline */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-xs">
                    {order.timeline.map((step, i) => (
                      <span key={i} className={`${step.completed ? 'text-black' : 'text-gray-400'}`}>
                        {i > 0 && <span className="mx-1">&gt;</span>}
                        {step.current ? <span className="font-medium underline">{step.label}</span> : step.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Delivery Info */}
                <div className="text-sm text-gray-600 mb-4">
                  {order.estimatedDelivery ? (
                    <p>Estimated delivery: {order.estimatedDelivery}</p>
                  ) : (
                    <p>Delivered: {order.deliveredDate}</p>
                  )}
                  <p className="text-gray-400">{order.shippingAddress}</p>
                </div>

                {/* Items */}
                <div className="flex gap-4 mb-4 overflow-x-auto pb-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex-shrink-0 w-24">
                      <div className="aspect-square bg-gray-100 rounded-lg mb-1" />
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.color} / {item.size}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 text-sm">
                  <Link to={order.actions.viewDetailsLink} className="text-gray-600 hover:text-black underline">View details</Link>
                  {order.actions.writeReviewLink && (
                    <Link to={order.actions.writeReviewLink} className="text-gray-600 hover:text-black">Write a review</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
