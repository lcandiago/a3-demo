module.exports = {
  extend: '@apostrophecms/widget-type',
  options: {
    label: 'Attachers'
  },
  fields: {
    add: {
      attachment: {
        type: 'attachment',
        label: 'Attachment',
        options: {
          fieldGroup: 'office'
        }
      }
    }
  }
};
