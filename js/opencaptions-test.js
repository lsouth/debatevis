// Create the Server
var OpenedCaptions = require('opened-captions');
var oc = new OpenedCaptions();

// Add a Stream
oc.addStream('random');

// Add a Better Stream
// oc.addStream('server', {
//   host: 'https://openedcaptions.com',
//   port: 443,
//   description: "CSPAN"
// });
