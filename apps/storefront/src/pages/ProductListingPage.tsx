import { Link } from 'react-router'
import productListingData from '@/data/product-listing.json'

export default function ProductListingPage() {
  const { category, itemCount, sortOptions, defaultSort, banner, subCategories, products } = productListingData

  return (
    <main className="min-h-screen max-w-7xl mx-auto px-4 py-8">
      {/* Banner */}
      <div className="bg-purple-50 text-center py-2 text-sm text-purple-800 rounded mb-4">
        {banner.text}
      </div>

      {/* Header */}
      <h1 className="text-2xl font-semibold mb-4">{category}</h1>

      {/* Sub Categories */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        {subCategories.map((sub, i) => (
          <button
            key={i}
            className="flex items-center gap-2 px-4 py-2 rounded-full border hover:bg-gray-50 whitespace-nowrap"
          >
            <span className="w-6 h-6 rounded-full bg-gray-200" />
            <span className="text-sm">{sub.label} ({sub.count})</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          Filter
        </button>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{itemCount} Items</span>
          <span>|</span>
          <span>Sort By:</span>
          <select defaultValue={defaultSort} className="border rounded px-2 py-1">
            {sortOptions.map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <div key={product.id} className="group">
            <Link to={`/product-detail?id=${product.id}`} className="block" data-product-id={product.id} data-product-title={product.name} data-product-price={product.price} data-product-image={`/images/product-${product.id}.jpg`} data-product-href={`/product-detail?id=${product.id}`}>
              <div className="relative aspect-[3/4] bg-gray-100 rounded-lg mb-3 overflow-hidden">
                {product.badge && (
                  <span className="absolute top-2 left-2 bg-white/90 text-xs px-2 py-1 rounded">
                    {product.badge}
                  </span>
                )}
                <button className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                </button>
              </div>
              <p className="font-medium text-sm">{product.name}</p>
              <p className="text-xs text-gray-500">{product.category}</p>
              <div className="flex items-center gap-2 mt-1">
                {product.originalPrice && (
                  <span className="text-sm text-gray-400 line-through">{product.originalPrice} FCFA</span>
                )}
                <span className="text-sm font-medium">{product.price} FCFA</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className={`w-3 h-3 ${i < product.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  ))}
                </div>
                <span className="text-xs text-gray-500">({product.reviewCount})</span>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </main>
  )
}
