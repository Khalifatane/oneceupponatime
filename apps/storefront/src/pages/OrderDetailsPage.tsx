import { Link } from 'react-router'
import orderDetailsData from '@/data/order-details.json'
import Sidebar from '@/components/Sidebar'

export default function OrderDetailsPage() {
  const { sidebar, order } = orderDetailsData

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
            <div>
              <h1 className="text-xl font-semibold">{order.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">{order.number} ({order.date})</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  order.statusColor === 'green' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {order.status}
                </span>
              </div>
            </div>
            <span className="text-lg font-medium">{order.total} {order.currency}</span>
          </div>

          {/* Shipping Address */}
          <div className="border rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-sm font-medium">Shipping address</h2>
              <Link to={order.actions.changeAddressLink} className="text-sm text-gray-500 hover:text-black">Edit</Link>
            </div>
            <div className="text-sm text-gray-600">
              <p>{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.street}</p>
              <p>{order.shippingAddress.city}</p>
              <p>{order.shippingAddress.state}</p>
              <p>{order.shippingAddress.country}</p>
              <p className="mt-1">{order.shippingAddress.phone}</p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="border rounded-lg p-6 mb-6">
            <h2 className="text-sm font-medium mb-2">Contact details</h2>
            <p className="text-sm text-gray-600">{order.contactDetails.email}</p>
          </div>

          {/* Payment Method */}
          <div className="border rounded-lg p-6 mb-6">
            <h2 className="text-sm font-medium mb-2">Payment method</h2>
            <p className="text-sm text-gray-600">{order.paymentMethod.type} **** {order.paymentMethod.last4}</p>
          </div>

          {/* Order Costs */}
          <div className="border rounded-lg p-6 mb-6">
            <h2 className="text-sm font-medium mb-3">Order costs</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{order.costs.subtotal} {order.currency}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span className="text-green-600">{order.costs.shipping}</span></div>
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Total</span>
                <span>{order.costs.total} {order.currency}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="border rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-sm font-medium">Estimated delivery</h2>
                <p className="text-sm text-gray-600">{order.estimatedDelivery}</p>
              </div>
              <button className="text-sm text-red-600 hover:underline">{order.actions.cancelOrderButton}</button>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {order.timeline.map((step, i) => (
                <span key={i} className={`${step.completed ? 'text-black' : 'text-gray-400'}`}>
                  {i > 0 && <span className="mx-1">&gt;</span>}
                  {step.current ? <span className="font-medium underline">{step.label}</span> : step.label}
                </span>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4 mb-6">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4 border rounded-lg p-4">
                <div className="w-20 h-24 bg-gray-100 rounded flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{item.name}</h3>
                  <p className="text-xs text-gray-500">{item.color} / {item.size}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  <p className="text-sm font-medium mt-1">{item.price} {order.currency}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    {item.actions.buyAgainButton && (
                      <button className="text-gray-600 hover:text-black">Buy again</button>
                    )}
                    {item.actions.writeReviewLink && (
                      <Link to={item.actions.writeReviewLink} className="text-gray-600 hover:text-black">Write a review</Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Print Receipt */}
          <button 
            onClick={() => window.print()}
            className="w-full py-3 border rounded-lg text-sm hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            {order.actions.printReceiptButton}
          </button>
        </div>
      </div>
    </main>
  )
}
