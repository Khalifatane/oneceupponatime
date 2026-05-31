import { Link } from 'react-router'
import productDetailData from '@/data/product-detail.json'

export default function ProductDetailPage() {
  const { product, relatedProducts, breadcrumb } = productDetailData

  return (
    <main className="min-h-screen max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        {breadcrumb.map((crumb, i) => (
          <span key={i}>
            {i > 0 && <span className="mx-2">/</span>}
            <Link to={crumb.href} className="hover:underline">{crumb.label}</Link>
          </span>
        ))}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-100 rounded-lg" />
          <div className="flex gap-2 overflow-x-auto">
            {product.images.map((_img, i) => (
              <button key={i} className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded border hover:border-black transition" />
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <p className="text-sm text-gray-500 mb-1">{product.subCategory}</p>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} className={`w-4 h-4 ${i < product.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              ))}
            </div>
            <span className="text-sm text-gray-600">{product.reviewCount} reviews</span>
          </div>

          <p className="text-2xl font-semibold mb-4">{product.price} FCFA</p>

          {/* Colors */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Color: {product.selectedColor}</p>
            <div className="flex gap-2">
              {product.colors.map((color, i) => (
                <button
                  key={i}
                  className={`w-8 h-8 rounded-full border-2 ${color.selected ? 'border-black' : 'border-gray-200'}`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Size</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size, i) => (
                <button
                  key={i}
                  disabled={!size.available}
                  className={`px-3 py-2 border rounded text-sm ${size.available ? 'hover:border-black' : 'opacity-30 cursor-not-allowed'}`}
                >
                  {size.value}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="mb-6">
            <p className="text-sm font-medium mb-2">Quantity</p>
            <div className="flex items-center border rounded w-fit">
              <button className="px-3 py-2 hover:bg-gray-50">-</button>
              <span className="px-3 py-2 border-x">1</span>
              <button className="px-3 py-2 hover:bg-gray-50">+</button>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 mb-6">
            <button className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition">
              Add to cart
            </button>
            <button className="w-full py-3 border rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              Add to Wishlist
            </button>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-6">
            {product.features.map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium">{feature.title}</p>
                  <p className="text-xs text-gray-500">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Social Proof */}
          <div className="text-sm text-gray-600 space-y-1 mb-6">
            {product.socialProof.map((proof, i) => (
              <p key={i}>{proof.text}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Related Products */}
      <section className="mt-16">
        <h2 className="text-xl font-semibold mb-6">You may also like</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {relatedProducts.map((product) => (
            <Link key={product.id} to={`/product-detail?id=${product.id}`} className="group">
              <div className="relative aspect-[3/4] bg-gray-100 rounded-lg mb-3">
                {product.badge && (
                  <span className="absolute top-2 left-2 bg-white/90 text-xs px-2 py-1 rounded">{product.badge}</span>
                )}
              </div>
              <p className="font-medium text-sm">{product.name}</p>
              <p className="text-xs text-gray-500">{product.category}</p>
              <p className="text-sm font-medium mt-1">{product.price} FCFA</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
