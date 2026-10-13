// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getDraggedFolder,
  getDraggedTodo,
  isDraggingFolder,
  isDraggingTodo,
  setDraggedFolder,
  setDraggedTodo,
  TODO_DRAG_TYPE,
} from '~/lib/todo-drag';
import { createDataTransfer } from '~/test/drag';

afterEach(() => {
  vi.useRealTimers();
});

describe('todo drag data', () => {
  it('stores the todo id under its own type', () => {
    const dataTransfer = createDataTransfer();
    setDraggedTodo(dataTransfer, 'todo-1', '洗濯');
    expect(dataTransfer.effectAllowed).toBe('move');
    expect(isDraggingTodo(dataTransfer)).toBe(true);
    expect(getDraggedTodo(dataTransfer)).toBe('todo-1');
  });

  it('ignores drags of other things', () => {
    const dataTransfer = createDataTransfer();
    dataTransfer.setData('text/plain', 'hello');
    expect(isDraggingTodo(dataTransfer)).toBe(false);
    expect(getDraggedTodo(dataTransfer)).toBeNull();
    expect(isDraggingTodo(null)).toBe(false);
  });

  it('drags a small label with the title, away from the pointer, instead of the whole card', () => {
    vi.useFakeTimers();
    const dataTransfer = createDataTransfer();
    const setDragImage = vi.fn();
    dataTransfer.setDragImage = setDragImage;

    setDraggedTodo(dataTransfer, 'todo-1', '洗濯物をたたむ');

    expect(setDragImage).toHaveBeenCalledTimes(1);
    const [image, x, y] = setDragImage.mock.calls[0];
    expect(image).toHaveTextContent('洗濯物をたたむ');
    expect([x, y]).toEqual([0, 0]);
    // Transparent padding shifts the label to the lower right of the pointer
    expect((image as HTMLElement).style.padding).toBe('20px 0px 0px 16px');
    expect(document.body).toContainElement(image);

    // Removed from the page after it is captured
    vi.runAllTimers();
    expect(document.body).not.toContainElement(image);
  });

  it('uses its own MIME type', () => {
    expect(TODO_DRAG_TYPE).toBe('application/x-todo-id');
  });
});

describe('folder drag data', () => {
  it('stores the folder id under a type separate from todos', () => {
    const dataTransfer = createDataTransfer();
    setDraggedFolder(dataTransfer, 'folder-1', '仕事');
    expect(dataTransfer.effectAllowed).toBe('move');
    expect(isDraggingFolder(dataTransfer)).toBe(true);
    expect(getDraggedFolder(dataTransfer)).toBe('folder-1');
    expect(isDraggingTodo(dataTransfer)).toBe(false);
    expect(getDraggedTodo(dataTransfer)).toBeNull();
  });

  it('ignores drags of other things', () => {
    const dataTransfer = createDataTransfer();
    setDraggedTodo(dataTransfer, 'todo-1', '洗濯');
    expect(isDraggingFolder(dataTransfer)).toBe(false);
    expect(getDraggedFolder(dataTransfer)).toBeNull();
    expect(isDraggingFolder(null)).toBe(false);
  });
});
