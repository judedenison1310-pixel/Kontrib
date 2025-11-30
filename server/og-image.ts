import fs from 'fs';
import path from 'path';

let cachedImage: Buffer | null = null;

export async function generateStaticOGImage(): Promise<Buffer> {
  if (cachedImage) {
    return cachedImage;
  }

  try {
    const imagePath = path.join(process.cwd(), 'server', 'assets', 'og-image.jpg');
    cachedImage = fs.readFileSync(imagePath);
    return cachedImage;
  } catch (error) {
    console.error('Error loading static OG image:', error);
    throw error;
  }
}

export function clearOGImageCache(): void {
  cachedImage = null;
}
