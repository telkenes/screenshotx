const { Notification } = require('electron');

const notif_clip = () => new Notification({ title: 'Screenshot Taken', body: 'Screenshot has been copied to your clipboard' }).show();
const notif_upload = () => new Notification({ title: 'Screenshot Uploaded', body: 'Screenshot link has been copied to your clipboard' }).show();
const notif_saved = () => new Notification({ title: 'Screenshot Uploaded', body: 'Screenshot has been saved to file' }).show();
const customError = (t) => new Notification({ title: 'Error', body: t }).show();

module.exports = { notif_clip, notif_upload, notif_saved, customError };
