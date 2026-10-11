import '@testing-library/jest-dom/vitest';

// jsdom does not implement <dialog>'s showModal() / close(), so reproduce only opening and closing
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
};
