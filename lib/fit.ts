export interface FitProfile {
  heightCm?: number;
  weightKg?: number;
}

export type GarmentSize = 'S' | 'M' | 'L' | 'XL';
const SIZE_ORDER: Record<GarmentSize, number> = { S: 0, M: 1, L: 2, XL: 3 };

const SIZE_TABLE: Array<{ minHeight: number; maxHeight: number; minWeight: number; maxWeight: number; size: GarmentSize }> = [
  { minHeight: 145, maxHeight: 160, minWeight: 40, maxWeight: 52, size: 'S' },
  { minHeight: 156, maxHeight: 168, minWeight: 49, maxWeight: 60, size: 'M' },
  { minHeight: 164, maxHeight: 176, minWeight: 56, maxWeight: 72, size: 'L' },
  { minHeight: 170, maxHeight: 190, minWeight: 68, maxWeight: 100, size: 'XL' },
];

function normalize(value?: number): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return value;
}

export function suggestSize(profile: FitProfile): GarmentSize | null {
  const height = normalize(profile.heightCm);
  const weight = normalize(profile.weightKg);
  if (height === null || weight === null) return null;

  const matched = SIZE_TABLE.find((row) => (
    height >= row.minHeight
    && height <= row.maxHeight
    && weight >= row.minWeight
    && weight <= row.maxWeight
  ));
  if (matched) return matched.size;

  if (height < 156 || weight < 49) return 'S';
  if (height < 164 || weight < 56) return 'M';
  if (height < 170 || weight < 68) return 'L';
  return 'XL';
}

export function getFitAssessment(
  selectedSize: string,
  profile: FitProfile,
): string {
  const suggested = suggestSize(profile);
  if (!suggested) {
    return 'Đánh giá AI: Chưa đủ dữ liệu chiều cao/cân nặng để đưa ra nhận xét, vui lòng xem như gợi ý tham khảo.';
  }

  if (!Object.hasOwn(SIZE_ORDER, selectedSize)) {
    return `Đánh giá AI: Size ${selectedSize} chưa có trong bảng quy đổi hiện tại, vui lòng xem như gợi ý tham khảo.`;
  }

  const selected = selectedSize as GarmentSize;
  if (selected === suggested) {
    return `Đánh giá AI: Size ${selected} có xu hướng vừa vai, dài qua cạp quần khoảng 2cm (gợi ý tham khảo).`;
  }
  if (SIZE_ORDER[selected] > SIZE_ORDER[suggested]) {
    return `Đánh giá AI: Size ${selected} rộng hơn gợi ý ${suggested}, vai có thể xuôi nhẹ và thân áo dài hơn khoảng 3-4cm (gợi ý tham khảo).`;
  }
  return `Đánh giá AI: Size ${selected} nhỏ hơn gợi ý ${suggested}, vai có thể ôm hơn và thân áo ngắn hơn khoảng 2-3cm (gợi ý tham khảo).`;
}
