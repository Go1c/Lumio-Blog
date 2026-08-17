declare module 'archiver' {
  import type { Writable } from 'node:stream';

  export class ZipArchive {
    constructor(options?: { zlib?: { level?: number } });
    pipe(out: Writable): this;
    append(src: string | Buffer, opts: { name: string }): this;
    file(path: string, opts: { name: string }): this;
    directory(path: string, dest: string): this;
    finalize(): Promise<void>;
    on(event: 'entry' | 'error', handler: (...args: unknown[]) => void): this;
  }
}
