/** Hide dummy card billing UI in production / Play Store MVP builds. */
export const hideDummyBilling =
  import.meta.env.VITE_PLAY_MVP === 'true' || !import.meta.env.DEV
