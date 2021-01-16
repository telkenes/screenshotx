const electron = require('electron');
const { ipcRenderer } = electron;

function wait(a) { return new Promise(r => setTimeout(() => r(), a)); }

async function updateSettings() {
  let config = {
    c_fs: document.getElementById('c_fs').value,
    c_s: document.getElementById('c_s').value,
    c_w: document.getElementById('c_w').value,
    o_se: document.getElementById('o_se').value,
    save: document.getElementById('save-to').value,
    custom_settings: {
      url: document.querySelector('#custom_url').value,
      key: document.querySelector('#custom_key').value,
      auth: document.querySelector('#custom_auth').value,
      rurl: document.querySelector('#custom_rurl').value,
    }
  };

  ipcRenderer.send('settings:update', config);
  document.getElementById('updated').innerHTML = '<div class="alert alert-success alert-dismissible"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>Updated\</div>';
  await wait(2400);
  document.getElementById('updated').innerHTML = '';
};

document.getElementById('update-btn').onclick = updateSettings;

document.getElementById('save-to').onchange = () => {
  let val = document.getElementById('save-to').value;
  if (val === 'custom') {
    document.getElementById('custom_settings').style.visibility = "visible";
    document.getElementById('custom_settings').style.display = "block";
  } else {
    document.getElementById('custom_settings').style.visibility = "hidden";
    document.getElementById('custom_settings').style.display = "none";
  }
};

ipcRenderer.on('log', (e, ...args) => console.log(...args));

ipcRenderer.on('settings:start', (e, item) => {
  document.getElementById('container').style.visibility = "visible";
  document.getElementById('c_fs').value = item.c_fs;
  document.getElementById('c_s').value = item.c_s;
  document.getElementById('c_w').value = item.c_w;
  document.getElementById('o_se').value = item.o_se;
  var theValue = $('#save-to').val();
  $('option[value=' + item.save + ']')
    .attr('selected', true);
  if (document.getElementById('save-to').value === 'custom') {
    document.getElementById('custom_settings').style.visibility = "visible";
    document.getElementById('custom_settings').style.display = "block";
  }
  const cs = item.custom_settings || {};
  document.getElementById('custom_url').value = cs.url || '';
  document.getElementById('custom_key').value = cs.key || '';
  document.getElementById('custom_auth').value = cs.auth || '';
  document.getElementById('custom_rurl').value = cs.rurl || '';
});
