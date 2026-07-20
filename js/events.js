(() => {
'use strict';
const TD = window.TD;

TD.bus = {
  _h: {},
  on(ev, fn) {
    (this._h[ev] ||= []).push(fn);
    return () => { this._h[ev] = (this._h[ev] || []).filter(f => f !== fn); };
  },
  emit(ev, data) {
    for (const fn of this._h[ev] || []) fn(data);
  }
};
})();