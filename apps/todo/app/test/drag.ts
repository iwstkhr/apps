/** happy-dom には DataTransfer が無いので、ドラッグ & ドロップのテスト用に最小限を用意する。 */
export function createDataTransfer(): DataTransfer {
  const data = new Map<string, string>();
  return {
    dropEffect: 'none',
    effectAllowed: 'all',
    get types() {
      return [...data.keys()];
    },
    setData: (type: string, value: string) => data.set(type, value),
    getData: (type: string) => data.get(type) ?? '',
    clearData: () => data.clear(),
  } as unknown as DataTransfer;
}
