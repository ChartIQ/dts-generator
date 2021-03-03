
/**
 * Holds parsed references that do not contain complete or valid paths when attempting to create modules, namespaces, classes, etc...
 * @type Map
 */
class Exceptions { 
    constructor() {
        this.exceptions = new Map;
    }
    
    check(definitions) {
        const { exceptions } = this
        for (const type of exceptions) {
            console.log(type)
        }
    }
    
    push(type, entry) {
        const { exceptions } = this
        if(!exceptions.has(type)) exceptions.set(type, [])
        const key = exceptions.get(type)
        key.push(entry)
    }
}
const ExceptionHandler = new Exceptions()

module.exports = { 
    ExceptionHandler,
}