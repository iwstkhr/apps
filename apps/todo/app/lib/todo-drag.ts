// タスクをフォルダ欄へドラッグするときに DataTransfer に入れる形式。ほかのドラッグ (ファイルや文字) と区別するため独自の型にする
export const TODO_DRAG_TYPE = 'application/x-todo-id';

export function setDraggedTodo(dataTransfer: DataTransfer, todoId: string): void {
  dataTransfer.setData(TODO_DRAG_TYPE, todoId);
  dataTransfer.effectAllowed = 'move';
}

/** ドラッグ中のものがタスクか。dragover の間は中身を読めないので型だけを見る。 */
export function isDraggingTodo(dataTransfer: DataTransfer | null): boolean {
  return dataTransfer !== null && [...dataTransfer.types].includes(TODO_DRAG_TYPE);
}

export function getDraggedTodo(dataTransfer: DataTransfer | null): string | null {
  return dataTransfer?.getData(TODO_DRAG_TYPE) || null;
}
