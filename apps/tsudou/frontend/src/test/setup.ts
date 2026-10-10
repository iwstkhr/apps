import '@testing-library/jest-dom/vitest';

// jsdom は <dialog> の showModal() / close() を実装していないため、開閉だけ再現する
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
};
