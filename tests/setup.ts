import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';
import 'fake-indexeddb/auto';

// Ensure Node.js native Blob and File are used across global contexts
// so structuredClone (used by fake-indexeddb) properly clones Blobs.
Object.defineProperty(globalThis, 'Blob', { value: NodeBlob, writable: true, configurable: true });
Object.defineProperty(globalThis, 'File', { value: NodeFile, writable: true, configurable: true });

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'Blob', { value: NodeBlob, writable: true, configurable: true });
  Object.defineProperty(window, 'File', { value: NodeFile, writable: true, configurable: true });

  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => 'blob:mock-url';
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {};
  }

  if (typeof HTMLMediaElement !== 'undefined') {
    HTMLMediaElement.prototype.play = async () => {};
    HTMLMediaElement.prototype.pause = () => {};
  }
}
