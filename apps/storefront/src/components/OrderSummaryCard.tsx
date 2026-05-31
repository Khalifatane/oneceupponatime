import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { formatPrice } from '@/lib/store.js'
import { useCart } from '@/hooks/useCart'

interface OrderSummaryCardProps {
  editCartLink: string
  currency?: string
  shippingLabel?: string
  estimatedTaxLabel?: string
  promoPlaceholder?: string
  promoButtonText?: string
  title?: string
}

export default function OrderSummaryCard({
  editCartLink,
  currency = 'XOF',
  shippingLabel = 'Free',
  estimatedTaxLabel = 'Calculated at checkout',
  promoPlaceholder = 'Enter promo code',
  promoButtonText = 'Apply',
  title = 'Order Summary',
}: OrderSummaryCardProps) {
  const {
    items,
    appliedDiscount,
    saleDiscount,
    promoDiscount,
    formattedSubtotal,
    formattedSaleDiscount,
    formattedPromoDiscount,
    formattedTotal,
    applyDiscountCode,
    clearDiscount,
  } = useCart()
  const [promoCode, setPromoCode] = useState(appliedDiscount?.code || '')
  const [feedback, setFeedback] = useState('')
  const [isApplying, setIsApplying] = useState(false)

  useEffect(() => {
    setPromoCode(appliedDiscount?.code || '')
  }, [appliedDiscount?.code])

  async function handleApplyDiscount(event: FormEvent) {
    event.preventDefault()
    setIsApplying(true)
    setFeedback('')

    try {
      const result = await applyDiscountCode(promoCode)
      if (!result.success) {
        setFeedback(result.error || 'Unable to apply that discount code right now.')
        return
      }

      const normalizedCode = result.data?.discount?.code || promoCode.trim().toUpperCase()
      setPromoCode(normalizedCode)
      setFeedback(`Discount code ${normalizedCode} applied.`)
    } finally {
      setIsApplying(false)
    }
  }

  function handleRemoveDiscount() {
    clearDiscount()
    setFeedback('Discount removed.')
  }

  return (
    <div className="border rounded-lg p-6 sticky top-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link to={editCartLink} className="text-sm text-gray-500 hover:text-black">
          Edit
        </Link>
      </div>

      <form className="flex gap-2 mb-3" onSubmit={handleApplyDiscount}>
        <input
          type="text"
          value={promoCode}
          onChange={(event) => setPromoCode(event.target.value)}
          placeholder={promoPlaceholder}
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isApplying}
          className="px-4 py-2 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {isApplying ? 'Applying...' : promoButtonText}
        </button>
      </form>

      {appliedDiscount ? (
        <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          <div className="flex items-center justify-between gap-3">
            <span>
              Applied <strong>{appliedDiscount.code}</strong>
            </span>
            <button type="button" onClick={handleRemoveDiscount} className="text-green-900 underline">
              Remove
            </button>
          </div>
        </div>
      ) : null}

      {feedback ? <p className="mb-4 text-sm text-gray-600">{feedback}</p> : null}

      <div className="space-y-3 text-sm mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span>{formattedSubtotal}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Shipping</span>
          <span className={shippingLabel === 'Free' ? 'text-green-600' : ''}>{shippingLabel}</span>
        </div>
        {promoDiscount > 0 ? (
          <div className="flex justify-between text-red-600">
            <span>Promo discount</span>
            <span>-{formattedPromoDiscount}</span>
          </div>
        ) : null}
        <div className="flex justify-between font-semibold text-base pt-3 border-t">
          <span>Total</span>
          <span>
            {formattedTotal} {currency}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="w-16 h-20 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                {item.image ? (
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="text-sm">
                <p className="font-medium">{item.title}</p>
                <p className="text-gray-500">
                  {item.color} / {item.size}
                </p>
                <p className="text-gray-500">Qty: {item.quantity}</p>
                <p className="font-medium">{formatPrice(item.price * item.quantity)}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">Your cart is empty.</p>
        )}
      </div>
    </div>
  )
}
