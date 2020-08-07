module.exports = {
  importTagName: 'timport',
  exportTagName: 'texport',
  preprocessing: function (data) {
    return data.replace(/CIQ\.ChartEngine\.AdvancedInjectable/gm, 'CIQ.ChartEngine');
  },
  postprocessing: function(data, source) {
    const exported = [];
    source.replace(/__js_\w*_\w*_ as (\w*)/gm, (match, exportName) => {
      exported.push(`export function ${exportName}(_export): void`)
    });

    data +=  `\n${exported.join('\n')}`;
    return data
  }
};
