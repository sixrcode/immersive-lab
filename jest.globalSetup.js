// jest.globalSetup.js

module.exports = async () => {
  if (!process.env.SKIP_GLOBAL_FETCH_SETUP) {
    // For Node 18+, fetch and its related classes are global.
// This setup attempts to ensure they are correctly assigned to the global object
// that Jest tests will see, in case Jest's environment sandboxing causes issues.

if (typeof fetch === 'function') { // Check if Node's fetch is available in this script's scope
  if (typeof global.fetch === 'undefined') {
    global.fetch = fetch;
  }
  if (typeof global.Request === 'undefined') {
    global.Request = Request;
  }
  if (typeof global.Response === 'undefined') {
    global.Response = Response;
  }
  if (typeof global.Headers === 'undefined') {
    global.Headers = Headers;
  }
} else {
  // Fallback if fetch is not in the direct global scope of this script (e.g. older Node or unusual setup)
  // This was the previous approach that caused stream errors with node-fetch@2
    // console.warn("Native fetch not found in globalSetup scope, attempting require('node-fetch'). This might lead to stream issues.");
    // const nodeFetch = require('node-fetch');
    // if (typeof global.fetch === 'undefined') global.fetch = nodeFetch;
    // if (typeof global.Request === 'undefined') global.Request = nodeFetch.Request;
    // if (typeof global.Response === 'undefined') global.Response = nodeFetch.Response;
    // if (typeof global.Headers === 'undefined') global.Headers = nodeFetch.Headers;
  }


  // The Response.json static method polyfill.
  // Native Response in Node.js v18.17.0+ includes a static Response.json().
  // This polyfill is for environments where it might be missing.
  if (global.Response && typeof global.Response.json !== 'function' && !process.env.SKIP_GLOBAL_FETCH_SETUP) {
    // console.log('Polyfilling global.Response.json');
    global.Response.json = function (body, init) {
      const bodyString = JSON.stringify(body);
      // Ensure headers are properly initialized from init
      const responseHeadersInit = (init && init.headers) ? new global.Headers(init.headers) : new global.Headers();
      if (!responseHeadersInit.has('content-type')) {
        responseHeadersInit.set('content-type', 'application/json');
      }
      // Merge existing init with new headers and status
      const responseInit = {
        ...(init || {}), // Spread init to include status, statusText etc.
        headers: responseHeadersInit,
      };
      return new global.Response(bodyString, responseInit);
    };
  }


// TextEncoder/Decoder should be global in Node 11+.
// Ensure they are on the global object for Jest tests.
if (typeof TextEncoder === 'function') {
  if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = TextEncoder;
  }
  if (typeof global.TextDecoder === 'undefined') {
    global.TextDecoder = TextDecoder;
  }
} else {
  // Fallback for older Node versions or unusual setups
  // console.warn("Native TextEncoder/TextDecoder not found in globalSetup scope, attempting require('util').");
  const util = require('util');
  if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = util.TextEncoder;
  }
  if (typeof global.TextDecoder === 'undefined') {
    global.TextDecoder = util.TextDecoder;
  }
};
