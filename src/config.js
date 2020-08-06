module.exports = {
  importTagName: 'timport',
  exportTagName: 'texport',
  preprocessing: function (data) {
    return data.replace(/CIQ\.ChartEngine\.AdvancedInjectable/gm, 'CIQ.ChartEngine');
  },
  postprocessing: function(data) {
    return data.replace(/__js_\w*_\w*_ as (\w*)/, (match, exportName) => {
      return `export function ${exportName}(_export): void\n`
    });
  }
};
