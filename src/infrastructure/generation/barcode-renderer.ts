import {
  createLinearBarcodeOptions,
  createQrCanvasOptions,
  createQrSvgOptions,
  type JsBarcodeOptions,
} from '../../application/generation/barcode-render-options';
import {
  isQrFormat,
  previewTextForFormat,
  type GeneratorConfig,
} from '../../domain/generation/barcode-generation';

type JsBarcodeFn = (
  target: HTMLCanvasElement | SVGElement,
  text: string,
  options: JsBarcodeOptions,
) => void;

type RenderGuard = () => boolean;
type RenderMode = 'preview' | 'output';

let qrCodePromise: Promise<typeof import('qrcode')> | null = null;
let jsBarcodePromise: Promise<JsBarcodeFn> | null = null;

function shouldRender(guard?: RenderGuard): boolean {
  return guard ? guard() : true;
}

function getQRCode(): Promise<typeof import('qrcode')> {
  qrCodePromise ??= import('qrcode');
  return qrCodePromise;
}

function getJsBarcode(): Promise<JsBarcodeFn> {
  jsBarcodePromise ??= import('jsbarcode').then(
    module => (module.default || module) as JsBarcodeFn,
  );
  return jsBarcodePromise;
}

function createRenderTarget(
  canvas: HTMLCanvasElement,
  guard?: RenderGuard,
): HTMLCanvasElement {
  return guard ? document.createElement('canvas') : canvas;
}

function commitCanvasRender(
  source: HTMLCanvasElement,
  target: HTMLCanvasElement,
): void {
  if (source === target) return;

  target.width = source.width;
  target.height = source.height;

  const ctx = target.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(source, 0, 0);
}

export async function renderBarcodePreview(
  canvas: HTMLCanvasElement,
  config: GeneratorConfig,
  guard?: RenderGuard,
): Promise<boolean> {
  return renderBarcodeToCanvas(
    canvas,
    previewTextForFormat(config.format),
    config,
    'preview',
    guard,
  );
}

export async function renderBarcodeToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  config: GeneratorConfig,
  mode: RenderMode,
  guard?: RenderGuard,
): Promise<boolean> {
  if (!shouldRender(guard)) return false;
  const renderTarget = createRenderTarget(canvas, guard);

  if (isQrFormat(config.format)) {
    const QRCode = await getQRCode();
    if (!shouldRender(guard)) return false;

    await QRCode.toCanvas(
      renderTarget,
      text,
      createQrCanvasOptions(config, mode),
    );
    if (!shouldRender(guard)) return false;

    commitCanvasRender(renderTarget, canvas);
    return true;
  }

  const jsBarcode = await getJsBarcode();
  if (!shouldRender(guard)) return false;

  jsBarcode(renderTarget, text, createLinearBarcodeOptions(config, mode));
  if (!shouldRender(guard)) return false;

  commitCanvasRender(renderTarget, canvas);
  return true;
}

export async function renderBarcodeToSvg(
  text: string,
  config: GeneratorConfig,
): Promise<string> {
  if (isQrFormat(config.format)) {
    const QRCode = await getQRCode();
    return QRCode.toString(text, {
      type: 'svg',
      ...createQrSvgOptions(config),
    });
  }

  const jsBarcode = await getJsBarcode();
  const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  jsBarcode(svgNode, text, createLinearBarcodeOptions(config, 'output'));
  return new XMLSerializer().serializeToString(svgNode);
}

export function drawCenteredLogo(
  canvas: HTMLCanvasElement,
  logo: HTMLImageElement,
  backgroundColor: string,
  scale = 0.25,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const canvasSize = canvas.width;
  const logoSize = canvasSize * scale;
  const x = (canvasSize - logoSize) / 2;
  const y = (canvasSize - logoSize) / 2;

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(x - 2, y - 2, logoSize + 4, logoSize + 4);
  ctx.drawImage(logo, x, y, logoSize, logoSize);
}
