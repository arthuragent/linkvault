export const BOOKMARKLET_SOURCE = (origin: string) =>
  `javascript:(function(){var u=encodeURIComponent(location.href);var t=encodeURIComponent(document.title);window.open('${origin}/?url='+u+'&title='+t,'_blank');})();`;
