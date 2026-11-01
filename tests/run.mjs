import {results as ring} from './ring.test.mjs';
import {results as bubbles} from './bubbles.test.mjs';
import {results as viewport} from './viewport.test.mjs';
import {results as ui} from './ui.test.mjs';
import {results as apps} from './app.test.mjs';
export const results=[...viewport,...ui,...apps,...bubbles,...ring];
