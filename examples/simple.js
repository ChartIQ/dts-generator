/**
 * A simple class with a method and a property
 * @name Simple
 */
class Simple {
    constructor() {
        /**
         * Sample property on our class. Prop 'foo' is true!
         * @type {boolean}
         * @memberof Simple#
         */
        this.foo = true
        
        /**
         * Sample method that can be called by our class. 
         * Completely contrived but shows arrow function and default argument
         * @param {*} required A necessary first argument
         * @param {string} [param.optional = string]
         * @memberof Simple#
         */
        this.check = (required, optional='nice to have') => {
            if(!required) throw new Error('required param is required!')
            console.log(optional)
        }
    }
}