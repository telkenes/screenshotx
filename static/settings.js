const electron = require('electron')
const {ipcRenderer} = electron

document.getElementById('update-btn').onclick = function() {

let config = {
  c_fs: document.getElementById('c_fs').value,
  c_s: document.getElementById('c_s').value,
  c_w: document.getElementById('c_w').value,
  save: document.getElementById('save-to').value,
  custom_settings: {
    url: document.querySelector('#custom_url').value,
    key: document.querySelector('#custom_key').value,
    auth: document.querySelector('#custom_auth').value,
    rurl: document.querySelector('#custom_rurl').value
    }
}

ipcRenderer.send('settings:update', config);
document.getElementById('updated').innerHTML = '<div class="alert alert-success alert-dismissible"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>Updated\</div>'
}

document.getElementById('save-to').onchange = function() {
  let val = document.getElementById('save-to').value
  if (val === 'custom') {
    document.getElementById('custom_settings').style.visibility = "visible"
    document.getElementById('custom_settings').style.display = "block"
    document.getElementById('open-con').style.display = "block"
    document.getElementById('open-con').style.visibility = "visible"
  } else {
    document.getElementById('custom_settings').style.visibility = "visible"
    document.getElementById('custom_settings').style.display = "none"
  }
}

ipcRenderer.on('settings:start', function(e, item) {
  document.getElementById('container').style.visibility = "visible"
  document.getElementById('c_fs').value = item.c_fs
  document.getElementById('c_s').value = item.c_s
  document.getElementById('c_w').value = item.c_w
  var theValue = $('#save-to').val();
  $('option[value=' + item.save + ']')
  .attr('selected',true);

  if (document.getElementById('save-to').value === 'custom') {
    document.getElementById('custom_settings').style.visibility = "visible"
    document.getElementById('custom_settings').style.display = "block"

    document.getElementById('custom_url').value = item.custom_settings.url
    document.getElementById('custom_key').value = item.custom_settings.key
    document.getElementById('custom_auth').value = item.custom_settings.auth
    document.getElementById('custom_rurl').value = item.custom_settings.rurl
  }
})
