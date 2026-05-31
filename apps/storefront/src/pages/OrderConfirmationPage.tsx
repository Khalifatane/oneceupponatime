import { Link } from 'react-router'
import orderConfirmationData from '@/data/order-confirmation.json'

export default function OrderConfirmationPage() {
  const { steps, backLink, continueShoppingLink, confirmation, whatsNext, needHelp, orderSummary } = orderConfirmationData

  return (
    <main className="min-h-screen max-w-7xl mx-auto px-4 py-8">
      {/* Steps */}
      <div className="flex items-center justify-center gap-4 mb-8 text-sm">
        {steps.map((step, i) => (
          <span key={i} className={`${step.current ? 'text-black font-medium' : 'text-gray-400'}`}>
            {i > 0 && <span className="mr-4 text-gray-300">&gt;</span>}
            {step.label}
          </span>
        ))}
      </div>

      <Link to={backLink.href} className="text-sm text-gray-600 hover:text-black mb-6 inline-block">
        &larr; {backLink.label}
      </Link>

      <Link to={continueShoppingLink.href} className="text-sm text-gray-600 hover:text-black mb-8 flex items-center gap-1">
        {continueShoppingLink.label}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Confirmation */}
        <div className="lg:col-span-2 space-y-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h1 className="text-2xl font-semibold mb-1">{confirmation.heading}</h1>
            <p className="text-gray-600 mb-2">
              {confirmation.orderNumberLabel} <span className="font-medium">{confirmation.orderNumber}</span>
            </p>
            <p className="text-sm text-gray-500">
              {confirmation.emailConfirmation} <span className="font-medium">{confirmation.email}</span>
            </p>
            <div className="flex justify-center gap-4 mt-6">
              {confirmation.actions.map((action, i) => (
                <Link
                  key={i}
                  to={action.href || '#'}
                  className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
                  onClick={action.action === 'print' ? () => window.print() : undefined}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          {/* What's Next */}
          <div>
            <h2 className="text-lg font-semibold mb-4">{whatsNext.title}</h2>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
              <div className="space-y-6">
                {whatsNext.timeline.map((step, i) => (
                  <div key={i} className="relative flex items-start gap-4 pl-12">
                    <div className={`absolute left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      step.status === 'completed' ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'
                    }`}>
                      {step.status === 'completed' && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{step.label}</p>
                      {step.date && <p className="text-sm text-gray-500">{step.date}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Need Help */}
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-1">{needHelp.title}</h2>
            <p className="text-sm text-gray-600 mb-1">{needHelp.description}</p>
            <p className="text-xs text-gray-400 mb-3">{needHelp.availability}</p>
            <Link to={needHelp.contactLink.href} className="text-sm text-blue-600 hover:underline">
              {needHelp.contactLink.label}
            </Link>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="border rounded-lg p-6 sticky top-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{orderSummary.title}</h2>
              <span className="text-sm text-green-600 font-medium">{orderSummary.status}</span>
            </div>
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{orderSummary.subtotal} {orderSummary.currency}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span className="text-green-600">{orderSummary.shipping}</span></div>
              <div className="flex justify-between font-semibold text-base pt-3 border-t">
                <span>Total</span>
                <span>{orderSummary.total} {orderSummary.currency}</span>
              </div>
            </div>
            <div className="space-y-4">
              {orderSummary.items.map((item: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className="w-16 h-20 bg-gray-100 rounded flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-gray-500">{item.color} / {item.size}</p>
                    <p className="text-gray-500">Qty: {item.quantity}</p>
                    <p className="font-medium">{item.price} {orderSummary.currency}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
