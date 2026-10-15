import type { KeyboardEvent } from 'react';

/** Replaces the text between start and end, then puts the cursor at the end of the new text */
export interface TextEdit {
  start: number;
  end: number;
  text: string;
}

// Indent, bullet or number, the space after it, and an optional task box
const LIST_ITEM = /^([ \t]*)(?:([-*+])|(\d{1,9})([.)]))([ \t]+)(\[[ xX]\](?:[ \t]+|$))?/;

/**
 * The edit for Enter at the cursor of a Markdown list item: the next line starts with the same bullet
 * (the next number in a numbered list, and an unchecked box in a task list). Enter on an empty item removes
 * its bullet instead, which ends the list. Returns null where Enter should add a plain line.
 */
export function continueList(value: string, cursor: number): TextEdit | null {
  const lineStart = value.lastIndexOf('\n', cursor - 1) + 1;
  const lineEnd = value.indexOf('\n', cursor);
  const line = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);
  const match = LIST_ITEM.exec(line);
  // With the cursor in the bullet itself, Enter splits the line as usual
  if (!match || cursor < lineStart + match[0].length) return null;

  const [prefix, indent, bullet, number, delimiter, space, task] = match;
  if (line.slice(prefix.length).trim() === '') {
    return { start: lineStart, end: lineStart + line.length, text: '' };
  }
  const marker = bullet ?? `${Number(number) + 1}${delimiter}`;
  return {
    start: cursor,
    end: cursor,
    text: `\n${indent}${marker}${space}${task ? '[ ] ' : ''}`,
  };
}

// A task item from its bullet or number to the box: "- [ ]", "1. [x]"
const TASK_ITEM = /^(?:[-*+]|\d{1,9}[.)])[ \t]+\[([ xX])\]/;

/**
 * Checks or unchecks the task item whose bullet starts at offset (the source position Markdown parsing
 * gives a list item). Returns the memo unchanged when no task box is there.
 */
export function toggleTask(value: string, offset: number): string {
  const match = TASK_ITEM.exec(value.slice(offset));
  if (!match) return value;
  // The box's mark sits just before its closing bracket
  const mark = offset + match[0].length - 2;
  return `${value.slice(0, mark)}${match[1] === ' ' ? 'x' : ' '}${value.slice(mark + 1)}`;
}

/**
 * Handles Enter in a memo field so lists continue. Applies the edit through the browser's own text input,
 * so it reaches React's onChange and Ctrl/Cmd+Z undoes it, and falls back to setRangeText where that is missing.
 */
export function handleListEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
  if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
  const textarea = event.currentTarget;
  if (textarea.selectionStart !== textarea.selectionEnd) return;
  const edit = continueList(textarea.value, textarea.selectionStart);
  if (!edit) return;

  event.preventDefault();
  textarea.setSelectionRange(edit.start, edit.end);
  const applied =
    typeof document.execCommand === 'function' &&
    document.execCommand(edit.text ? 'insertText' : 'delete', false, edit.text);
  if (applied) return;
  textarea.setRangeText(edit.text, edit.start, edit.end, 'end');
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}
