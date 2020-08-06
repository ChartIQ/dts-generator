const { cleanCommentData, getDefinition, getParamParts } = require('../common/common')

module.exports = {
    createExportsTSDefs
};

function createExportsTSDefs(data) {
    const result = [];
    console.log(data)
    for (const exported of data) {
        const comment = exported.comment;
        const value = exported.value;
        let def = getDefinition(comment);
        let parts = getParamParts(value);
        let definitionStr = `export ${parts.type} ${parts.name}`

        if(parts.type === 'function') {
            definitionStr +=`(): void`
        }

        let tsdef = {
            code: definitionStr
        };
        result.push(tsdef)
    }
    return result
}