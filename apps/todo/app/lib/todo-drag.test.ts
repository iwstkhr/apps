// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDraggedTodo, isDraggingTodo, setDraggedTodo, TODO_DRAG_TYPE } from '~/lib/todo-drag';
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
    // 透明な余白でラベルを指先の右下にずらす
    expect((image as HTMLElement).style.padding).toBe('20px 0px 0px 16px');
    expect(document.body).toContainElement(image);

    // 写し取った後は画面から消す
    vi.runAllTimers();
    expect(document.body).not.toContainElement(image);
  });

  it('uses its own MIME type', () => {
    expect(TODO_DRAG_TYPE).toBe('application/x-todo-id');
  });
});
