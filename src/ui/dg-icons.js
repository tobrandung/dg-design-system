/* DG-Illustrations-Icons (exportiert von deutsche-glasfaser.de, siehe src/assets/dg-icons/manifest.json) */
const files = import.meta.glob('../assets/dg-icons/*.svg', { eager: true, query: '?url', import: 'default' });
/** URL eines DG-Icons per ID, z. B. dgIcon('privatkunde') */
export const dgIcon = (id) => files[`../assets/dg-icons/${id}.svg`] || null;
