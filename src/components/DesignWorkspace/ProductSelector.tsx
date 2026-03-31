import React from 'react'
import { Shirt, HelpCircle } from 'lucide-react'
import type { ProductType } from '@/types'
import { cn } from '@/lib/utils'

const PRODUCTS: { type: ProductType; label: string; description: string }[] = [
  { type: 'tshirt', label: 'T-Shirt', description: 'Classic crew neck tee' },
  { type: 'hoodie', label: 'Hoodie', description: 'Pullover or zip hoodie' },
  { type: 'jacket', label: 'Jacket', description: 'Bomber, varsity, or windbreaker' },
  { type: 'sweatshirt', label: 'Sweatshirt', description: 'Crewneck sweatshirt' },
  { type: 'cap', label: 'Cap', description: 'Hat or cap design' },
  { type: 'custom', label: 'Custom', description: 'Any product type' },
]

interface ProductSelectorProps {
  value: ProductType
  onChange: (type: ProductType) => void
}

const ProductSelector: React.FC<ProductSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-text/60 uppercase tracking-wide">Product Type</label>
      <div className="grid grid-cols-3 gap-2">
        {PRODUCTS.map((product) => {
          const isSelected = value === product.type
          return (
            <button
              key={product.type}
              onClick={() => onChange(product.type)}
              className={cn(
                'relative flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all text-center',
                isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-surface2 text-text/50 hover:border-primary/30 hover:text-text/70 hover:bg-surface2'
              )}
            >
              {product.type === 'custom' ? (
                <HelpCircle size={22} className={isSelected ? 'text-primary' : 'text-text/30'} />
              ) : (
                <Shirt size={22} className={isSelected ? 'text-primary' : 'text-text/30'} />
              )}
              <span className="text-xs font-medium leading-none">{product.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ProductSelector
