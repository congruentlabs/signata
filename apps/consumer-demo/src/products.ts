/**
 * Product catalogue for the demo marketplace. Pure visuals — no images
 * fetched from external services, just CSS gradients with the product
 * name layered on top. Keeps the demo offline-friendly and avoids broken
 * image links during a presentation.
 */
export interface Product {
  id: string;
  name: string;
  region: string;
  abv: number;
  price: number;
  gradient: string;
  notes: string;
}

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Highland Single Malt 18',
    region: 'Highlands',
    abv: 43,
    price: 145,
    gradient: 'linear-gradient(135deg, #8B6F47 0%, #4A3826 100%)',
    notes: 'Honey, dried apricot, faint smoke.',
  },
  {
    id: 'p2',
    name: 'Cask Strength Rye',
    region: 'New England',
    abv: 58.2,
    price: 89,
    gradient: 'linear-gradient(135deg, #B8860B 0%, #7A4E0F 100%)',
    notes: 'Vanilla, baking spice, long warm finish.',
  },
  {
    id: 'p3',
    name: 'Islay Peated Reserve',
    region: 'Islay',
    abv: 46,
    price: 165,
    gradient: 'linear-gradient(135deg, #4B5A3A 0%, #1F2A18 100%)',
    notes: 'Maritime smoke, brine, dark chocolate.',
  },
  {
    id: 'p4',
    name: 'Speyside 12 Year',
    region: 'Speyside',
    abv: 40,
    price: 72,
    gradient: 'linear-gradient(135deg, #C5A572 0%, #7E5E2C 100%)',
    notes: 'Pear, vanilla, gentle oak.',
  },
  {
    id: 'p5',
    name: 'Single Barrel Bourbon',
    region: 'Kentucky',
    abv: 47.5,
    price: 110,
    gradient: 'linear-gradient(135deg, #A0522D 0%, #4A1F0E 100%)',
    notes: 'Caramel, oak, hint of dark cherry.',
  },
  {
    id: 'p6',
    name: 'Coastal Blended Malt',
    region: 'Coastal',
    abv: 43,
    price: 95,
    gradient: 'linear-gradient(135deg, #6C8FA8 0%, #2C4458 100%)',
    notes: 'Sea spray, citrus zest, soft peat.',
  },
];
