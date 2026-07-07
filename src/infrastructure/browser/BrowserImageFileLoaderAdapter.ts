import type {
  ImageFileLoaderPort,
  LoadedImageFile,
} from '@/application/generation/ports/ImageFileLoaderPort';
import { loadImageFile } from './image-file-loader';

export class BrowserImageFileLoaderAdapter implements ImageFileLoaderPort {
  loadImageFile(file: File): Promise<LoadedImageFile> {
    return loadImageFile(file);
  }
}
