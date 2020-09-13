'use strict';

/*
 * Created with @iobroker/create-adapter v1.20.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
// const fs = require("fs");
const axios = require('axios').default;

class Habitron extends utils.Adapter {

    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'habitron',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('objectChange', this.onObjectChange.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    getStateRole(state_type){ // Helper, maybe move to a separate helpers.js file
        var role;
        switch (state_type){
            case "number" : 
                role = "level";
                break;
            case "boolean" :
                role = "switch";
                break;
            default :
                role = "state";
                break;
        }

        return role;
    }
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    /**
     * Currently, this gets a data.json file from a local HTTP server and converts it 
     * into ioBroker's data structure. Also sets the state values according to the json file.
     * 
     * However, this will be redundant when we switch to an MQTT broker/client architecture, based on the
     * existing API's for HomeBridge and HomeAssistant. 
     */
    async onReady() {
        // Initialize your adapter here
        const url = "http://0.0.0.0:8080/data.json";
        var $this = this; 
        var data;
        
        axios.get(url).then(function(response){
            data = response.data; 
            if (data){
                for (const module of data.modules) {
                    // create a Device object for every module
                    $this.log.info("Module name: " + module.name);
                    $this.setObjectAsync(module.name, {
                        type: 'device',
                        common:{
                            name: module.name,
                        },
                        native: (({name, type, address, modulstatus}) => ({name, type, address, modulstatus}))(module)
                    });

                    // create objects for each data class 
                    for (const channel of Object.keys(module.data)){
                        // first make a Channel
                        $this.setObjectAsync(module.name + '.' + channel, {
                            type: 'channel',
                            common: {
                                name : channel,
                            },
                            native: {}
                        });    
                        // if data entry is an object, it is a Channel
                        if(typeof(module.data[channel]) == "object"){  
                            // add a State object for every entry in the Channel
                            for (const state of Object.keys(module.data[channel])){ 
                                var type = typeof(module.data[channel][state]);
                                var role = $this.getStateRole(type);

                                // add the State
                                $this.setObjectAsync(module.name + '.' + channel + '.' + state, {
                                    type: 'state',
                                    common: {
                                        name : state,
                                        role : role,
                                        type : type
                                    },
                                    native: {}
                                });
 
                                // set the State
                                $this.setStateAsync(module.name + '.' + channel + '.' + state, {
                                    val : module.data[channel][state],  
                                    ack : true,
                                    ts  : Date.now()
                                });
                            }

                        
                        } else { // otherwise, directly add a State object
                            /* Note: it might seem redundant to have a device.channel.channel object
                                     but it helps in the admin page display code. 
                            */ 
                            var type = typeof(module.data[channel]);
                            var role = $this.getStateRole(type);
                            
                            // add the State
                            $this.setObjectAsync(module.name + '.' + channel + '.' + channel, {
                                type: 'state',
                                common: {
                                    name : channel,
                                    role : role,
                                    type : type
                                },
                                native: {}
                            }); 
                        
                            // set the State
                            $this.setStateAsync(module.name + '.' + channel + '.' + channel, {
                                val : module.data[channel],  
                                ack : true,
                                ts  : Date.now()
                            });
                        } 
                    }
                }
            } else {
                $this.log.error("JSON object is empty!");
            }
        }).catch(function (error){
            $this.log.error("HTTP GET to url: " + url + " failed, "+ error);
        });
        
        // subscribe to every state and object change
        this.subscribeObjects('*');
        this.subscribeStates('*');

    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            this.log.info('cleaned everything up...');
            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed object changes
     * @param {string} id
     * @param {ioBroker.Object | null | undefined} obj
     */
    onObjectChange(id, obj) {
        if (obj) {
            // The object was changed
            this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
        } else {
            // The object was deleted
            this.log.info(`object ${id} deleted`);
        }
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        
        if (state) {
            // const url = "http://0.0.0.0:8080/ioBroker_message_"+ state.ts.toString()+".txt";
            const url = "http://0.0.0.0:8080/ioBroker_message.txt";
            var $this = this; 
            var data;
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
            if (state.ack == false) { // state change is a command       
                data =  state.ts.toString() + ':' + id + '=' + state.val;  
                axios({method: 'post', 
                       url : url, 
                       data : data,
                       headers:{'content-type': 'text/plain'}})
                .then(function(response){
                    $this.log.info("Command sent with response: " + JSON.stringify(response));
                }).catch(function (error){
                    $this.log.error("HTTP POST to url: " + url + " failed, "+ error);
                });
            }

            
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }

    /**
     * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
     * Using this method requires "common.message" property to be set to true in io-package.json
     * @param {ioBroker.Message} obj
     */
    onMessage(obj) {
    	if (typeof obj === 'object' && obj.message) {
    		if (obj.command === 'send') {
    			// e.g. send email or pushover or whatever
    			this.log.info('send command');

    			// Send response in callback if required
    			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
    		}
    	}
    }

}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new Habitron(options);
} else {
    // otherwise start the instance directly
    new Habitron();
}