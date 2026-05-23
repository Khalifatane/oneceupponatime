import { Link } from 'react-router'
import cartData from '@/data/cart.json'
import { formatPrice } from '@/lib/store.js'
import { useCart } from '@/hooks/useCart'
import OrderSummaryCard from '@/components/OrderSummaryCard'

export default function CartPage() {
  const { promoBanner, cartTitle, features, orderSummary, actions, youMayAlsoLike } = cartData
  const { items, subtotal, removeItem, updateQuantity } = useCart()

  return (
    <main className="min-h-screen max-w-7xl mx-auto px-4 py-8">
      {/* Promo Banner */}
      {promoBanner && (
        <div className="bg-blue-50 text-center py-3 text-sm rounded mb-6 relative">
          <span className="font-medium">{promoBanner.title}</span> {promoBanner.description}
          {promoBanner.dismissible && (
            <button className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      )}

      <h1 className="text-2xl font-semibold mb-8">{cartTitle}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {items.length > 0 ? (
            items.map((item) => (
              <div key={item.id} className="flex gap-4 pb-6 border-b">
                <div className="w-24 h-32 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1 gap-4">
                    <h3 className="font-medium">{item.title}</h3>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className="font-medium">{formatPrice(item.price)}</span>
                      {item.originalPrice ? (
                        <span className="text-sm text-gray-400 line-through">{formatPrice(item.originalPrice)}</span>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">Color: {item.color}</p>
                  <p className="text-sm text-gray-500 mb-1">Size: {item.size}</p>
                  <p className="text-xs text-green-600 mb-2">In stock</p>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center border rounded w-fit">
                      <button
                        type="button"
                        className="px-3 py-1 hover:bg-gray-50"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label={`Decrease quantity for ${item.title}`}
                      >
                        -
                      </button>
                      <span className="px-3 py-1 border-x">{item.quantity}</span>
                      <button
                        type="button"
                        className="px-3 py-1 hover:bg-gray-50"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label={`Increase quantity for ${item.title}`}
                      >
                        +
                      </button>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <button type="button" className="hover:text-black">Add to favorites</button>
                      <button type="button" className="hover:text-black" onClick={() => removeItem(item.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <h2 className="text-lg font-semibold">Your cart is empty</h2>
              <p className="mt-2 text-sm text-gray-500">Add something you love and your order summary will update here in real time.</p>
              <Link
                to="/product-listing"
                className="mt-4 inline-flex items-center rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
              >
                Continue shopping
              </Link>
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 py-6">
            {features.map((feature, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-sm font-medium">{feature.title}</p>
                <p className="text-xs text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* You May Also Like */}
          <section>
            <h2 className="text-lg font-semibold mb-4">You may also like</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {youMayAlsoLike.map((product) => (
                <Link key={product.id} to={`/product-detail?id=${product.id}`} className="group">
                  <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-2" />
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.category}</p>
                  <p className="text-sm font-medium mt-1">${product.price}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <OrderSummaryCard
            editCartLink="/cart"
            currency={orderSummary.currency}
            estimatedTaxLabel="$0"
            promoPlaceholder={orderSummary.promoCode.placeholder}
            promoButtonText={orderSummary.promoCode.buttonText}
          />
          <Link to="/checkout">
            <button className="mt-3 w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition mb-3" disabled={subtotal <= 0}>
              {actions.checkoutButton}
            </button>
          </Link>
          {actions.paypalButton && (
            <button className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .726-.629h6.507c2.952 0 4.943.725 5.993 2.15 1.02 1.39 1.26 3.37.726 5.89-.55 2.62-1.693 4.49-3.396 5.55-1.78 1.1-4.065 1.59-6.84 1.59H8.55a.77.77 0 0 0-.756.629l-.72 2.657z" /></svg>
              Pay with PayPal
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
