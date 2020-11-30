module.exports = {
  fields: {
    add: {
      _footerLinks: {
        label: 'Footer Links',
        type: 'relationship',
        withType: '@apostrophecms/page'
      },
      arrayLinks: {
        type: 'array',
        label: 'Array Links',
        fields: {
          add: {
            _arrayFooterLinks: {
              label: 'Array Footer Links',
              type: 'relationship',
              withType: '@apostrophecms/page'
            }
          }
        }
      }
    },
    group: {
      footer: {
        label: 'Footer',
        fields: [ '_footerLinks' ]
      }
    }
  }
};
