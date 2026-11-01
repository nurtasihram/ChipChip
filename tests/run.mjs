import {results as quantity} from './quantity.test.mjs';
import {results as selection} from './selection.test.mjs';
import {results as layers} from './layers.test.mjs';
import {results as ring} from './ring.test.mjs';
import {results as bubbles} from './bubbles.test.mjs';
import {results as viewport} from './viewport.test.mjs';
import {results as ui} from './ui.test.mjs';
import {results as apps} from './app.test.mjs';
export const results=[...quantity,...selection,...layers,...viewport,...ui,...apps,...bubbles,...ring];
