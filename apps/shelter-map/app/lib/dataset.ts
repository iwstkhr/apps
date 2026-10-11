import { DATASET_UPDATED_AT } from '~/generated/dataset-meta';

export const DATASET_SOURCE_URL = 'https://www.gsi.go.jp/bousaichiri/hinanbasho.html';

// Shown in the map's attribution control next to the tile credits, so it stays visible with the
// map on every layout. The span keeps it on one line, so the attribution wraps before it.
export const DATASET_ATTRIBUTION = `<span class="dataset-attribution">避難場所: <a href="${DATASET_SOURCE_URL}" target="_blank" rel="noreferrer">国土地理院</a> (${DATASET_UPDATED_AT} 時点)</span>`;
