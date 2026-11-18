/* Loads core + all activity data + shared UI, in a fixed order, from any page. */
(function () {
  var files = ["js/merge.js", "js/core.js", "data/south.js", "data/north.js", "js/geo.js", "js/ui.js", "js/plan.js", "js/sync.js"];
  files.forEach(function (f) { document.write('<script src="' + f + '"><\/script>'); });
})();
