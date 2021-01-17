const electron = require('electron');
const { ipcRenderer } = electron;

function wait(a) { return new Promise(r => setTimeout(() => r(), a)); }

async function updateSettings(bool) {
  let custom_headers = document.querySelector('#custom_headers').value;
  if (document.getElementById('save-to').value === 'custom') {
    try {
      custom_headers = JSON.parse(document.querySelector('#custom_headers').value);
    } catch (err) {
      return document.getElementById('updated').innerHTML = '<div class="alert alert-danger alert-dismissible"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>Headers input is not an object.\</div>';
    }
  }

  let config = {
    c_fs: document.getElementById('c_fs').value,
    c_s: document.getElementById('c_s').value,
    c_w: document.getElementById('c_w').value,
    o_se: document.getElementById('o_se').value,
    save: document.getElementById('save-to').value,
    custom_settings: {
      url: document.querySelector('#custom_url').value,
      headers: custom_headers,
      rurl: document.querySelector('#custom_rurl').value,
    },
    pyrocdn: {
      key: document.querySelector('#pyrocdn_auth').value,
      url: document.querySelector('#pyrocdn_url').value
    }
  };

  ipcRenderer.send('settings:update', config);
  if (bool !== true) {
    document.getElementById('updated').innerHTML = '<div class="alert alert-success alert-dismissible"><a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>Updated\</div>';
    await wait(2600);
    document.getElementById('updated').innerHTML = '';
  }
};

document.getElementById('update-btn').onclick = updateSettings;

document.getElementById('save-to').onchange = () => {
  let val = document.getElementById('save-to').value;
  if (val === 'custom') {
    document.getElementById('custom_settings').style.visibility = "visible";
    document.getElementById('custom_settings').style.display = "block";
    document.getElementById('pyrocdn_settings').style.visibility = "hidden";
    document.getElementById('pyrocdn_settings').style.display = "none";
  } else if (val === 'PyroCDN') {
    document.getElementById('pyrocdn_settings').style.visibility = "visible";
    document.getElementById('pyrocdn_settings').style.display = "block";
    document.getElementById('custom_settings').style.visibility = "hidden";
    document.getElementById('custom_settings').style.display = "none";
  } else {
    document.getElementById('pyrocdn_settings').style.visibility = "hidden";
    document.getElementById('pyrocdn_settings').style.display = "none";
    document.getElementById('custom_settings').style.visibility = "hidden";
    document.getElementById('custom_settings').style.display = "none";
  }
  updateSettings(true);
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
  let val = document.getElementById('save-to').value;
  if (val === 'custom') {
    document.getElementById('custom_settings').style.visibility = "visible";
    document.getElementById('custom_settings').style.display = "block";
    document.getElementById('pyrocdn_settings').style.visibility = "hidden";
    document.getElementById('pyrocdn_settings').style.display = "none";
  } else if (val === 'PyroCDN') {
    document.getElementById('pyrocdn_settings').style.visibility = "visible";
    document.getElementById('pyrocdn_settings').style.display = "block";
    document.getElementById('custom_settings').style.visibility = "hidden";
    document.getElementById('custom_settings').style.display = "none";
  } else {
    document.getElementById('pyrocdn_settings').style.visibility = "hidden";
    document.getElementById('pyrocdn_settings').style.display = "none";
  }
  const cs = item.custom_settings || {};
  const pyro = item.pyrocdn || {};
  document.getElementById('custom_url').value = cs.url || '';
  document.getElementById('custom_headers').value = JSON.stringify(cs.headers || {}).toString();
  document.getElementById('custom_rurl').value = cs.rurl || '';
  document.getElementById('pyrocdn_auth').value = pyro.key || '';
  document.getElementById('pyrocdn_url').value = pyro.url || '';
});
