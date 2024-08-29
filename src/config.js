module.exports = {
  importTagName: 'timport',
  exportTagName: 'texport',
  preprocessing: function (data) {
    return (
      data
        .replace(/CIQ\.ChartEngine\.AdvancedInjectable/gm, 'CIQ.ChartEngine')
		.replace(/@tsmember/gm, '@memberof')
		.replace(/@tsmodule/gm, '@module')
        .replace(/@tsinterface/gm, '@typedef') // Process @tsinterface the same as @typedef but avoids inclusion in generated JS documentation
      );
  },
  postprocessing: function(data, source) {
    const exported = [];
    source.replace(/__js_\w*_\w*_ as (\w*)/gm, (match, exportName) => {
      exported.push(`export function ${exportName}(_export: object): void`)
    });

    data +=  `\n${exported.join('\n')}`;
    return data
  },
  includePrivate: false,
  expandPropertyDeclarationBasedOnDefault: true
};
