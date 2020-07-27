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

    /**
     * Is called when databases are connected and adapter received configuration.
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
                    $this.setObjectAsync(module.name, {
                        type: 'device',
                        common:{
                            // TODO What if there is already a user-defined name? 
                            name: module.name + '_' + module.type, // default naming
                        },
                        native: (({name, type, address, modulstatus}) => ({name, type, address, modulstatus}))(module)
                    });

                    // create objects for each data class 
                    for (const channel of Object.keys(module.data)){
                        // if data entry is an object, it is a Channel
                        if(typeof(module.data[channel]) == "object"){  
                            // first make a Channel
                            $this.setObjectAsync(module.name + '.' + channel, {
                                type: 'channel',
                                common: {
                                    name : channel,
                                },
                                native: {}
                            });    
                            // then add a State object for every entry in the Channel
                            for (const state of Object.keys(module.data[channel])){ 
                                var role;
                                switch (typeof(module.data[channel][state])){
                                    case "number" : 
                                        role = "level";
                                        break;
                                    case "boolean" :
                                        role = "indicator";
                                        break;
                                    default :
                                        role = "state";
                                        break;
                                }

                                $this.setObjectAsync(module.name + '.' + channel + '.' + state, {
                                    type: 'state',
                                    common: {
                                        name : state,
                                        role : role,
                                    },
                                    native: {}
                                });     
                            }
                        } else { // otherwise, directly add a State object
                            var role;
                            switch (typeof(module.data[channel])){
                                case "number" : 
                                    role = "level";
                                    break;
                                case "boolean" :
                                    role = "indicator";
                                    break;
                                default :
                                    role = "state";
                                    break;
                            }

                            $this.setObjectAsync(module.name + '.' + channel, {
                                type: 'state',
                                common: {
                                    name : channel,
                                    role : role,
                                },
                                native: {}
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
            // this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
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
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);

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