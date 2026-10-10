// タスクをフォルダ欄へドラッグするときに DataTransfer に入れる形式。ほかのドラッグ (ファイルや文字) と区別するため独自の型にする
export const TODO_DRAG_TYPE = 'application/x-todo-id';

// ドラッグ中の見た目 (タスク名だけの小さなラベル) を指先からずらす量 (px)。
// ずらさないと、ブラウザ既定のカード全体の半透明画像がフォルダ欄に重なり、移動先の名前が読めない
const DRAG_IMAGE_OFFSET = { x: 16, y: 20 };

/**
 * ドラッグ中に指先の右下に出す、タスク名だけのラベルを作る。
 * setDragImage はその瞬間の見た目を写し取るので、画面外に置いて写したらすぐ消す。
 */
function createDragImage(title: string): HTMLElement {
  const wrapper = document.createElement('div');
  // 余白の部分は透明なので、ラベルだけが指先から離れて表示される
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
  // setDragImage が無い環境 (テスト用の DOM など) では既定の見た目のままにする
  if (typeof dataTransfer.setDragImage !== 'function') return;
  const image = createDragImage(title);
  document.body.append(image);
  dataTransfer.setDragImage(image, 0, 0);
  setTimeout(() => image.remove(), 0);
}

/** ドラッグ中のものがタスクか。dragover の間は中身を読めないので型だけを見る。 */
export function isDraggingTodo(dataTransfer: DataTransfer | null): boolean {
  return dataTransfer !== null && [...dataTransfer.types].includes(TODO_DRAG_TYPE);
}

export function getDraggedTodo(dataTransfer: DataTransfer | null): string | null {
  return dataTransfer?.getData(TODO_DRAG_TYPE) || null;
}
