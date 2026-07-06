export interface LoadedImageFile {
  image: HTMLImageElement;
  dataUrl: string;
}

export function loadImageFile(file: File): Promise<LoadedImageFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(reader.error ?? new Error('Unable to read image file.'));
    };

    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') {
        reject(new Error('Image file did not produce a data URL.'));
        return;
      }

      const image = new Image();
      image.onerror = () => {
        reject(new Error('Unable to decode image file.'));
      };
      image.onload = () => {
        resolve({ image, dataUrl });
      };
      image.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}
