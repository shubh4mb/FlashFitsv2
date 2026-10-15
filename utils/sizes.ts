export interface SizeGroup {
  id: string;
  label: string;
  sizes: string[];
}

export const SIZE_GROUPS: SizeGroup[] = [
  {
    id: 'clothing',
    label: 'Standard Clothing',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', 'FS'],
  },
  {
    id: 'waist',
    label: 'Waist / Bottomwear',
    sizes: ['26', '28', '30', '32', '34', '36', '38', '40', '42', '44'],
  },
  {
    id: 'shoes',
    label: 'Footwear / Shoes',
    sizes: ['6', '7', '8', '9', '10', '11', '12'],
  },
];

export const ALL_STANDARD_SIZES: string[] = Array.from(
  new Set(SIZE_GROUPS.flatMap((group) => group.sizes))
);
