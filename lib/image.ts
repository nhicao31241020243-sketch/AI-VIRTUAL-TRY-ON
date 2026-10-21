import imageCompression from 'browser-image-compression';
import { TRYON_CONFIG } from '@/lib/tryon-config';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export async function compressImage(file: File): Promise<File> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Vui lòng chọn ảnh JPG, PNG hoặc WebP.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Ảnh tải lên không được vượt quá 20MB.');
  }

  let compressed: File;
  try {
    compressed = await imageCompression(file, {
      maxSizeMB: TRYON_CONFIG.maxImageBytes / (1024 * 1024) * 0.95,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    });
  } catch {
    throw new Error('Không thể xử lý ảnh này. Vui lòng chọn ảnh JPG, PNG hoặc WebP khác.');
  }
  if (compressed.size > TRYON_CONFIG.maxImageBytes) {
    throw new Error('Ảnh sau khi nén vẫn vượt quá dung lượng cho phép. Vui lòng chọn ảnh khác.');
  }
  return new File([compressed], file.name, { type: compressed.type || file.type });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc ảnh đã chọn.'));
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Không thể chuyển ảnh sang định dạng xử lý.'));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function convertImageUrlToJpeg(url: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Không thể tải ảnh người mẫu đã chọn.');

  const objectUrl = URL.createObjectURL(await response.blob());
  const image = new Image();
  try {
    image.src = objectUrl;
    await image.decode();
    const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không thể xử lý ảnh người mẫu.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value);
        else reject(new Error('Không thể chuyển ảnh người mẫu sang JPEG.'));
      }, 'image/jpeg', 0.9);
    });
    return new File([blob], 'model.jpg', { type: 'image/jpeg' });
  } catch {
    throw new Error('Không thể xử lý ảnh người mẫu. Vui lòng chọn người mẫu khác.');
  } finally {
    image.src = '';
    URL.revokeObjectURL(objectUrl);
  }
}

export async function imageToDataUrl(source: File | string): Promise<string> {
  const file = await compressImage(
    typeof source === 'string'
      ? await convertImageUrlToJpeg(source)
      : source,
  );
  return fileToDataUrl(file);
}
