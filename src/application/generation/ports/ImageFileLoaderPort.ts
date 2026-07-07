export interface LoadedImageFile {
  image: HTMLImageElement;
  dataUrl: string;
}

export interface ImageFileLoaderPort {
  loadImageFile(file: File): Promise<LoadedImageFile>;
}
