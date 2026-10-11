// The DataTransfer type used when dragging a task onto the folder pane. A custom type distinguishes it from other drags (files or text)
export const TODO_DRAG_TYPE = 'application/x-todo-id';

// How far (px) the drag image (a small label with only the task name) is offset from the pointer.
// Without the offset, the browser's default translucent image of the whole card covers the folder pane and hides the target's name
const DRAG_IMAGE_OFFSET = { x: 16, y: 20 };

/**
 * Create the label with only the task name that appears at the lower right of the pointer while dragging.
 * setDragImage captures the appearance at that moment, so it is placed off screen, captured, and removed right away.
 */
function createDragImage(title: string): HTMLElement {
  const wrapper = document.createElement('div');
  // The padding is transparent, so only the label appears, away from the pointer
  Object.assign(wrapper.style, {
    position: 'fixed',
    top: '-1000px',
    left: '-1000px',
    padding: `${DRAG_IMAGE_OFFSET.y}px 0 0 ${DRAG_IMAGE_OFFSET.x}px`,
    pointerEvents: 'none',
  });
  const label = document.createElement('div');
  label.textContent = title;
  Object.assign(label.style, {
    maxWidth: '240px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    padding: '4px 10px',
    borderRadius: '6px',
    background: '#1e293b',
    color: '#ffffff',
    font: '500 13px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    boxShadow: '0 4px 12px rgb(15 23 42 / 0.3)',
  });
  wrapper.append(label);
  return wrapper;
}

export function setDraggedTodo(dataTransfer: DataTransfer, todoId: string, title: string): void {
  dataTransfer.setData(TODO_DRAG_TYPE, todoId);
  dataTransfer.effectAllowed = 'move';
  // Keep the default appearance where setDragImage is missing (e.g. the test DOM)
  if (typeof dataTransfer.setDragImage !== 'function') return;
  const image = createDragImage(title);
  document.body.append(image);
  dataTransfer.setDragImage(image, 0, 0);
  setTimeout(() => image.remove(), 0);
}

/** Whether the item being dragged is a task. Its data cannot be read during dragover, so only the type is checked. */
export function isDraggingTodo(dataTransfer: DataTransfer | null): boolean {
  return dataTransfer !== null && [...dataTransfer.types].includes(TODO_DRAG_TYPE);
}

export function getDraggedTodo(dataTransfer: DataTransfer | null): string | null {
  return dataTransfer?.getData(TODO_DRAG_TYPE) || null;
}
