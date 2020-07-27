function show_device(deviceId, device){

    // console.log(JSON.stringify(device));
    var deviceHtml = ''; // create an empty HTML string

    deviceHtml += '<tr class="device" data-channel="' + deviceId + '">';
    
    // config button
    deviceHtml += '<td style="text-align: left"><a class="waves-effect waves-light btn-floating build" build-id="' 
                + deviceId
                + '"><i class="material-icons">build</i></a></td>';

    // add device properties to the html, kind of arbitrary stuff at this point
    deviceHtml += '<td style="text-align: center; width: 150px">' + device.common.name + '</td>';
    deviceHtml += '<td style="text-align: center; width: 100px">' + device.native.address + '</td>';
    deviceHtml += '<td style="text-align: center; width: 100px">' + device.native.type + '</td>';
    
    // status icon
    if (parseInt(device.native.modulstatus, 2) == 0)
        deviceHtml += '<td style="text-align: center; width: 100px"><a class="waves-light check_circle">' 
                    + '<i class="material-icons">check_circle</i></a></td>';
    else 
        deviceHtml += '<td style="text-align: center; width: 100px"><a class="waves-light remove_circle">' 
                    + '<i class="material-icons">remove_circle</i></a></td>';

    $('#grid-devices').append(deviceHtml);
    
    $('#grid-devices').find('a[build-id="'+deviceId+'"]').off('click').on('click', function () {
        $('#config-device-name').val(device.common.name); // TEMP 
        var $menu = $('#device-config-menu');
        // open config menu
        $menu.modal().modal('open');
        // cancel menu
        $menu.find('#cancel_device').off('click').on('click', function () {
            $menu.modal().modal('close');
        });
        
        // SETOBJECT NOT WORKING
        $menu.find('#save_device').off('click').on('click', function () {
            var newName = $('#config-device-name').val();
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
   
    socket.emit('getObjectView', 'habitron', 'getDevices', 
                {startkey: 'habitron.'+instance, endkey: 'habitron.'+instance+'\u9999', include_docs: true},
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
