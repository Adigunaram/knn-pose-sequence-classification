const mqtt = require('mqtt')

/** Main */
const client  = mqtt.connect('mqtt://127.0.0.1:1883')

client.subscribe("predict");

client.on('connect', function () {
    client.subscribe('presence', function (err) {
      if (!err) client.publish('presence', 'Hello mqtt')
    })
})
  
client.on('message', function (topic, message) {
    console.log(`message received: ${topic}::${message.toString()}`)
})
