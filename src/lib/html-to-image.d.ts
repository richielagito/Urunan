export interface Options {
  quality?: number;
  backgroundColor?: string;
  width?: number;
  height?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  cacheBust?: boolean;
  style?: any;
  pixelRatio?: number;
  skipAutoScale?: boolean;
}

export function toJpeg(node: HTMLElement, options?: Options): Promise<string>;
export function toPng(node: HTMLElement, options?: Options): Promise<string>;
export function toBlob(node: HTMLElement, options?: Options): Promise<Blob>;
