import type { Product, ProductCategory, ProductColorOption } from '@/types/product';

const paletteUpper = [
  { name: 'Beige', hex: '#d4c1a6' },
  { name: 'Olive', hex: '#737965' },
  { name: 'Black', hex: '#292b29' },
];
const paletteNeutral = [
  { name: 'Kem', hex: '#eee8dc' },
  { name: 'Nâu', hex: '#86664f' },
  { name: 'Đen', hex: '#292b29' },
];
const paletteDress = [
  { name: 'Kem', hex: '#eee8dc' },
  { name: 'Xanh rêu', hex: '#50624d' },
  { name: 'Đỏ đất', hex: '#a95e49' },
];

function colorsFor(category: ProductCategory, colors = paletteUpper): ProductColorOption[] {
  const placeholder = category === 'lower_body'
    ? '/products/lower-body-placeholder.svg'
    : category === 'dresses'
      ? '/products/dress-placeholder.svg'
      : '/products/upper-body-placeholder.svg';

  return colors.map((color) => ({
    ...color,
    image: category === 'upper_body' && color.name === 'Olive'
      ? '/products/upper-body-olive.svg'
      : category === 'upper_body' && color.name === 'Black'
        ? '/products/upper-body-black.svg'
        : placeholder,
    garmentImage: category === 'upper_body' && color.name === 'Olive'
      ? '/products/upper-body-olive.svg'
      : category === 'upper_body' && color.name === 'Black'
        ? '/products/upper-body-black.svg'
        : placeholder,
  }));
}

function product(
  id: string,
  name: string,
  price: number,
  description: string,
  category: ProductCategory,
  colors: ProductColorOption[],
  rating: number,
  reviews: number,
): Product {
  return {
    id,
    name,
    price,
    description,
    category,
    colors,
    sizes: ['S', 'M', 'L', 'XL'],
    rating,
    reviews,
  };
}

export const products: Product[] = [
  // TODO: Thay ảnh phẳng thật cho linen-jacket-loose trong public/products/.
  product('linen-jacket-loose', 'Linen Jacket Form Loose', 890000, 'Chiếc áo khoác linen phom loose nhẹ tênh, được may cho những ngày bạn muốn mặc đẹp mà vẫn thật thoải mái.', 'upper_body', colorsFor('upper_body'), 4.9, 128),
  // TODO: Thay ảnh phẳng thật cho cropped-twill-jacket trong public/products/.
  product('cropped-twill-jacket', 'Cropped Twill Jacket', 950000, 'Áo khoác twill dáng lửng với đường may gọn gàng và cảm giác mặc nhẹ.', 'upper_body', colorsFor('upper_body', paletteNeutral), 4.8, 57),
  // TODO: Thay ảnh phẳng thật cho urban-bomber-jacket trong public/products/.
  product('urban-bomber-jacket', 'Urban Bomber Jacket', 1190000, 'Áo bomber tối giản với cổ bo nhẹ, phù hợp phong cách đường phố hiện đại.', 'upper_body', colorsFor('upper_body'), 4.7, 66),
  // TODO: Thay ảnh phẳng thật cho wool-blend-overcoat trong public/products/.
  product('wool-blend-overcoat', 'Wool Blend Overcoat', 1490000, 'Áo khoác dạ pha len giữ phom tốt, phù hợp trời mát và lạnh nhẹ.', 'upper_body', colorsFor('upper_body', paletteNeutral), 4.9, 51),

  // TODO: Thay ảnh phẳng thật cho linen-shirt-relaxed trong public/products/.
  product('linen-shirt-relaxed', 'Linen Shirt Relaxed', 690000, 'Áo linen thoáng mát, phom relaxed dễ mặc hằng ngày.', 'upper_body', colorsFor('upper_body', paletteNeutral), 4.8, 86),
  // TODO: Thay ảnh phẳng thật cho cotton-tee-classic trong public/products/.
  product('cotton-tee-classic', 'Cotton Tee Classic', 390000, 'Áo thun cotton mềm mại với phom dáng cổ điển.', 'upper_body', colorsFor('upper_body', paletteNeutral), 4.7, 94),
  // TODO: Thay ảnh phẳng thật cho oversized-poplin-shirt trong public/products/.
  product('oversized-poplin-shirt', 'Oversized Poplin Shirt', 590000, 'Sơ mi poplin phom rộng với bề mặt vải mịn.', 'upper_body', colorsFor('upper_body'), 4.8, 73),
  // TODO: Thay ảnh phẳng thật cho soft-knit-cardigan trong public/products/.
  product('soft-knit-cardigan', 'Soft Knit Cardigan', 790000, 'Cardigan len mềm nhẹ để phối lớp linh hoạt.', 'upper_body', colorsFor('upper_body', paletteNeutral), 4.9, 61),
  // TODO: Thay ảnh phẳng thật cho linen-blend-vest trong public/products/.
  product('linen-blend-vest', 'Linen Blend Vest', 620000, 'Áo gile pha linen thanh lịch, dễ kết hợp nhiều trang phục.', 'upper_body', colorsFor('upper_body'), 4.6, 42),
  // TODO: Thay ảnh phẳng thật cho everyday-denim-shirt trong public/products/.
  product('everyday-denim-shirt', 'Everyday Denim Shirt', 720000, 'Sơ mi denim mềm với sắc màu dễ phối và độ bền cao.', 'upper_body', colorsFor('upper_body', paletteNeutral), 4.7, 49),

  // TODO: Thay ảnh phẳng thật cho wide-leg-trousers trong public/products/.
  product('wide-leg-trousers', 'Wide Leg Trousers', 850000, 'Quần ống rộng có độ rủ tự nhiên và thoải mái cho cả ngày dài.', 'lower_body', colorsFor('lower_body', paletteNeutral), 4.8, 102),
  // TODO: Thay ảnh phẳng thật cho linen-straight-pants trong public/products/.
  product('linen-straight-pants', 'Linen Straight Pants', 760000, 'Quần linen ống đứng nhẹ thoáng cho ngày dài.', 'lower_body', colorsFor('lower_body'), 4.7, 68),
  // TODO: Thay ảnh phẳng thật cho relaxed-denim-jeans trong public/products/.
  product('relaxed-denim-jeans', 'Relaxed Denim Jeans', 990000, 'Quần denim phom relaxed bền đẹp và dễ vận động.', 'lower_body', colorsFor('lower_body', paletteNeutral), 4.9, 117),
  // TODO: Thay ảnh phẳng thật cho tailored-short trong public/products/.
  product('tailored-short', 'Tailored Short', 520000, 'Quần short may đo tối giản với phom vừa vặn.', 'lower_body', colorsFor('lower_body'), 4.6, 39),
  // TODO: Thay ảnh phẳng thật cho cotton-tapered-pants trong public/products/.
  product('cotton-tapered-pants', 'Cotton Tapered Pants', 730000, 'Quần cotton ống côn gọn gàng cho phong cách thường ngày.', 'lower_body', colorsFor('lower_body'), 4.7, 44),
  // TODO: Thay ảnh phẳng thật cho cargo-parachute-pants trong public/products/.
  product('cargo-parachute-pants', 'Cargo Parachute Pants', 940000, 'Quần cargo parachute nhẹ, nhiều túi tiện dụng nhưng vẫn giữ phom.', 'lower_body', colorsFor('lower_body', paletteNeutral), 4.8, 52),

  // TODO: Thay ảnh phẳng thật cho linen-wrap-dress trong public/products/.
  product('linen-wrap-dress', 'Linen Wrap Dress', 1180000, 'Đầm linen quấn nhẹ nhàng với điểm nhấn eo tinh tế.', 'dresses', colorsFor('dresses', paletteDress), 4.9, 91),
  // TODO: Thay ảnh phẳng thật cho minimal-midi-dress trong public/products/.
  product('minimal-midi-dress', 'Minimal Midi Dress', 1050000, 'Đầm midi tối giản với phom dáng thanh thoát.', 'dresses', colorsFor('dresses', paletteDress), 4.8, 76),
  // TODO: Thay ảnh phẳng thật cho cotton-shirt-dress trong public/products/.
  product('cotton-shirt-dress', 'Cotton Shirt Dress', 980000, 'Đầm sơ mi cotton linh hoạt từ công sở đến dạo phố.', 'dresses', colorsFor('dresses', paletteDress), 4.7, 63),
  // TODO: Thay ảnh phẳng thật cho soft-knit-dress trong public/products/.
  product('soft-knit-dress', 'Soft Knit Dress', 1120000, 'Đầm len mỏng mềm mại ôm vừa vặn tự nhiên.', 'dresses', colorsFor('dresses', paletteDress), 4.9, 58),
];
