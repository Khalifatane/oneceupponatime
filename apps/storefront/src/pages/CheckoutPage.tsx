import { Link } from 'react-router'
import checkoutData from '@/data/checkout.json'
import OrderSummaryCard from '@/components/OrderSummaryCard'

export default function CheckoutPage() {
  const { steps, backLink, sections, orderSummary, loginLink, loginHint, checkoutType } = checkoutData

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

      {/* Back Link */}
      <Link to={backLink.href} className="text-sm text-gray-600 hover:text-black mb-6 inline-block">
        &larr; {backLink.label}
      </Link>

      {/* Login Hint for Guest */}
      {checkoutType === 'guest' && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 flex items-center justify-between">
          <span className="text-sm">
            <Link to={loginLink.href} className="font-medium underline">{loginLink.label}</Link> {loginHint}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Form Sections */}
        <div className="lg:col-span-2 space-y-8">
          {sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-lg font-semibold mb-4">{section.title}</h2>
              
              {section.type === 'contactDetails' && 'fields' in section && (
                <div className="space-y-4">
                  {section.fields?.map((field: any, j: number) => (
                    <input
                      key={j}
                      type={field.type}
                      name={field.name}
                      placeholder={field.placeholder}
                      required={field.required}
                      className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  ))}
                  {'newsletterCheckbox' in section && section.newsletterCheckbox && (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      {section.newsletterCheckbox.label}
                    </label>
                  )}
                </div>
              )}

              {section.type === 'shippingAddress' && 'fields' in section && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.fields?.map((field: any, j: number) => (
                    field.type === 'select' ? (
                      <select
                        key={j}
                        name={field.name}
                        defaultValue={field.defaultValue}
                        className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      >
                        {field.options?.map((opt: string, k: number) => (
                          <option key={k} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        key={j}
                        type={field.type}
                        name={field.name}
                        placeholder={field.placeholder}
                        required={field.required}
                        className={`border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black ${field.name === 'address1' || field.name === 'address2' ? 'md:col-span-2' : ''}`}
                      />
                    )
                  ))}
                  {'defaultAddressCheckbox' in section && section.defaultAddressCheckbox && (
                    <label className="flex items-center gap-2 text-sm md:col-span-2">
                      <input type="checkbox" className="rounded" />
                      {section.defaultAddressCheckbox.label}
                    </label>
                  )}
                </div>
              )}

              {section.type === 'shippingMethod' && 'options' in section && (
                <div className="space-y-3">
                  {section.options?.map((opt: any) => (
                    <label key={opt.id} className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${opt.selected ? 'border-black bg-gray-50' : ''}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="shipping" defaultChecked={opt.selected} className="accent-black" />
                        <span className="text-sm">{opt.label}</span>
                      </div>
                      <span className="text-sm font-medium">{opt.priceLabel}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          <Link to="/review-and-pay">
            <button className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition">
              Continue to Review
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
