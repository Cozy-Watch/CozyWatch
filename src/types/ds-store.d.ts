declare module "ds-store" {
  export default class DSStore {
    vSrn(value: 0 | 1): void;
    setIconSize(size: number): void;
    setWindowSize(width: number, height: number): void;
    setIconPos(name: string, x: number, y: number): void;
    setBackgroundPath(path: string): void;
    write(path: string, callback: (error: Error | null) => void): void;
  }
}
