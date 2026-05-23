import { Link } from 'react-router'
import reviewAndPayData from '@/data/review-and-pay.json'
import OrderSummaryCard from '@/components/OrderSummaryCard'

export default function ReviewAndPayPage() {
  const { steps, backLink, sections, orderSummary, payButton } = reviewAndPayData

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Review Sections */}
        <div className="lg:col-span-2 space-y-6">
          {sections.map((section, i) => (
            <div key={i} className="border rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold">{section.title}</h2>
                <Link to={'editLink' in section ? (section as any).editLink : '#'} className="text-sm text-gray-500 hover:text-black">
                  Edit
                </Link>
              </div>

              {section.type === 'shippingAddress' && 'address' in section && (
                <div className="text-sm text-gray-600">
                  <p>{(section as any).address?.name}</p>
                  <p>{(section as any).address?.street}</p>
                  <p>{(section as any).address?.city}</p>
                  <p>{(section as any).address?.state}</p>
                  <p>{(section as any).address?.country}</p>
                  <p className="mt-2">{(section as any).address?.phone}</p>
                </div>
              )}

              {section.type === 'shippingMethod' && 'method' in section && (
                <div className="text-sm">
                  <span>{(section as any).method?.label}</span>
                  <span className="ml-2 font-medium">{(section as any).method?.price}</span>
                </div>
              )}

              {section.type === 'contactDetails' && 'email' in section && (
                <p className="text-sm text-gray-600">{(section as any).email}</p>
              )}

              {section.type === 'payment' && 'savedMethods' in section && (
                <div className="space-y-3">
                  {(section as any).savedMethods?.map((method: any) => (
                    <label key={method.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
                      <input type="radio" name="payment" defaultChecked={method.selected} className="accent-black" />
                      <span className="text-sm font-medium">{method.type}</span>
                      <span className="text-sm text-gray-500">**** {method.last4}</span>
                      <span className="text-sm text-gray-400 ml-auto">{method.expiry}</span>
                    </label>
                  ))}
                  <div className="border-t pt-3 mt-3">
                    <p className="text-sm text-gray-500 mb-2">Other methods</p>
                    <div className="space-y-2">
                      {(section as any).otherMethods?.map((method: any) => (
                        <label key={method.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
                          <input type="radio" name="payment" className="accent-black" />
                          <span className="text-sm">{method.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <Link to="/order-confirmation">
            <button className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition">
              {payButton}
            </button>
          </Link>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <OrderSummaryCard
            editCartLink={orderSummary.editCartLink}
            currency={orderSummary.currency}
            shippingLabel={orderSummary.shipping}
            estimatedTaxLabel={orderSummary.estimatedTax}
            promoPlaceholder={orderSummary.promoCode.placeholder}
            promoButtonText={orderSummary.promoCode.buttonText}
          />
        </div>
      </div>
    </main>
  )
}
