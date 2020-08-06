import { Simple } from '../simple';


export function creator () {
    return new Simple
};
/**
 * @module Generator
 * @timport { Simple } from '../simple'
 * @exports {function} generator 
 */
export { creator as generator };    

