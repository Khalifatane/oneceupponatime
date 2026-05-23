import { useSyncExternalStore } from 'react'
import {
  clearAppliedDiscount,
  CART_UPDATE_EVENT,
  DISCOUNT_UPDATE_EVENT,
  formatPrice,
  getAppliedDiscount,
  getCart,
  getCartCount,
  getDiscountAmount,
  getCartSubtotal,
  removeFromCart,
  setAppliedDiscount,
  setCart,
} from '@/lib/store.js'
import { supabaseDiscountService } from '@siggistore/services'

export interface CartItem {
  id: string
  product_id: string
  title: string
  price: number
  originalPrice: number | null
  image: string
  color: string
  size: string
  quantity: number
  href: string
}

function getCartSnapshot() {
  const items = getCart() as CartItem[]

  return {
    items,
    count: getCartCount(items),
    subtotal: getCartSubtotal(items),
    appliedDiscount: getAppliedDiscount(),
  }
}

function subscribeToCartStore(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  window.addEventListener(CART_UPDATE_EVENT, onStoreChange)
  window.addEventListener(DISCOUNT_UPDATE_EVENT, onStoreChange)
  window.addEventListener('storage', onStoreChange)

  return () => {
    window.removeEventListener(CART_UPDATE_EVENT, onStoreChange)
    window.removeEventListener(DISCOUNT_UPDATE_EVENT, onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

export function updateCartItemQuantity(itemId: string, quantity: number) {
  if (quantity <= 0) {
    removeFromCart(itemId)
    return
  }

  const nextCart = getCart().map((item: CartItem) =>
    item.id === itemId
      ? {
          ...item,
          quantity,
        }
      : item,
  )

  setCart(nextCart)
}

export function useCart() {
  const snapshot = useSyncExternalStore(subscribeToCartStore, getCartSnapshot, getCartSnapshot)

  const saleDiscount = snapshot.items.reduce((sum, item: CartItem) => {
    const originalPrice = Number(item.originalPrice || 0)
    const itemDiscount = originalPrice > item.price ? (originalPrice - item.price) * item.quantity : 0
    return sum + itemDiscount
  }, 0)
  const promoDiscount = getDiscountAmount(snapshot.subtotal, snapshot.appliedDiscount)
  const total = Math.max(0, snapshot.subtotal - promoDiscount)

  return {
    ...snapshot,
    saleDiscount,
    promoDiscount,
    total,
    formattedSubtotal: formatPrice(snapshot.subtotal),
    formattedPromoDiscount: formatPrice(promoDiscount),
    formattedSaleDiscount: formatPrice(saleDiscount),
    formattedTotal: formatPrice(total),
    removeItem: removeFromCart,
    updateQuantity: updateCartItemQuantity,
    async applyDiscountCode(code: string) {
      const result = await supabaseDiscountService.validateDiscountCode({ code })
      if (result.success && result.data?.discount) {
        const discount = setAppliedDiscount(result.data.discount)
        return {
          ...result,
          data: {
            ...result.data,
            discount,
            discountAmount: getDiscountAmount(snapshot.subtotal, discount),
          },
        }
      }

      return result
    },
    clearDiscount: clearAppliedDiscount,
  }
}
