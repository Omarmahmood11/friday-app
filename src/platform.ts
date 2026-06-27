// True only in the actual packaged Electron app (loads via file://)
// NOT true in browser preview servers (http://localhost) even if they have Electron in UA
export const isElectron =
  navigator.userAgent.includes('Electron') &&
  window.location.protocol === 'file:';
