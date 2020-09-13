$(document).ready(function(){
    $('.collapsible').collapsible();
});

function show_device(deviceId, device){

    var deviceHTML = ''; // create an empty HTML string

    deviceHTML += '<tr class="device" data-channel="' + deviceId + '">';
    
    // config button
    deviceHTML += '<td style="text-align: left"><a class="waves-effect waves-light btn-floating build" build-id="' 
                + deviceId
                + '"><i class="material-icons">build</i></a></td>';

    // add device properties to the html, kind of arbitrary stuff at this point
    deviceHTML += '<td style="text-align: center; width: 150px">' + device.common.name + '</td>';
    deviceHTML += '<td style="text-align: center; width: 100px">' + device.native.address + '</td>';
    deviceHTML += '<td style="text-align: center; width: 100px">' + device.native.type + '</td>';
    
    // status icon
    if (parseInt(device.native.modulstatus, 2) == 0)
        deviceHTML += '<td style="text-align: center; width: 100px"><a class="waves-light check_circle">' 
                    + '<i class="material-icons">check_circle</i></a></td>';
    else 
        deviceHTML += '<td style="text-align: center; width: 100px"><a class="waves-light remove_circle">' 
                    + '<i class="material-icons">remove_circle</i></a></td>';

    $('#grid-devices').append(deviceHTML);
    
    $('#grid-devices').find('a[build-id="'+deviceId+'"]').off('click').on('click', function () {
        $('#config-device-name').val(device.common.name);
        var $menu = $('#device-config-menu');
        // open config menu
        $menu.modal().modal('open');

        show_device_channels(deviceId);

        // cancel menu
        $menu.find('#cancel_device').off('click').on('click', function () {
            $menu.modal().modal('close');
        });
        
        // TODO : Seems to work but doesn't save ?
        $menu.find('#save_device').off('click').on('click', function () {
            var newName = $('#config-device-name').val();
            console.log("User changed the device name to: " + newName);
            socket.emit('setObject', deviceId, {
                    type: 'device',
                    common: {
                        name: newName,
                    },
                    native: device,
            });
        });
    });
}

// NOTE : Will be made redundant when VIS is set up!
function get_channel_states(channel, callback){
    socket.emit('getObjectView', 'habitron', 'getStates', 
        {startkey: channel, endkey: channel + '\u9999', include_docs: true},
        function (errState, resState) {
            var statesHTML = '';
            if (errState || resState.rows.length == 0) { 
                console.log('Can\'t show states, error occured: ' + (errState ? errState:'No states found'));
            }
            else {
                for (const state of resState.rows){
                    statesHTML += '<li class="collection-item">';
                    statesHTML += state.id.split('.').pop();
                    statesHTML += '</li>';
                }
            }
            
            callback(statesHTML);
        }); 

}

// NOTE : Will be made redundant when VIS is set up!
function show_device_channels(device){
    
    $("#config-device-channels").empty();
    socket.emit('getObjectView', 'habitron', 'getChannels', 
        {startkey: device, endkey: device + '\u9999', include_docs: true},
            function (err, res) {
                if (err || res.rows.length == 0) { 
                    console.log('Can\'t show channels, error occured: ' + (err ? err:'No channels found'));
                }
                
                else {
                    for (const row of res.rows){

                        var channelHTML = '<li>';
                        // add icon + name
                        channelHTML += '<div class="collapsible-header"><i class="material-icons">lightbulb_outline</i>'+ row.id.split('.').pop()+'</div>';
                        channelHTML += '<div class="collapsible-body"><ul class="collection">States';
                        
                        get_channel_states(row.id, function(statesHTML){
                            channelHTML += statesHTML;
                            channelHTML += '</ul></div></li>';
                        });
                        $("#config-device-channels").append(channelHTML);
                    }
                }
            }
        );
}



// This will be called by the admin adapter when the settings page loads
function load(settings, onChange) {
    // example: select elements with id=key and class=value and insert value
    if (!settings) return;
    $('.value').each(function () {
        var $key = $(this);
        var id = $key.attr('id');
        if ($key.attr('type') === 'checkbox') {
            // do not call onChange direct, because onChange could expect some arguments
            $key.prop('checked', settings[id])
                .on('change', () => onChange())
                ;
        } else {
            // do not call onChange direct, because onChange could expect some arguments
            $key.val(settings[id])
                .on('change', () => onChange())
                .on('keyup', () => onChange())
                ;
        }
    });
    onChange(false);
   
    // Get all the device objects in the db and show them in the Manage Devices tab. 
    socket.emit('getObjectView', 'habitron', 'getDevices', 
                {startkey: 'habitron.' + instance, endkey: 'habitron.' + instance + '\u9999', include_docs: true},
                    function (err, res) {
                        if (err || res.rows.length == 0) { 
                            console.log('Can\'t show devices, error occured: ' + (err ? err:'No devices found'));
                        }

                        else {
                            for (const row of res.rows){
                                console.log('Found device: ' + row.id);
                                show_device(row.id, row.value);
                            }
                        }
                    }
                );

    // reinitialize all the Materialize labels on the page if you are dynamically adding inputs:
    if (M) M.updateTextFields();
}

// This will be called by the admin adapter when the user presses the save button
function save(callback) {
    // example: select elements with class=value and build settings object
    var obj = {};
    $('.value').each(function () {
        var $this = $(this);
        if ($this.attr('type') === 'checkbox') {
            obj[$this.attr('id')] = $this.prop('checked');
        } else {
            obj[$this.attr('id')] = $this.val();
        }
    });
    callback(obj);
}
